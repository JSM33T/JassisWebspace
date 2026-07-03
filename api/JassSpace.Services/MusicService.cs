using JassSpace.Contracts.Interfaces;
using JassSpace.Contracts.Responses;
using JassSpace.Data;
using JassSpace.Entities;
using JassSpace.Entities.Enums;
using Microsoft.EntityFrameworkCore;

namespace JassSpace.Services;

public sealed class MusicService(
    JassSpaceDbContext dbContext,
    IBootlegTokenService tokenService) : IMusicService
{
    private readonly JassSpaceDbContext _dbContext = dbContext;
    private readonly IBootlegTokenService _tokenService = tokenService;

    private static readonly HashSet<string> AllowedCategories = new(StringComparer.OrdinalIgnoreCase)
    {
        "remixes",
        "originals",
        "snippets",
        "features",
        "collaborations",
        "covers"
    };

    public async Task<MusicTracksQueryResult> GetTracksAsync(
        string? search,
        string? category,
        bool? featured,
        int page = 1,
        int pageSize = 50,
        CancellationToken cancellationToken = default)
    {
        NormalizePagination(ref page, ref pageSize);

        var query = _dbContext.Tracks
            .AsNoTracking()
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
                return new MusicTracksQueryResult(
                    MusicTracksQueryStatus.InvalidCategory,
                    [],
                    page,
                    pageSize,
                    0,
                    $"Category '{category}' is not supported.");
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
        var contentByRefId = trackIds.Count == 0
            ? new Dictionary<Guid, Guid>()
            : await _dbContext.Contents
                .AsNoTracking()
                .Where(c => c.ContentType == ContentType.Music && trackIds.Contains(c.ContentRefId))
                .ToDictionaryAsync(c => c.ContentRefId, c => c.Id, cancellationToken);

        var authorsByTrackId = trackIds.Count == 0
            ? new Dictionary<Guid, List<ContentAuthorResponse>>()
            : await LoadAuthorsByContentMapAsync(contentByRefId, cancellationToken);

        var response = tracks
            .Select(t => MapTrackListItem(
                t,
                contentByRefId.TryGetValue(t.Id, out var cid) ? cid : null,
                authorsByTrackId.TryGetValue(t.Id, out var a) ? a : []))
            .ToList();

        return new MusicTracksQueryResult(
            MusicTracksQueryStatus.Success,
            response,
            page,
            pageSize,
            total);
    }

    public async Task<TrackDetailResponse?> GetTrackBySlugAsync(
        string slug,
        Guid? currentUserId = null,
        CancellationToken cancellationToken = default)
    {
        var normalizedSlug = slug?.Trim();
        if (string.IsNullOrWhiteSpace(normalizedSlug))
        {
            return null;
        }

        var track = await _dbContext.Tracks
            .AsNoTracking()
            .Include(t => t.Links)
            .FirstOrDefaultAsync(t => t.Slug == normalizedSlug && t.IsPublished, cancellationToken);

        if (track is null)
        {
            return null;
        }

        var contentMeta = await _dbContext.Contents
            .AsNoTracking()
            .Where(c => c.ContentType == ContentType.Music && c.ContentRefId == track.Id)
            .Select(c => new { c.Id, c.ViewCount })
            .FirstOrDefaultAsync(cancellationToken);
        var contentId = contentMeta?.Id;

        var likeCount = 0;
        var commentCount = 0;
        var viewCount = contentMeta?.ViewCount ?? 0;
        var isLiked = false;

        if (contentId.HasValue)
        {
            likeCount = await _dbContext.Likes
                .AsNoTracking()
                .CountAsync(l => l.ContentId == contentId.Value, cancellationToken);

            commentCount = await _dbContext.Comments
                .AsNoTracking()
                .CountAsync(c => c.ContentId == contentId.Value && !c.IsDeleted, cancellationToken);

            if (currentUserId.HasValue)
            {
                isLiked = await _dbContext.Likes
                    .AsNoTracking()
                    .AnyAsync(l => l.ContentId == contentId.Value && l.UserId == currentUserId.Value, cancellationToken);
            }
        }

        var authors = contentId.HasValue
            ? await _dbContext.ContentAuthors
                .AsNoTracking()
                .Where(ca => ca.ContentId == contentId.Value)
                .OrderBy(ca => ca.Order)
                .Select(ca => new ContentAuthorResponse(
                    ca.UserId,
                    ca.User.Username,
                    ca.User.DisplayName,
                    ca.Role,
                    ca.Order))
                .ToListAsync(cancellationToken)
            : [];

        return MapTrackDetail(track, contentId, authors, likeCount, isLiked, commentCount, viewCount);
    }

    public async Task<MusicPlayLinkResult> CreatePlayLinkAsync(
        Guid id,
        string baseUrl,
        int tokenTtlMinutes,
        CancellationToken cancellationToken = default)
    {
        var track = await _dbContext.Tracks
            .AsNoTracking()
            .Include(t => t.BootlegAsset)
            .FirstOrDefaultAsync(t => t.Id == id && t.IsPublished, cancellationToken);

        if (track is null)
        {
            return new MusicPlayLinkResult(
                MusicPlayLinkStatus.TrackNotFound,
                null,
                $"No published track found with ID '{id}'.");
        }

        if (track.BootlegAsset is null)
        {
            return new MusicPlayLinkResult(
                MusicPlayLinkStatus.PlayableSourceUnavailable,
                null,
                "This track does not have a playable source.");
        }

        var blobName = track.BootlegAsset.BlobName.Trim();
        if (!blobName.StartsWith("bootleg/audio/", StringComparison.OrdinalIgnoreCase))
        {
            return new MusicPlayLinkResult(
                MusicPlayLinkStatus.UnauthorizedStreamScope,
                null,
                "Invalid stream scope for this track.");
        }

        var ttl = TimeSpan.FromMinutes(Math.Max(1, tokenTtlMinutes));
        var expiresAt = DateTimeOffset.UtcNow.Add(ttl);
        var token = _tokenService.CreateToken(blobName, ttl);
        var normalizedBaseUrl = baseUrl.TrimEnd('/');
        var streamUrl = $"{normalizedBaseUrl}/bootleg/stream/{blobName}?token={Uri.EscapeDataString(token)}";

        return new MusicPlayLinkResult(
            MusicPlayLinkStatus.Success,
            new TrackPlayLinkResponse(streamUrl, expiresAt));
    }

    private static void NormalizePagination(ref int page, ref int pageSize)
    {
        if (page < 1)
        {
            page = 1;
        }

        pageSize = Math.Clamp(pageSize, 1, 100);
    }

    private static TrackListItemResponse MapTrackListItem(Track track, Guid? contentId, List<ContentAuthorResponse> authors)
    {
        return new TrackListItemResponse(
            track.Id,
            contentId,
            track.Title,
            track.Slug,
            track.Description,
            authors,
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

    private static TrackDetailResponse MapTrackDetail(Track track, Guid? contentId, List<ContentAuthorResponse> authors, int likeCount, bool isLiked, int commentCount, int viewCount)
    {
        return new TrackDetailResponse(
            track.Id,
            contentId,
            track.Title,
            track.Slug,
            track.Description,
            authors,
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
            commentCount,
            viewCount);
    }

    private async Task<Dictionary<Guid, List<ContentAuthorResponse>>> LoadAuthorsByContentMapAsync(
        Dictionary<Guid, Guid> contentByRefId,
        CancellationToken cancellationToken)
    {
        var result = new Dictionary<Guid, List<ContentAuthorResponse>>();
        var contentIds = contentByRefId.Values.ToList();
        if (contentIds.Count == 0) return result;

        var refIdByContentId = contentByRefId.ToDictionary(kv => kv.Value, kv => kv.Key);

        var authorRows = await _dbContext.ContentAuthors
            .AsNoTracking()
            .Where(ca => contentIds.Contains(ca.ContentId))
            .OrderBy(ca => ca.Order)
            .Select(ca => new
            {
                ca.ContentId,
                Response = new ContentAuthorResponse(
                    ca.UserId,
                    ca.User.Username,
                    ca.User.DisplayName,
                    ca.Role,
                    ca.Order)
            })
            .ToListAsync(cancellationToken);

        foreach (var row in authorRows)
        {
            if (!refIdByContentId.TryGetValue(row.ContentId, out var trackId)) continue;
            if (!result.TryGetValue(trackId, out var list))
            {
                list = [];
                result[trackId] = list;
            }
            list.Add(row.Response);
        }

        return result;
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
}
