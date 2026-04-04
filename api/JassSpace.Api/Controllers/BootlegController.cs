using JassSpace.Api.Configuration;
using JassSpace.Api.Services;
using JassSpace.Contracts;
using JassSpace.Contracts.Interfaces;
using JassSpace.Contracts.Responses;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;

namespace JassSpace.Api.Controllers;

[Route("bootleg")]
public sealed class BootlegController(
    IBootlegService bootlegService,
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

        try
        {
            Guid? uploadedBy = null;
            if (Guid.TryParse(UserId, out var userGuid))
            {
                uploadedBy = userGuid;
            }

            await using var stream = file.OpenReadStream();
            var upload = await bootlegService.UploadAudioAsync(
                stream,
                file.FileName,
                file.ContentType,
                file.Length,
                folder,
                uploadedBy,
                cancellationToken);

            var ttl = TimeSpan.FromMinutes(Math.Max(1, _settings.TokenTtlMinutes));
            var token = tokenService.CreateToken(upload.BlobName, ttl);
            var expiresAt = DateTimeOffset.UtcNow.Add(ttl);
            var streamUrl = $"{Request.Scheme}://{Request.Host}/bootleg/stream/{upload.BlobName}?token={Uri.EscapeDataString(token)}";

            return OkEnvelope(new BootlegUploadResponse(
                upload.AssetId,
                upload.Folder,
                upload.FileName,
                upload.BlobName,
                upload.SizeBytes,
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
        var result = await bootlegService.GetAssetsAsync(folder, search, page, pageSize, cancellationToken);

        var ttl = TimeSpan.FromMinutes(Math.Max(1, _settings.TokenTtlMinutes));
        var expiresAt = DateTimeOffset.UtcNow.Add(ttl);
        var items = result.Items.Select(a =>
        {
            var token = tokenService.CreateToken(a.BlobName, ttl);
            var streamUrl = $"{Request.Scheme}://{Request.Host}/bootleg/stream/{a.BlobName}?token={Uri.EscapeDataString(token)}";
            return new BootlegAssetResponse(
                a.Id,
                a.Folder,
                a.FileName,
                a.BlobName,
                a.ContentType,
                a.SizeBytes,
                a.CreatedAt,
                streamUrl,
                expiresAt);
        }).ToList();

        return PagedOk(items, result.Page, result.PageSize, result.Total);
    }

    [HttpGet("assets/folders")]
    [Authorize(Roles = "admin,mod")]
    [ProducesResponseType(typeof(ApiResponse<IReadOnlyCollection<string>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetFolders(CancellationToken cancellationToken = default)
    {
        var folders = await bootlegService.GetFoldersAsync(cancellationToken);
        return OkEnvelope(folders);
    }

    [HttpPost("assets/{id:guid}/link")]
    [Authorize(Roles = "admin,mod")]
    [ProducesResponseType(typeof(ApiResponse<BootlegLinkResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GenerateLink(Guid id, CancellationToken cancellationToken = default)
    {
        var result = await bootlegService.GenerateLinkAsync(id, cancellationToken);
        if (result.Status == BootlegLinkStatus.AssetNotFound)
        {
            return NotFoundProblem("Asset not found", result.ErrorMessage);
        }

        var ttl = TimeSpan.FromMinutes(Math.Max(1, _settings.TokenTtlMinutes));
        var token = tokenService.CreateToken(result.BlobName!, ttl);
        var expiresAt = DateTimeOffset.UtcNow.Add(ttl);
        var streamUrl = $"{Request.Scheme}://{Request.Host}/bootleg/stream/{result.BlobName}?token={Uri.EscapeDataString(token)}";
        return OkEnvelope(new BootlegLinkResponse(streamUrl, token, expiresAt));
    }

    [HttpDelete("assets/{id:guid}")]
    [Authorize(Roles = "admin,mod")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DeleteAsset(Guid id, CancellationToken cancellationToken = default)
    {
        var result = await bootlegService.DeleteAssetAsync(id, cancellationToken);
        if (result.Status == BootlegDeleteStatus.AssetNotFound)
        {
            return NotFoundProblem("Asset not found", result.ErrorMessage);
        }

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

        var streamResult = await bootlegService.GetStreamFileAsync(blobName, cancellationToken);
        if (streamResult.Status == BootlegStreamStatus.AudioNotFound)
        {
            return NotFoundProblem("Audio not found", streamResult.ErrorMessage);
        }

        try
        {
            var stream = new FileStream(
                streamResult.FilePath!,
                FileMode.Open,
                FileAccess.Read,
                FileShare.Read,
                4096,
                FileOptions.Asynchronous | FileOptions.SequentialScan);

            Response.Headers["Cache-Control"] = "no-store";
            Response.Headers["Accept-Ranges"] = "bytes";
            return File(stream, streamResult.ContentType!, enableRangeProcessing: true);
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

}
