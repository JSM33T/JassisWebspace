using JassSpace.Api.Configuration;
using JassSpace.Contracts;
using JassSpace.Contracts.Interfaces;
using JassSpace.Contracts.Responses;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;

namespace JassSpace.Api.Controllers;

[Route("music")]
public sealed class MusicController(
    IMusicService musicService,
    IOptions<BootlegStreamingSettings> settings,
    ILogger<MusicController> logger)
    : BaseApiController
{
    private readonly BootlegStreamingSettings _settings = settings.Value;

    [HttpGet("tracks")]
    [ProducesResponseType(typeof(ApiResponse<IReadOnlyCollection<TrackListItemResponse>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetTracks(
        [FromQuery] string? search,
        [FromQuery] string? category,
        [FromQuery] bool? featured,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var result = await musicService.GetTracksAsync(
                search,
                category,
                featured,
                page,
                pageSize,
                cancellationToken);

            return result.Status switch
            {
                MusicTracksQueryStatus.Success => PagedOk(result.Tracks, result.Page, result.PageSize, result.Total),
                MusicTracksQueryStatus.InvalidCategory => BadRequestProblem("Invalid category", result.ErrorMessage),
                _ => Problem(
                    StatusCodes.Status500InternalServerError,
                    "Failed to retrieve tracks",
                    "An unexpected error occurred while retrieving tracks.")
            };
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to retrieve music tracks");
            return Problem(
                StatusCodes.Status500InternalServerError,
                "Failed to retrieve tracks",
                "An unexpected error occurred while retrieving tracks.");
        }
    }

    [HttpGet("tracks/{slug}")]
    [ProducesResponseType(typeof(ApiResponse<TrackDetailResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetTrackBySlug(string slug, CancellationToken cancellationToken = default)
    {
        try
        {
            Guid? currentUserId = Guid.TryParse(UserId, out var userGuid) ? userGuid : null;
            var track = await musicService.GetTrackBySlugAsync(slug, currentUserId, cancellationToken);

            if (track is null)
            {
                return NotFoundProblem("Track not found", $"No published track found with slug '{slug}'.");
            }

            return OkEnvelope(track);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to retrieve track with slug {Slug}", slug);
            return Problem(
                StatusCodes.Status500InternalServerError,
                "Failed to retrieve track",
                "An unexpected error occurred while retrieving the track.");
        }
    }

    [HttpPost("tracks/{id:guid}/play-link")]
    [ProducesResponseType(typeof(ApiResponse<TrackPlayLinkResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> CreatePlayLink(Guid id, CancellationToken cancellationToken = default)
    {
        try
        {
            var baseUrl = $"{Request.Scheme}://{Request.Host}";
            var result = await musicService.CreatePlayLinkAsync(
                id,
                baseUrl,
                _settings.TokenTtlMinutes,
                cancellationToken);

            return result.Status switch
            {
                MusicPlayLinkStatus.Success => OkEnvelope(result.Response!),
                MusicPlayLinkStatus.TrackNotFound => NotFoundProblem("Track not found", result.ErrorMessage),
                MusicPlayLinkStatus.PlayableSourceUnavailable => NotFoundProblem("Playable source unavailable", result.ErrorMessage),
                MusicPlayLinkStatus.UnauthorizedStreamScope => UnauthorizedProblem("Unauthorized stream scope", result.ErrorMessage),
                _ => Problem(
                    StatusCodes.Status500InternalServerError,
                    "Failed to generate play link",
                    "An unexpected error occurred while generating the track play link.")
            };
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to generate play link for track {TrackId}", id);
            return Problem(
                StatusCodes.Status500InternalServerError,
                "Failed to generate play link",
                "An unexpected error occurred while generating the track play link.");
        }
    }

}
