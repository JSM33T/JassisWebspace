using JassSpace.Api.Configuration;
using JassSpace.Api.Services;
using JassSpace.Contracts;
using JassSpace.Contracts.Interfaces;
using JassSpace.Contracts.Requests;
using JassSpace.Contracts.Responses;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;

namespace JassSpace.Api.Controllers;

[Route("admin/music")]
[Authorize(Roles = "admin,mod")]
public sealed class AdminMusicController(
    IAdminMusicService adminMusicService,
    ILogger<AdminMusicController> logger,
    IOptions<BootlegStreamingSettings> streamingSettings,
    IHttpResponseCacheStore responseCacheStore)
    : BaseApiController
{
    private readonly BootlegStreamingSettings _streamingSettings = streamingSettings.Value;

    [HttpGet("authors")]
    [ProducesResponseType(typeof(ApiResponse<List<TrackAuthorResponse>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAuthors(
        [FromQuery] string? search = null,
        [FromQuery] int take = 100,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var authors = await adminMusicService.GetAuthorsAsync(search, take, cancellationToken);
            return OkEnvelope(authors);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to retrieve track authors");
            return Problem(
                StatusCodes.Status500InternalServerError,
                "Failed to retrieve authors",
                "An unexpected error occurred while retrieving track authors.");
        }
    }

    [HttpGet("tracks")]
    [ProducesResponseType(typeof(ApiResponse<IReadOnlyCollection<TrackListItemResponse>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetTracks(
        [FromQuery] string? search,
        [FromQuery] string? category,
        [FromQuery] string? artist,
        [FromQuery] string? genre,
        [FromQuery] DateTimeOffset? dateFrom,
        [FromQuery] DateTimeOffset? dateTo,
        [FromQuery] string? sortBy = "releaseDate",
        [FromQuery] string? sortDir = "desc",
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var result = await adminMusicService.GetTracksAsync(
                search,
                category,
                artist,
                genre,
                dateFrom,
                dateTo,
                sortBy,
                sortDir,
                page,
                pageSize,
                cancellationToken);

            return result.Status switch
            {
                AdminMusicTracksQueryStatus.Success => PagedOk(result.Tracks, result.Page, result.PageSize, result.Total),
                AdminMusicTracksQueryStatus.InvalidCategory => BadRequestProblem("Invalid category", result.ErrorMessage),
                _ => Problem(
                    StatusCodes.Status500InternalServerError,
                    "Failed to retrieve tracks",
                    "An unexpected error occurred while retrieving tracks.")
            };
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to retrieve admin music tracks");
            return Problem(
                StatusCodes.Status500InternalServerError,
                "Failed to retrieve tracks",
                "An unexpected error occurred while retrieving tracks.");
        }
    }

    [HttpGet("tracks/{id:guid}")]
    [ProducesResponseType(typeof(ApiResponse<TrackDetailResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetTrack(Guid id, CancellationToken cancellationToken = default)
    {
        try
        {
            var track = await adminMusicService.GetTrackAsync(id, cancellationToken);
            if (track is null)
            {
                return NotFoundProblem("Track not found", $"No track found with ID '{id}'.");
            }

            return OkEnvelope(track);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to retrieve track {TrackId}", id);
            return Problem(
                StatusCodes.Status500InternalServerError,
                "Failed to retrieve track",
                "An unexpected error occurred while retrieving the track.");
        }
    }

    [HttpPost("tracks/{id:guid}/cover")]
    [ProducesResponseType(typeof(ApiResponse<MediaUploadResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> UploadTrackCover(
        Guid id,
        [FromForm] IFormFile? file,
        CancellationToken cancellationToken = default)
    {
        if (file is null || file.Length == 0)
        {
            return BadRequestProblem("No file uploaded", "Provide a non-empty image file.");
        }

        if (!file.ContentType.StartsWith("image/", StringComparison.OrdinalIgnoreCase))
        {
            return BadRequestProblem("Invalid file type", "Only image files are accepted for track cover upload.");
        }

        try
        {
            await using var stream = file.OpenReadStream();
            var result = await adminMusicService.UploadTrackCoverAsync(
                id,
                stream,
                file.FileName,
                $"{Request.Scheme}://{Request.Host}",
                cancellationToken);

            if (result.TrackUpdated)
            {
                await responseCacheStore.InvalidateByBaseKeyAsync(RedisCacheKeys.MusicSeo, cancellationToken);
            }

            return OkEnvelope(result.Response);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to upload cover for track {TrackId}", id);
            return Problem(
                StatusCodes.Status500InternalServerError,
                "Failed to upload cover",
                "An unexpected error occurred while uploading the track cover.");
        }
    }

    [HttpPost("tracks/{id:guid}/audio")]
    [ProducesResponseType(typeof(ApiResponse<BootlegUploadResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> UploadTrackAudio(
        Guid id,
        [FromForm] IFormFile? file,
        CancellationToken cancellationToken = default)
    {
        if (file is null || file.Length == 0)
        {
            return BadRequestProblem("No file uploaded", "Provide a non-empty audio file.");
        }

        var normalizedContentType = NormalizeAudioContentType(file.ContentType, file.FileName);
        if (!normalizedContentType.StartsWith("audio/", StringComparison.OrdinalIgnoreCase))
        {
            return BadRequestProblem("Invalid file type", "Only audio files are accepted.");
        }

        var uploadedBy = Guid.TryParse(UserId, out var userGuid) ? userGuid : (Guid?)null;

        try
        {
            await using var stream = file.OpenReadStream();
            var result = await adminMusicService.UploadTrackAudioAsync(
                id,
                stream,
                file.FileName,
                normalizedContentType,
                file.Length,
                uploadedBy,
                $"{Request.Scheme}://{Request.Host}",
                _streamingSettings.TokenTtlMinutes,
                cancellationToken);

            if (result.TrackUpdated)
            {
                await responseCacheStore.InvalidateByBaseKeyAsync(RedisCacheKeys.MusicSeo, cancellationToken);
            }

            return OkEnvelope(result.Response);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to upload audio for track {TrackId}", id);
            return Problem(
                StatusCodes.Status500InternalServerError,
                "Failed to upload audio",
                "An unexpected error occurred while uploading track audio.");
        }
    }

    [HttpPost("tracks")]
    [ProducesResponseType(typeof(ApiResponse<TrackDetailResponse>), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> CreateTrack([FromBody] CreateTrackRequest request, CancellationToken cancellationToken = default)
    {
        try
        {
            var result = await adminMusicService.CreateTrackAsync(request, cancellationToken);
            if (result.Status != AdminMusicMutationStatus.Success)
            {
                return MapMutationProblem(result.Status, result.ErrorMessage);
            }

            await responseCacheStore.InvalidateByBaseKeyAsync(RedisCacheKeys.MusicSeo, cancellationToken);
            return Created(
                $"/admin/music/tracks/{result.Track!.Id}",
                new ApiResponse<TrackDetailResponse>(result.Track));
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to create track");
            return Problem(
                StatusCodes.Status500InternalServerError,
                "Failed to create track",
                "An unexpected error occurred while creating the track.");
        }
    }

    [HttpPut("tracks/{id:guid}")]
    [ProducesResponseType(typeof(ApiResponse<TrackDetailResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> UpdateTrack(Guid id, [FromBody] UpdateTrackRequest request, CancellationToken cancellationToken = default)
    {
        try
        {
            var result = await adminMusicService.UpdateTrackAsync(id, request, cancellationToken);
            if (result.Status != AdminMusicMutationStatus.Success)
            {
                return result.Status == AdminMusicMutationStatus.TrackNotFound
                    ? NotFoundProblem("Track not found", result.ErrorMessage)
                    : MapMutationProblem(result.Status, result.ErrorMessage);
            }

            await responseCacheStore.InvalidateByBaseKeyAsync(RedisCacheKeys.MusicSeo, cancellationToken);
            return OkEnvelope(result.Track!);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to update track {TrackId}", id);
            return Problem(
                StatusCodes.Status500InternalServerError,
                "Failed to update track",
                "An unexpected error occurred while updating the track.");
        }
    }

    [HttpDelete("tracks/{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DeleteTrack(Guid id, CancellationToken cancellationToken = default)
    {
        try
        {
            var result = await adminMusicService.DeleteTrackAsync(id, cancellationToken);
            if (result.Status == AdminMusicDeleteStatus.TrackNotFound)
            {
                return NotFoundProblem("Track not found", result.ErrorMessage);
            }

            await responseCacheStore.InvalidateByBaseKeyAsync(RedisCacheKeys.MusicSeo, cancellationToken);
            return NoContent();
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to delete track {TrackId}", id);
            return Problem(
                StatusCodes.Status500InternalServerError,
                "Failed to delete track",
                "An unexpected error occurred while deleting the track.");
        }
    }

    private IActionResult MapMutationProblem(AdminMusicMutationStatus status, string? errorMessage)
    {
        return status switch
        {
            AdminMusicMutationStatus.InvalidTitle => BadRequestProblem("Invalid title", errorMessage),
            AdminMusicMutationStatus.InvalidDescription => BadRequestProblem("Invalid description", errorMessage),
            AdminMusicMutationStatus.InvalidCategory => BadRequestProblem("Invalid category", errorMessage),
            AdminMusicMutationStatus.InvalidBootlegAsset => BadRequestProblem("Invalid bootleg asset", errorMessage),
            AdminMusicMutationStatus.BootlegAssetAlreadyAttached => BadRequestProblem("Bootleg asset already attached", errorMessage),
            AdminMusicMutationStatus.InvalidAuthors => BadRequestProblem("Invalid authors", errorMessage),
            AdminMusicMutationStatus.InvalidLinks => BadRequestProblem("Invalid links", errorMessage),
            _ => Problem(
                StatusCodes.Status500InternalServerError,
                "Track operation failed",
                "An unexpected error occurred while processing the track.")
        };
    }

    private static string NormalizeAudioContentType(string? contentType, string fileName)
    {
        if (!string.IsNullOrWhiteSpace(contentType) &&
            contentType.StartsWith("audio/", StringComparison.OrdinalIgnoreCase))
        {
            return contentType;
        }

        var extension = Path.GetExtension(fileName).ToLowerInvariant();
        return extension switch
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
}
