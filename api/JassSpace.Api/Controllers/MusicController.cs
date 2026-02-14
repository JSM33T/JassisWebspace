using JassSpace.Api.Configuration;
using JassSpace.Api.Services;
using JassSpace.Contracts;
using JassSpace.Contracts.Responses;
using JassSpace.Data;
using JassSpace.Entities;
using JassSpace.Entities.Enums;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace JassSpace.Api.Controllers;

[Route("music")]
public sealed class MusicController(
    JassSpaceDbContext dbContext,
    IBootlegTokenService tokenService,
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
            page = Math.Max(1, page);
            pageSize = Math.Clamp(pageSize, 1, 100);

            var query = dbContext.Tracks
                .AsNoTracking()
                .Include(t => t.Authors)
                    .ThenInclude(a => a.User)
                .Include(t => t.Links)
                .Where(t => t.IsPublished)
                .AsQueryable();

            if (!string.IsNullOrWhiteSpace(search))
            {
                var pattern = $"%{search.Trim()}%";
                query = query.Where(t =>
                    EF.Functions.ILike(t.Title, pattern) ||
                    EF.Functions.ILike(t.Description, pattern) ||
                    EF.Functions.ILike(t.Genre ?? string.Empty, pattern));
            }

            if (!string.IsNullOrWhiteSpace(category))
            {
                if (!TryNormalizeCategory(category, out var normalizedCategory))
                {
                    return BadRequestProblem("Invalid category", $"Category '{category}' is not supported.");
                }

                query = query.Where(t => t.Category == normalizedCategory);
            }

            if (featured.HasValue)
            {
                query = query.Where(t => t.Featured == featured.Value);
            }

            var total = await query.CountAsync(cancellationToken);

            var tracks = await query
                .OrderByDescending(t => t.ReleaseDate)
                .ThenByDescending(t => t.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync(cancellationToken);

            var trackIds = tracks.Select(t => t.Id).ToList();
            var contentByRefId = await dbContext.Contents
                .AsNoTracking()
                .Where(c => c.ContentType == ContentType.Music && trackIds.Contains(c.ContentRefId))
                .ToDictionaryAsync(c => c.ContentRefId, c => c.Id, cancellationToken);

            var response = tracks
                .Select(t => MapTrackListItem(t, contentByRefId.TryGetValue(t.Id, out var contentId) ? contentId : null))
                .ToList();

            return PagedOk(response, page, pageSize, total);
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
            var track = await dbContext.Tracks
                .AsNoTracking()
                .Include(t => t.Authors)
                    .ThenInclude(a => a.User)
                .Include(t => t.Links)
                .FirstOrDefaultAsync(t => t.Slug == slug && t.IsPublished, cancellationToken);

            if (track is null)
            {
                return NotFoundProblem("Track not found", $"No published track found with slug '{slug}'.");
            }

            var contentId = await dbContext.Contents
                .AsNoTracking()
                .Where(c => c.ContentType == ContentType.Music && c.ContentRefId == track.Id)
                .Select(c => (Guid?)c.Id)
                .FirstOrDefaultAsync(cancellationToken);

            var likeCount = 0;
            var commentCount = 0;
            var isLiked = false;
            if (contentId.HasValue)
            {
                likeCount = await dbContext.Likes
                    .CountAsync(l => l.ContentId == contentId.Value, cancellationToken);

                commentCount = await dbContext.Comments
                    .CountAsync(c => c.ContentId == contentId.Value && !c.IsDeleted, cancellationToken);

                if (Guid.TryParse(UserId, out var userGuid))
                {
                    isLiked = await dbContext.Likes
                        .AnyAsync(l => l.ContentId == contentId.Value && l.UserId == userGuid, cancellationToken);
                }
            }

            return OkEnvelope(MapTrackDetail(track, contentId, likeCount, isLiked, commentCount));
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
            var track = await dbContext.Tracks
                .AsNoTracking()
                .Include(t => t.BootlegAsset)
                .FirstOrDefaultAsync(t => t.Id == id && t.IsPublished, cancellationToken);

            if (track is null)
            {
                return NotFoundProblem("Track not found", $"No published track found with ID '{id}'.");
            }

            if (track.BootlegAsset is null)
            {
                return NotFoundProblem("Playable source unavailable", "This track does not have a playable source.");
            }

            var blobName = track.BootlegAsset.BlobName.Trim();
            if (!blobName.StartsWith("bootleg/audio/", StringComparison.OrdinalIgnoreCase))
            {
                return UnauthorizedProblem("Unauthorized stream scope", "Invalid stream scope for this track.");
            }

            var ttl = TimeSpan.FromMinutes(Math.Max(1, _settings.TokenTtlMinutes));
            var expiresAt = DateTimeOffset.UtcNow.Add(ttl);
            var token = tokenService.CreateToken(blobName, ttl);
            var streamUrl = $"{Request.Scheme}://{Request.Host}/bootleg/stream/{blobName}?token={Uri.EscapeDataString(token)}";

            return OkEnvelope(new TrackPlayLinkResponse(streamUrl, expiresAt));
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

    private static TrackListItemResponse MapTrackListItem(Track track, Guid? contentId)
    {
        return new TrackListItemResponse(
            track.Id,
            contentId,
            track.Title,
            track.Slug,
            track.Description,
            track.Authors
                .OrderBy(a => a.Order)
                .Select(a => new TrackAuthorResponse(
                    a.UserId,
                    a.User.Username,
                    a.User.DisplayName,
                    a.Role,
                    a.Order))
                .ToList(),
            track.Category,
            track.Duration,
            track.ReleaseDate,
            track.Genre,
            track.Tags.Where(t => !string.IsNullOrWhiteSpace(t)).ToList(),
            track.Cover,
            track.Links
                .OrderBy(l => l.Order)
                .Select(l => new TrackLinkResponse(l.Type, l.Url, l.Label, l.Order))
                .ToList(),
            track.Featured,
            track.IsPublished,
            track.PublishedAt,
            track.CreatedAt,
            track.UpdatedAt,
            track.BootlegAssetId.HasValue,
            track.BootlegAssetId);
    }

    private static TrackDetailResponse MapTrackDetail(Track track, Guid? contentId, int likeCount, bool isLiked, int commentCount)
    {
        return new TrackDetailResponse(
            track.Id,
            contentId,
            track.Title,
            track.Slug,
            track.Description,
            track.Authors
                .OrderBy(a => a.Order)
                .Select(a => new TrackAuthorResponse(
                    a.UserId,
                    a.User.Username,
                    a.User.DisplayName,
                    a.Role,
                    a.Order))
                .ToList(),
            track.Category,
            track.Duration,
            track.ReleaseDate,
            track.Genre,
            track.Tags.Where(t => !string.IsNullOrWhiteSpace(t)).ToList(),
            track.Cover,
            track.Links
                .OrderBy(l => l.Order)
                .Select(l => new TrackLinkResponse(l.Type, l.Url, l.Label, l.Order))
                .ToList(),
            track.Featured,
            track.IsPublished,
            track.PublishedAt,
            track.CreatedAt,
            track.UpdatedAt,
            track.BootlegAssetId.HasValue,
            track.BootlegAssetId,
            likeCount,
            isLiked,
            commentCount);
    }

    private static bool TryNormalizeCategory(string? value, out string normalized)
    {
        normalized = string.Empty;
        if (string.IsNullOrWhiteSpace(value))
        {
            return false;
        }

        var candidate = value.Trim().ToLowerInvariant();
        if (!AllowedCategories.Contains(candidate))
        {
            return false;
        }

        normalized = candidate;
        return true;
    }

    private static readonly HashSet<string> AllowedCategories = new(StringComparer.OrdinalIgnoreCase)
    {
        "remixes",
        "originals",
        "snippets",
        "features",
        "collaborations",
        "covers"
    };
}
