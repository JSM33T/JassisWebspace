using JassSpace.Api.Configuration;
using JassSpace.Api.Services;
using JassSpace.Contracts;
using JassSpace.Contracts.Responses;
using JassSpace.Data;
using JassSpace.Entities;
using JassSpace.Infra;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;

namespace JassSpace.Api.Controllers;

[Route("bootleg")]
public sealed class BootlegController(
    JassSpaceDbContext dbContext,
    IAzureBlobStorageService blobStorageService,
    IBootlegTokenService tokenService,
    IOptions<BootlegStreamingSettings> settings,
    ILogger<BootlegController> logger)
    : BaseApiController
{
    private readonly BootlegStreamingSettings _settings = settings.Value;

    [HttpPost("upload")]
    [Authorize(Roles = "admin,mod")]
    [ProducesResponseType(typeof(ApiResponse<BootlegUploadResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> UploadAudio(
        [FromForm] IFormFile? file,
        [FromForm] string? folder,
        CancellationToken cancellationToken = default)
    {
        if (file is null || file.Length == 0)
        {
            return BadRequestProblem("No file uploaded", "Provide a non-empty audio file.");
        }

        var isAudio = file.ContentType.StartsWith("audio/", StringComparison.OrdinalIgnoreCase);
        if (!isAudio)
        {
            return BadRequestProblem("Invalid file type", "Only audio files are accepted.");
        }

        var normalizedFolder = NormalizeFolder(folder);

        var extension = Path.GetExtension(file.FileName);
        if (string.IsNullOrWhiteSpace(extension))
        {
            extension = ".bin";
        }

        var blobName = $"bootleg/audio/{normalizedFolder}/{Guid.NewGuid():N}{extension.ToLowerInvariant()}";

        try
        {
            await using var stream = file.OpenReadStream();
            var upload = await blobStorageService.UploadImageAsync(
                stream,
                file.FileName,
                file.ContentType,
                blobName,
                cancellationToken);

            Guid? uploadedBy = null;
            if (Guid.TryParse(UserId, out var userGuid))
            {
                uploadedBy = userGuid;
            }

            var asset = new BootlegAsset
            {
                Id = Guid.NewGuid(),
                Folder = normalizedFolder,
                BlobName = upload.BlobName,
                OriginalFileName = file.FileName,
                ContentType = file.ContentType,
                SizeBytes = file.Length,
                UploadedByUserId = uploadedBy,
                CreatedAt = DateTimeOffset.UtcNow
            };
            dbContext.BootlegAssets.Add(asset);
            await dbContext.SaveChangesAsync(cancellationToken);

            var ttl = TimeSpan.FromMinutes(Math.Max(1, _settings.TokenTtlMinutes));
            var token = tokenService.CreateToken(upload.BlobName, ttl);
            var expiresAt = DateTimeOffset.UtcNow.Add(ttl);
            var streamUrl = $"{Request.Scheme}://{Request.Host}/bootleg/stream/{upload.BlobName}?token={Uri.EscapeDataString(token)}";

            return OkEnvelope(new BootlegUploadResponse(
                asset.Id,
                asset.Folder,
                asset.OriginalFileName,
                upload.BlobName,
                asset.SizeBytes,
                streamUrl,
                token,
                expiresAt));
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Bootleg audio upload failed");
            return Problem(
                StatusCodes.Status500InternalServerError,
                "Audio upload failed",
                "An unexpected error occurred while uploading the audio.");
        }
    }

    [HttpGet("assets")]
    [Authorize(Roles = "admin,mod")]
    [ProducesResponseType(typeof(ApiResponse<IReadOnlyCollection<BootlegAssetResponse>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAssets(
        [FromQuery] string? folder,
        [FromQuery] string? search,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken cancellationToken = default)
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 100);

        var query = dbContext.BootlegAssets.AsNoTracking().AsQueryable();

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
            .ToListAsync(cancellationToken);

        var ttl = TimeSpan.FromMinutes(Math.Max(1, _settings.TokenTtlMinutes));
        var expiresAt = DateTimeOffset.UtcNow.Add(ttl);
        var items = assets.Select(a =>
        {
            var token = tokenService.CreateToken(a.BlobName, ttl);
            var streamUrl = $"{Request.Scheme}://{Request.Host}/bootleg/stream/{a.BlobName}?token={Uri.EscapeDataString(token)}";
            return new BootlegAssetResponse(
                a.Id,
                a.Folder,
                a.OriginalFileName,
                a.BlobName,
                a.ContentType,
                a.SizeBytes,
                a.CreatedAt,
                streamUrl,
                expiresAt);
        }).ToList();

        return PagedOk(items, page, pageSize, total);
    }

    [HttpGet("assets/folders")]
    [Authorize(Roles = "admin,mod")]
    [ProducesResponseType(typeof(ApiResponse<IReadOnlyCollection<string>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetFolders(CancellationToken cancellationToken = default)
    {
        var folders = await dbContext.BootlegAssets
            .AsNoTracking()
            .Select(a => a.Folder)
            .Distinct()
            .OrderBy(f => f)
            .ToListAsync(cancellationToken);

        return OkEnvelope(folders);
    }

    [HttpPost("assets/{id:guid}/link")]
    [Authorize(Roles = "admin,mod")]
    [ProducesResponseType(typeof(ApiResponse<BootlegLinkResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GenerateLink(Guid id, CancellationToken cancellationToken = default)
    {
        var asset = await dbContext.BootlegAssets
            .AsNoTracking()
            .FirstOrDefaultAsync(a => a.Id == id, cancellationToken);

        if (asset is null)
        {
            return NotFoundProblem("Asset not found", $"No asset found with ID '{id}'.");
        }

        var ttl = TimeSpan.FromMinutes(Math.Max(1, _settings.TokenTtlMinutes));
        var token = tokenService.CreateToken(asset.BlobName, ttl);
        var expiresAt = DateTimeOffset.UtcNow.Add(ttl);
        var streamUrl = $"{Request.Scheme}://{Request.Host}/bootleg/stream/{asset.BlobName}?token={Uri.EscapeDataString(token)}";
        return OkEnvelope(new BootlegLinkResponse(streamUrl, token, expiresAt));
    }

    [HttpDelete("assets/{id:guid}")]
    [Authorize(Roles = "admin,mod")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DeleteAsset(Guid id, CancellationToken cancellationToken = default)
    {
        var asset = await dbContext.BootlegAssets
            .FirstOrDefaultAsync(a => a.Id == id, cancellationToken);

        if (asset is null)
        {
            return NotFoundProblem("Asset not found", $"No asset found with ID '{id}'.");
        }

        await blobStorageService.DeleteBlobAsync(asset.BlobName, cancellationToken);
        dbContext.BootlegAssets.Remove(asset);
        await dbContext.SaveChangesAsync(cancellationToken);
        return NoContent();
    }

    [HttpGet("stream/{*blobName}")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(FileStreamResult), StatusCodes.Status206PartialContent)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Stream(string blobName, [FromQuery] string? token, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(blobName))
        {
            return BadRequestProblem("Invalid stream identifier", "Blob name is required.");
        }

        if (!blobName.StartsWith("bootleg/audio/", StringComparison.OrdinalIgnoreCase))
        {
            return UnauthorizedProblem("Unauthorized stream scope", "Invalid stream scope.");
        }

        if (!tokenService.TryValidateToken(token ?? string.Empty, blobName, out var reason))
        {
            return UnauthorizedProblem("Invalid stream token", reason ?? "Token validation failed.");
        }

        if (!Request.Headers.ContainsKey("Range"))
        {
            Response.Headers.Append("Accept-Ranges", "bytes");
            return BadRequestProblem(
                "Range header required",
                "This stream only supports chunked playback requests.");
        }

        var cachedFile = await blobStorageService.GetImageAsync(blobName, cancellationToken);
        if (cachedFile is null)
        {
            return NotFoundProblem("Audio not found", $"No audio found for blob '{blobName}'.");
        }

        try
        {
            var stream = new FileStream(
                cachedFile.FilePath,
                FileMode.Open,
                FileAccess.Read,
                FileShare.Read,
                4096,
                FileOptions.Asynchronous | FileOptions.SequentialScan);

            Response.Headers["Cache-Control"] = "no-store";
            Response.Headers["Accept-Ranges"] = "bytes";
            return File(stream, NormalizeAudioContentType(cachedFile.ContentType, cachedFile.FilePath), enableRangeProcessing: true);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to stream audio blob {BlobName}", blobName);
            return Problem(
                StatusCodes.Status500InternalServerError,
                "Streaming failed",
                "An unexpected error occurred while streaming the audio.");
        }
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
