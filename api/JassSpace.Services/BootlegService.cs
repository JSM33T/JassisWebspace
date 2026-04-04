using JassSpace.Contracts.Interfaces;
using JassSpace.Data;
using JassSpace.Entities;
using JassSpace.Infra;
using Microsoft.EntityFrameworkCore;

namespace JassSpace.Services;

public sealed class BootlegService(
    JassSpaceDbContext dbContext,
    IAzureBlobStorageService blobStorageService) : IBootlegService
{
    private readonly JassSpaceDbContext _dbContext = dbContext;
    private readonly IAzureBlobStorageService _blobStorageService = blobStorageService;

    public async Task<BootlegUploadInfo> UploadAudioAsync(
        Stream fileStream,
        string fileName,
        string contentType,
        long sizeBytes,
        string? folder,
        Guid? uploadedByUserId,
        CancellationToken cancellationToken = default)
    {
        var normalizedFolder = NormalizeFolder(folder);
        var extension = Path.GetExtension(fileName);
        if (string.IsNullOrWhiteSpace(extension))
        {
            extension = ".bin";
        }

        var blobName = $"bootleg/audio/{normalizedFolder}/{Guid.NewGuid():N}{extension.ToLowerInvariant()}";
        var upload = await _blobStorageService.UploadImageAsync(
            fileStream,
            fileName,
            contentType,
            blobName,
            cancellationToken);

        var asset = new BootlegAsset
        {
            Id = Guid.NewGuid(),
            Folder = normalizedFolder,
            BlobName = upload.BlobName,
            OriginalFileName = fileName,
            ContentType = contentType,
            SizeBytes = sizeBytes,
            UploadedByUserId = uploadedByUserId,
            CreatedAt = DateTimeOffset.UtcNow
        };

        _dbContext.BootlegAssets.Add(asset);
        await _dbContext.SaveChangesAsync(cancellationToken);

        return new BootlegUploadInfo(
            asset.Id,
            asset.Folder,
            asset.OriginalFileName,
            asset.BlobName,
            asset.SizeBytes);
    }

    public async Task<BootlegAssetPageResult> GetAssetsAsync(
        string? folder,
        string? search,
        int page = 1,
        int pageSize = 20,
        CancellationToken cancellationToken = default)
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 100);

        var query = _dbContext.BootlegAssets
            .AsNoTracking()
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(folder) && !string.Equals(folder, "all", StringComparison.OrdinalIgnoreCase))
        {
            query = query.Where(a => a.Folder == folder);
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim().ToLowerInvariant();
            query = query.Where(a =>
                a.OriginalFileName.ToLower().Contains(term) ||
                a.BlobName.ToLower().Contains(term) ||
                a.Folder.ToLower().Contains(term));
        }

        var total = await query.CountAsync(cancellationToken);
        var assets = await query
            .OrderByDescending(a => a.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(a => new BootlegAssetListItem(
                a.Id,
                a.Folder,
                a.OriginalFileName,
                a.BlobName,
                a.ContentType,
                a.SizeBytes,
                a.CreatedAt))
            .ToListAsync(cancellationToken);

        return new BootlegAssetPageResult(assets, page, pageSize, total);
    }

    public async Task<IReadOnlyCollection<string>> GetFoldersAsync(CancellationToken cancellationToken = default)
    {
        return await _dbContext.BootlegAssets
            .AsNoTracking()
            .Select(a => a.Folder)
            .Distinct()
            .OrderBy(f => f)
            .ToListAsync(cancellationToken);
    }

    public async Task<BootlegLinkResult> GenerateLinkAsync(
        Guid assetId,
        CancellationToken cancellationToken = default)
    {
        var blobName = await _dbContext.BootlegAssets
            .AsNoTracking()
            .Where(a => a.Id == assetId)
            .Select(a => a.BlobName)
            .FirstOrDefaultAsync(cancellationToken);

        return string.IsNullOrWhiteSpace(blobName)
            ? new BootlegLinkResult(
                BootlegLinkStatus.AssetNotFound,
                null,
                $"No asset found with ID '{assetId}'.")
            : new BootlegLinkResult(BootlegLinkStatus.Success, blobName);
    }

    public async Task<BootlegDeleteResult> DeleteAssetAsync(
        Guid assetId,
        CancellationToken cancellationToken = default)
    {
        var asset = await _dbContext.BootlegAssets
            .FirstOrDefaultAsync(a => a.Id == assetId, cancellationToken);

        if (asset is null)
        {
            return new BootlegDeleteResult(
                BootlegDeleteStatus.AssetNotFound,
                $"No asset found with ID '{assetId}'.");
        }

        await _blobStorageService.DeleteBlobAsync(asset.BlobName, cancellationToken);
        _dbContext.BootlegAssets.Remove(asset);
        await _dbContext.SaveChangesAsync(cancellationToken);

        return new BootlegDeleteResult(BootlegDeleteStatus.Success);
    }

    public async Task<BootlegStreamFileResult> GetStreamFileAsync(
        string blobName,
        CancellationToken cancellationToken = default)
    {
        var cachedFile = await _blobStorageService.GetImageAsync(blobName, cancellationToken);
        if (cachedFile is null)
        {
            return new BootlegStreamFileResult(
                BootlegStreamStatus.AudioNotFound,
                null,
                null,
                $"No audio found for blob '{blobName}'.");
        }

        return new BootlegStreamFileResult(
            BootlegStreamStatus.Success,
            cachedFile.FilePath,
            NormalizeAudioContentType(cachedFile.ContentType, cachedFile.FilePath));
    }

    private static string NormalizeAudioContentType(string? contentType, string filePath)
    {
        if (!string.IsNullOrWhiteSpace(contentType) &&
            contentType.StartsWith("audio/", StringComparison.OrdinalIgnoreCase))
        {
            return contentType;
        }

        return Path.GetExtension(filePath).ToLowerInvariant() switch
        {
            ".mp3" => "audio/mpeg",
            ".m4a" => "audio/mp4",
            ".aac" => "audio/aac",
            ".wav" => "audio/wav",
            ".ogg" => "audio/ogg",
            ".webm" => "audio/webm",
            ".flac" => "audio/flac",
            _ => "application/octet-stream"
        };
    }

    private static string NormalizeFolder(string? folder)
    {
        var input = string.IsNullOrWhiteSpace(folder) ? "default" : folder.Trim().ToLowerInvariant();
        var normalized = input.Replace('\\', '/');
        while (normalized.StartsWith('/'))
        {
            normalized = normalized[1..];
        }

        var segments = normalized
            .Split('/', StringSplitOptions.RemoveEmptyEntries)
            .Select(s =>
            {
                var cleaned = new string(s.Where(c => char.IsLetterOrDigit(c) || c == '-' || c == '_').ToArray());
                return string.IsNullOrWhiteSpace(cleaned) ? null : cleaned;
            })
            .Where(s => s is not null)
            .Select(s => s!)
            .ToList();

        return segments.Count == 0 ? "default" : string.Join('/', segments);
    }
}
