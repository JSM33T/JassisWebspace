using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.IO;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using Azure;
using Azure.Storage.Blobs;
using Azure.Storage.Blobs.Models;
using JassSpace.Infra.Configuration;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace JassSpace.Infra
{
    public class AzureBlobStorageService : IAzureBlobStorageService
    {
        private readonly BlobContainerClient _containerClient;
        private readonly AzureBlobStorageSettings _settings;
        private readonly ILogger<AzureBlobStorageService> _logger;
        private readonly IImageProcessingService _imageProcessingService;
        private readonly string _cacheDirectory;
        private static readonly ConcurrentDictionary<string, SemaphoreSlim> _thumbLocks = new();

        public AzureBlobStorageService(
            IOptions<AzureBlobStorageSettings> settings,
            IImageProcessingService imageProcessingService,
            ILogger<AzureBlobStorageService> logger)
        {
            _settings = settings?.Value ?? throw new ArgumentNullException(nameof(settings));
            _imageProcessingService = imageProcessingService ?? throw new ArgumentNullException(nameof(imageProcessingService));
            _logger = logger ?? throw new ArgumentNullException(nameof(logger));

            if (string.IsNullOrWhiteSpace(_settings.ConnectionString))
            {
                throw new InvalidOperationException("Azure Blob Storage connection string is not configured.");
            }

            if (string.IsNullOrWhiteSpace(_settings.ContainerName))
            {
                throw new InvalidOperationException("Azure Blob Storage container name is not configured.");
            }

            _cacheDirectory = ResolveCacheDirectory(_settings.CacheDirectory);
            
            if (_settings.UseLocalCache)
            {
                EnsureCacheDirectoryExists(_cacheDirectory);
            }

            var blobServiceClient = new BlobServiceClient(_settings.ConnectionString);
            _containerClient = blobServiceClient.GetBlobContainerClient(_settings.ContainerName);
            
            // Ensure container exists
            _containerClient.CreateIfNotExists(PublicAccessType.None);
        }

        public async Task<BlobUploadResult> UploadImageAsync(
            Stream fileStream,
            string fileName,
            string contentType,
            string? blobName = null,
            CancellationToken cancellationToken = default)
        {
            if (fileStream is null)
            {
                throw new ArgumentNullException(nameof(fileStream));
            }

            if (!fileStream.CanRead)
            {
                throw new InvalidOperationException("Provided stream cannot be read.");
            }

            // Generate blob name if not provided
            var effectiveBlobName = string.IsNullOrWhiteSpace(blobName)
                ? $"{Guid.NewGuid():N}{GetExtensionFromContentType(contentType)}"
                : NormalizeBlobNameForStorage(blobName);

            // Read stream into memory for both upload and cache
            byte[] fileBytes;
            await using (var buffer = new MemoryStream())
            {
                await fileStream.CopyToAsync(buffer, cancellationToken);
                fileBytes = buffer.ToArray();
            }

            // Upload to Azure Blob Storage
            await using var uploadStream = new MemoryStream(fileBytes, writable: false);
            
            var blobClient = _containerClient.GetBlobClient(effectiveBlobName);
            
            var blobHttpHeaders = new BlobHttpHeaders
            {
                ContentType = string.IsNullOrWhiteSpace(contentType) ? "application/octet-stream" : contentType
            };

            try
            {
                await blobClient.UploadAsync(
                    uploadStream,
                    new BlobUploadOptions
                    {
                        HttpHeaders = blobHttpHeaders,
                        Conditions = null // Allow overwrite
                    },
                    cancellationToken);

                _logger.LogInformation("Image {BlobName} uploaded to Azure Blob Storage", effectiveBlobName);
            }
            catch (RequestFailedException ex)
            {
                _logger.LogError(ex, "Azure Blob Storage upload failed for file {FileName}", fileName);
                throw new InvalidOperationException($"Azure Blob Storage upload failed: {ex.Message}", ex);
            }

            // Cache locally if enabled
            string localPath = string.Empty;
            if (_settings.UseLocalCache)
            {
                var extension = GetExtensionFromContentType(contentType);
                localPath = BuildLocalPath(effectiveBlobName, extension);

                ClearCachedFiles(effectiveBlobName);

                await using (var localFile = new FileStream(localPath, FileMode.Create, FileAccess.Write, FileShare.Read))
                {
                    await localFile.WriteAsync(fileBytes, cancellationToken);
                }

                _logger.LogInformation("Image {BlobName} cached at {LocalPath}", effectiveBlobName, localPath);

                // Always generate a thumb alongside the cached original (best-effort).
                await EnsureThumbnailCachedAsync(effectiveBlobName, localPath, cancellationToken);
            }

            var url = blobClient.Uri.ToString();
            return new BlobUploadResult(effectiveBlobName, url, localPath);
        }

        public async Task<CachedImageResult?> GetImageAsync(string blobName, CancellationToken cancellationToken = default)
        {
            if (string.IsNullOrWhiteSpace(blobName))
            {
                return null;
            }

            // Check local cache first if enabled
            if (_settings.UseLocalCache)
            {
                var existingPath = FindCachedOriginalFile(blobName);
                if (!string.IsNullOrWhiteSpace(existingPath))
                {
                    _logger.LogDebug("Returning cached image for {BlobName}", blobName);

                    // Best-effort: ensure thumb exists for this cached original.
                    await EnsureThumbnailCachedAsync(blobName, existingPath!, cancellationToken);

                    return new CachedImageResult(
                        existingPath!, 
                        GetContentTypeFromExtension(Path.GetExtension(existingPath)), 
                        Path.GetFileName(existingPath));
                }
            }

            // Download from Azure Blob Storage
            var blobClient = _containerClient.GetBlobClient(blobName);

            try
            {
                if (!await blobClient.ExistsAsync(cancellationToken))
                {
                    _logger.LogWarning("Blob {BlobName} not found in Azure Blob Storage", blobName);
                    return null;
                }

                var properties = await blobClient.GetPropertiesAsync(cancellationToken: cancellationToken);
                var contentType = properties.Value.ContentType ?? "application/octet-stream";

                if (_settings.UseLocalCache)
                {
                    // Download and cache
                    var extension = GetExtensionFromContentType(contentType);
                    var localPath = BuildLocalPath(blobName, extension);

                    await using (var localFile = new FileStream(localPath, FileMode.Create, FileAccess.Write, FileShare.Read))
                    {
                        await blobClient.DownloadToAsync(localFile, cancellationToken);
                    }

                    _logger.LogInformation("Cached blob {BlobName} to {LocalPath}", blobName, localPath);

                    // Best-effort: create thumb variant.
                    await EnsureThumbnailCachedAsync(blobName, localPath, cancellationToken);

                    return new CachedImageResult(localPath, contentType, Path.GetFileName(localPath));
                }
                else
                {
                    // Return blob URL for direct access (not recommended for private blobs)
                    _logger.LogWarning("Local cache disabled, returning blob URL directly");
                    return null;
                }
            }
            catch (RequestFailedException ex)
            {
                _logger.LogError(ex, "Failed to download blob {BlobName}", blobName);
                return null;
            }
        }

        public async Task<CachedImageResult?> GetThumbnailAsync(string blobName, CancellationToken cancellationToken = default)
        {
            if (string.IsNullOrWhiteSpace(blobName))
            {
                return null;
            }

            if (!_settings.UseLocalCache)
            {
                // This service only serves from local cache; without it we cannot provide a file path.
                return null;
            }

            var thumbPath = BuildThumbLocalPath(blobName);
            if (File.Exists(thumbPath))
            {
                return new CachedImageResult(thumbPath, "image/webp", Path.GetFileName(thumbPath));
            }

            // Ensure original exists (download if needed), then generate thumb.
            var original = await GetImageAsync(blobName, cancellationToken);
            if (original is null)
            {
                return null;
            }

            await EnsureThumbnailCachedAsync(blobName, original.FilePath, cancellationToken);

            if (File.Exists(thumbPath))
            {
                return new CachedImageResult(thumbPath, "image/webp", Path.GetFileName(thumbPath));
            }

            // Fall back to original if thumb generation failed.
            return original;
        }

        public Task<CachedImageResult?> GetImageByUrlAsync(string blobUrl, CancellationToken cancellationToken = default)
        {
            if (string.IsNullOrWhiteSpace(blobUrl))
            {
                return Task.FromResult<CachedImageResult?>(null);
            }

            if (!TryResolveBlobNameFromUrl(blobUrl, out var blobName))
            {
                _logger.LogWarning("Unable to resolve blob name from URL {BlobUrl}", blobUrl);
                return Task.FromResult<CachedImageResult?>(null);
            }

            return GetImageAsync(blobName, cancellationToken);
        }

        private void ClearCachedFiles(string blobName)
        {
            if (!_settings.UseLocalCache)
            {
                return;
            }

            var safeName = SanitizeBlobName(blobName);
            var searchPattern = $"{safeName}.*";

            try
            {
                var matches = Directory.GetFiles(_cacheDirectory, searchPattern, SearchOption.TopDirectoryOnly);

                foreach (var match in matches)
                {
                    try
                    {
                        File.Delete(match);
                    }
                    catch (Exception ex)
                    {
                        _logger.LogWarning(ex, "Failed to remove cached image {CachedPath} while refreshing {BlobName}", match, blobName);
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to enumerate cached files for {BlobName}", blobName);
            }
        }

        private string? FindCachedOriginalFile(string blobName)
        {
            if (!_settings.UseLocalCache)
            {
                return null;
            }

            var safeName = SanitizeBlobName(blobName);
            var searchPattern = $"{safeName}.*";
            
            try
            {
                var matches = Directory.GetFiles(_cacheDirectory, searchPattern, SearchOption.TopDirectoryOnly);

                // Never treat the generated thumb as the "original" cache hit.
                // Also ignore any temp artifacts.
                var thumbPrefix = $"{safeName}.thumb.";

                foreach (var match in matches)
                {
                    var fileName = Path.GetFileName(match);
                    if (fileName.StartsWith(thumbPrefix, StringComparison.OrdinalIgnoreCase))
                    {
                        continue;
                    }

                    if (fileName.EndsWith(".tmp", StringComparison.OrdinalIgnoreCase))
                    {
                        continue;
                    }

                    return match;
                }

                return null;
            }
            catch
            {
                return null;
            }
        }

        private string BuildLocalPath(string blobName, string extension)
        {
            var safeName = SanitizeBlobName(blobName);
            var normalizedExtension = NormalizeExtension(extension);
            return Path.Combine(_cacheDirectory, $"{safeName}.{normalizedExtension}");
        }

        private string BuildThumbLocalPath(string blobName)
        {
            var safeName = SanitizeBlobName(blobName);
            return Path.Combine(_cacheDirectory, $"{safeName}.thumb.webp");
        }

        private async Task EnsureThumbnailCachedAsync(string blobName, string originalLocalPath, CancellationToken cancellationToken)
        {
            if (!_settings.UseLocalCache)
            {
                return;
            }

            var thumbPath = BuildThumbLocalPath(blobName);
            if (File.Exists(thumbPath))
            {
                return;
            }

            // Skip SVG (ImageSharp SVG support depends on additional packages; treat as non-thumbable).
            if (string.Equals(Path.GetExtension(originalLocalPath), ".svg", StringComparison.OrdinalIgnoreCase))
            {
                return;
            }

            var safeName = SanitizeBlobName(blobName);
            var gate = _thumbLocks.GetOrAdd(safeName, _ => new SemaphoreSlim(1, 1));
            await gate.WaitAsync(cancellationToken);

            try
            {
                if (File.Exists(thumbPath))
                {
                    return;
                }

                if (!File.Exists(originalLocalPath))
                {
                    return;
                }

                await using var source = new FileStream(
                    originalLocalPath,
                    FileMode.Open,
                    FileAccess.Read,
                    FileShare.Read,
                    4096,
                    FileOptions.Asynchronous | FileOptions.SequentialScan);

                await using var thumbStream = await _imageProcessingService.CreateThumbnailAsync(source, cancellationToken);

                var tmpPath = $"{thumbPath}.tmp";
                await using (var outFile = new FileStream(tmpPath, FileMode.Create, FileAccess.Write, FileShare.None))
                {
                    await thumbStream.CopyToAsync(outFile, cancellationToken);
                }

                // Atomic replace.
                File.Move(tmpPath, thumbPath, overwrite: true);
            }
            catch (Exception ex)
            {
                // Don't fail the primary request due to thumb issues.
                _logger.LogDebug(ex, "Failed to generate thumbnail for {BlobName}", blobName);
            }
            finally
            {
                gate.Release();
            }
        }

        private bool TryResolveBlobNameFromUrl(string blobUrl, out string blobName)
        {
            blobName = string.Empty;

            if (!Uri.TryCreate(blobUrl, UriKind.Absolute, out var uri))
            {
                _logger.LogWarning("Invalid blob URL format: {BlobUrl}", blobUrl);
                return false;
            }

            var pathSegments = uri.AbsolutePath.Split('/', StringSplitOptions.RemoveEmptyEntries);
            if (pathSegments.Length == 0)
            {
                _logger.LogWarning("Blob URL {BlobUrl} does not contain a path segment", blobUrl);
                return false;
            }

            var containerName = _settings.ContainerName?.Trim('/') ?? string.Empty;
            var blobStartIndex = 0;
            var containerFound = false;

            if (!string.IsNullOrWhiteSpace(containerName))
            {
                for (var i = 0; i < pathSegments.Length; i++)
                {
                    if (string.Equals(pathSegments[i], containerName, StringComparison.OrdinalIgnoreCase))
                    {
                        blobStartIndex = i + 1;
                        containerFound = true;
                        break;
                    }
                }
            }

            if (containerFound && blobStartIndex >= pathSegments.Length)
            {
                _logger.LogWarning(
                    "Blob URL {BlobUrl} matches container {ContainerName} but has no blob path",
                    blobUrl,
                    containerName);
                return false;
            }

            if (!containerFound && !string.IsNullOrWhiteSpace(containerName))
            {
                _logger.LogWarning(
                    "Blob URL {BlobUrl} does not contain configured container {ContainerName}",
                    blobUrl,
                    containerName);
                blobStartIndex = pathSegments.Length > 1 ? pathSegments.Length - 1 : 0;
            }

            var builder = new StringBuilder();
            for (var i = blobStartIndex; i < pathSegments.Length; i++)
            {
                if (builder.Length > 0)
                {
                    builder.Append('/');
                }

                builder.Append(Uri.UnescapeDataString(pathSegments[i]));
            }

            var candidate = builder.ToString();
            if (string.IsNullOrWhiteSpace(candidate))
            {
                _logger.LogWarning("Blob URL {BlobUrl} resolved to an empty blob name", blobUrl);
                return false;
            }

            blobName = candidate;
            return true;
        }

        private static string NormalizeBlobNameForStorage(string blobName)
        {
            var normalized = blobName.Trim().Replace('\\', '/');
            while (normalized.StartsWith('/'))
            {
                normalized = normalized[1..];
            }

            if (string.IsNullOrWhiteSpace(normalized))
            {
                throw new InvalidOperationException("Invalid blob name.");
            }

            return normalized;
        }

        private static string SanitizeBlobName(string blobName)
        {
            return blobName.Replace('\\', '_').Replace('/', '_').Replace(':', '_');
        }

        private static string NormalizeExtension(string extension)
        {
            if (string.IsNullOrWhiteSpace(extension))
            {
                return "jpg";
            }

            extension = extension.Trim();
            if (extension.StartsWith('.'))
            {
                extension = extension[1..];
            }

            return extension.ToLowerInvariant();
        }

        private static string GetExtensionFromContentType(string? contentType)
        {
            if (string.IsNullOrWhiteSpace(contentType))
            {
                return ".jpg";
            }

            var key = contentType.Trim().ToLowerInvariant();

            return key switch
            {
                "image/jpeg" => ".jpg",
                "image/png" => ".png",
                "image/gif" => ".gif",
                "image/webp" => ".webp",
                "image/bmp" => ".bmp",
                "image/tiff" => ".tiff",
                "image/svg+xml" => ".svg",
                "audio/mpeg" => ".mp3",
                "audio/mp4" => ".m4a",
                "audio/aac" => ".aac",
                "audio/wav" => ".wav",
                "audio/x-wav" => ".wav",
                "audio/ogg" => ".ogg",
                "audio/webm" => ".webm",
                "audio/flac" => ".flac",
                _ => ".jpg"
            };
        }

        private static string GetContentTypeFromExtension(string? extension)
        {
            var ext = NormalizeExtension(extension ?? string.Empty);
            return ext switch
            {
                "jpg" => "image/jpeg",
                "jpeg" => "image/jpeg",
                "png" => "image/png",
                "gif" => "image/gif",
                "webp" => "image/webp",
                "bmp" => "image/bmp",
                "tiff" => "image/tiff",
                "svg" => "image/svg+xml",
                "mp3" => "audio/mpeg",
                "m4a" => "audio/mp4",
                "aac" => "audio/aac",
                "wav" => "audio/wav",
                "ogg" => "audio/ogg",
                "webm" => "audio/webm",
                "flac" => "audio/flac",
                _ => "application/octet-stream"
            };
        }

        private static void EnsureCacheDirectoryExists(string cacheDirectory)
        {
            if (!Directory.Exists(cacheDirectory))
            {
                Directory.CreateDirectory(cacheDirectory);
            }
        }

        private static string ResolveCacheDirectory(string configuredPath)
        {
            if (string.IsNullOrWhiteSpace(configuredPath))
            {
                return Path.Combine(AppContext.BaseDirectory, "Cache");
            }

            if (Path.IsPathRooted(configuredPath))
            {
                return configuredPath;
            }

            return Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, configuredPath));
        }
        public async Task DeleteBlobAsync(string blobName, CancellationToken cancellationToken = default)
        {
            if (string.IsNullOrWhiteSpace(blobName))
            {
                return;
            }

            // 1. Delete from Azure Blob Storage
            var blobClient = _containerClient.GetBlobClient(blobName);
            try
            {
                await blobClient.DeleteIfExistsAsync(DeleteSnapshotsOption.IncludeSnapshots, cancellationToken: cancellationToken);
                _logger.LogInformation("Blob {BlobName} deleted from Azure Blob Storage", blobName);
            }
            catch (RequestFailedException ex)
            {
                _logger.LogError(ex, "Failed to delete blob {BlobName} from Azure", blobName);
                // Continue to try deleting local cache even if Azure fails (or maybe it was already gone)
            }

            // 2. Delete from Local Cache
            if (_settings.UseLocalCache)
            {
                ClearCachedFiles(blobName);
                _logger.LogInformation("Cached files for {BlobName} cleared", blobName);
            }
        }

        public Task DeleteBlobByUrlAsync(string blobUrl, CancellationToken cancellationToken = default)
        {
            if (string.IsNullOrWhiteSpace(blobUrl))
            {
                return Task.CompletedTask;
            }

            string blobName;
            
            // Handle local media proxy URLs (e.g., http://localhost/media/blob-name.jpg)
            if (blobUrl.Contains("/media/", StringComparison.OrdinalIgnoreCase))
            {
                var marker = "/media/";
                var index = blobUrl.IndexOf(marker, StringComparison.OrdinalIgnoreCase);
                blobName = blobUrl.Substring(index + marker.Length);
            }
            else if (!TryResolveBlobNameFromUrl(blobUrl, out blobName))
            {
                _logger.LogWarning("Unable to resolve blob name from URL {BlobUrl} for deletion", blobUrl);
                return Task.CompletedTask;
            }

            return DeleteBlobAsync(blobName, cancellationToken);
        }

        public async Task<List<string>> ListBlobsByPrefixAsync(string prefix, CancellationToken cancellationToken = default)
        {
            var results = new List<string>();
            
            // Azure Blob Storage listing
            try
            {
                await foreach (var blobItem in _containerClient.GetBlobsAsync(
                    traits: BlobTraits.None,
                    states: BlobStates.None,
                    prefix: prefix,
                    cancellationToken: cancellationToken))
                {
                    results.Add(blobItem.Name);
                }
            }
            catch (RequestFailedException ex)
            {
                _logger.LogError(ex, "Failed to list blobs with prefix {Prefix}", prefix);
                throw;
            }

            return results;
        }
    }
}
