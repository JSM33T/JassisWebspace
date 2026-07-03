using JassSpace.Contracts.Interfaces;
using JassSpace.Contracts.Responses;
using JassSpace.Data;
using JassSpace.Entities;
using JassSpace.Entities.Enums;
using Microsoft.EntityFrameworkCore;

namespace JassSpace.Services;

public sealed class AdminContentService(JassSpaceDbContext dbContext) : IAdminContentService
{
    private readonly JassSpaceDbContext _dbContext = dbContext;

    public async Task<List<AdminContentListItemResponse>> GetContentsAsync(
        string? contentType,
        string? sortBy,
        string? sortDir = "desc",
        DateTimeOffset? dateFrom = null,
        DateTimeOffset? dateTo = null,
        CancellationToken cancellationToken = default)
    {
        var query = _dbContext.Contents
            .AsNoTracking()
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(contentType) &&
            Enum.TryParse<ContentType>(contentType, true, out var parsedType))
        {
            query = query.Where(c => c.ContentType == parsedType);
        }

        var contents = await query.ToListAsync(cancellationToken);
        var contentIds = contents.Select(c => c.Id).ToHashSet();

        var commentCounts = await _dbContext.Comments
            .AsNoTracking()
            .Where(c => !c.IsDeleted && contentIds.Contains(c.ContentId))
            .GroupBy(c => c.ContentId)
            .Select(g => new { g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.Key, x => x.Count, cancellationToken);

        var musicContentRefIds = contents
            .Where(c => c.ContentType == ContentType.Music)
            .Select(c => c.ContentRefId)
            .Distinct()
            .ToList();

        var trackLinkCounts = await _dbContext.TrackLinks
            .AsNoTracking()
            .Where(l => musicContentRefIds.Contains(l.TrackId))
            .GroupBy(l => l.TrackId)
            .Select(g => new { g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.Key, x => x.Count, cancellationToken);

        var likeCounts = await _dbContext.Likes
            .AsNoTracking()
            .Where(l => contentIds.Contains(l.ContentId))
            .GroupBy(l => l.ContentId)
            .Select(g => new { g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.Key, x => x.Count, cancellationToken);

        var commentActivity = await _dbContext.Comments
            .AsNoTracking()
            .Where(c => !c.IsDeleted && contentIds.Contains(c.ContentId))
            .GroupBy(c => c.ContentId)
            .Select(g => new { g.Key, LastActivityAt = g.Max(c => c.CreatedAt) })
            .ToDictionaryAsync(x => x.Key, x => x.LastActivityAt, cancellationToken);

        var likeActivity = await _dbContext.Likes
            .AsNoTracking()
            .Where(l => contentIds.Contains(l.ContentId))
            .GroupBy(l => l.ContentId)
            .Select(g => new { g.Key, LastActivityAt = g.Max(l => l.CreatedAt) })
            .ToDictionaryAsync(x => x.Key, x => x.LastActivityAt, cancellationToken);

        var response = contents
            .Select(content =>
            {
                var commentCount = commentCounts.TryGetValue(content.Id, out var count) ? count : 0;
                var linkCount = content.ContentType == ContentType.Music &&
                                trackLinkCounts.TryGetValue(content.ContentRefId, out var trackCount)
                    ? trackCount
                    : 0;
                var likeCount = likeCounts.TryGetValue(content.Id, out var likeTotal) ? likeTotal : 0;

                var lastActivity = content.UpdatedAt ?? content.CreatedAt;
                if (commentActivity.TryGetValue(content.Id, out var commentLast) && commentLast > lastActivity)
                {
                    lastActivity = commentLast;
                }

                if (likeActivity.TryGetValue(content.Id, out var likeLast) && likeLast > lastActivity)
                {
                    lastActivity = likeLast;
                }

                if (content.LastViewedAt.HasValue && content.LastViewedAt.Value > lastActivity)
                {
                    lastActivity = content.LastViewedAt.Value;
                }

                return new AdminContentListItemResponse(
                    content.Id,
                    content.Title,
                    content.Slug,
                    content.ContentType.ToString(),
                    content.IsPublished,
                    content.PublishedAt,
                    content.CreatedAt,
                    content.UpdatedAt,
                    linkCount,
                    commentCount,
                    likeCount,
                    content.ViewCount,
                    lastActivity);
            })
            .Where(r => r.LikeCount > 0 || r.CommentCount > 0 || r.ViewCount > 0)
            .ToList();

        var normalizedSortDir = sortDir?.ToLowerInvariant() == "asc" ? "asc" : "desc";

        response = sortBy?.Trim() switch
        {
            var s when string.Equals(s, "createdAt", StringComparison.OrdinalIgnoreCase) =>
                normalizedSortDir == "asc"
                    ? response.OrderBy(r => r.CreatedAt).ToList()
                    : response.OrderByDescending(r => r.CreatedAt).ToList(),
            var s when string.Equals(s, "updatedAt", StringComparison.OrdinalIgnoreCase) =>
                normalizedSortDir == "asc"
                    ? response.OrderBy(r => r.UpdatedAt ?? DateTimeOffset.MinValue).ToList()
                    : response.OrderByDescending(r => r.UpdatedAt ?? DateTimeOffset.MinValue).ToList(),
            _ =>
                normalizedSortDir == "asc"
                    ? response.OrderBy(r => r.LastActivityAt).ToList()
                    : response.OrderByDescending(r => r.LastActivityAt).ToList()
        };

        var resolvedTo = dateTo ?? DateTimeOffset.UtcNow;
        var resolvedFrom = dateFrom ?? resolvedTo.AddDays(-7);

        if (resolvedFrom > resolvedTo)
        {
            (resolvedFrom, resolvedTo) = (resolvedTo, resolvedFrom);
        }

        return response
            .Where(r => r.LastActivityAt >= resolvedFrom && r.LastActivityAt <= resolvedTo)
            .ToList();
    }

    public async Task<AdminContentDetailResponse?> GetContentAsync(
        Guid contentId,
        CancellationToken cancellationToken = default)
    {
        var content = await _dbContext.Contents
            .AsNoTracking()
            .FirstOrDefaultAsync(c => c.Id == contentId, cancellationToken);

        if (content is null)
        {
            return null;
        }

        var commentCount = await _dbContext.Comments
            .AsNoTracking()
            .CountAsync(c => c.ContentId == contentId && !c.IsDeleted, cancellationToken);

        var likes = await _dbContext.Likes
            .AsNoTracking()
            .Where(l => l.ContentId == contentId)
            .Include(l => l.User)
            .OrderByDescending(l => l.CreatedAt)
            .ToListAsync(cancellationToken);

        var likedBy = likes
            .Where(l => l.User is not null)
            .Select(l => new AdminContentUserSummaryResponse(
                l.UserId,
                l.User.Username,
                l.User.DisplayName,
                l.User.AvatarUrl))
            .ToList();

        var commenterRows = await _dbContext.Comments
            .AsNoTracking()
            .Where(c => c.ContentId == contentId && !c.IsDeleted)
            .Include(c => c.User)
            .OrderByDescending(c => c.CreatedAt)
            .Select(c => new
            {
                c.UserId,
                c.User.Username,
                c.User.DisplayName,
                c.User.AvatarUrl,
                c.CreatedAt
            })
            .ToListAsync(cancellationToken);

        var distinctCommenters = commenterRows
            .GroupBy(c => c.UserId)
            .Select(g => g.First())
            .Select(c => new AdminContentUserSummaryResponse(
                c.UserId,
                c.Username,
                c.DisplayName,
                c.AvatarUrl))
            .ToList();

        var linkCount = 0;
        if (content.ContentType == ContentType.Music)
        {
            linkCount = await _dbContext.TrackLinks
                .AsNoTracking()
                .CountAsync(l => l.TrackId == content.ContentRefId, cancellationToken);
        }

        var lastCommentAt = commenterRows.FirstOrDefault()?.CreatedAt;
        var lastLikeAt = likes.FirstOrDefault()?.CreatedAt;

        var lastActivity = content.UpdatedAt ?? content.CreatedAt;
        if (lastCommentAt.HasValue && lastCommentAt.Value > lastActivity)
        {
            lastActivity = lastCommentAt.Value;
        }

        if (lastLikeAt.HasValue && lastLikeAt.Value > lastActivity)
        {
            lastActivity = lastLikeAt.Value;
        }

        if (content.LastViewedAt.HasValue && content.LastViewedAt.Value > lastActivity)
        {
            lastActivity = content.LastViewedAt.Value;
        }

        return new AdminContentDetailResponse(
            content.Id,
            content.Title,
            content.Slug,
            content.ContentType.ToString(),
            content.IsPublished,
            content.PublishedAt,
            content.CreatedAt,
            content.UpdatedAt,
            linkCount,
            commentCount,
            likedBy.Count,
            content.ViewCount,
            lastActivity,
            likedBy,
            distinctCommenters);
    }

    public async Task<List<AdminContentSearchResultResponse>> SearchContentsAsync(
        string query,
        string? contentType = null,
        CancellationToken cancellationToken = default)
    {
        var term = query.Trim();

        if (term.Length < 2)
            return [];

        // Hybrid: FTS match OR trigram similarity above threshold, ranked by weighted score.
        // Title weight 3x, FTS rank 2x, Description 1x, Slug 0.5x.
        // websearch_to_tsquery handles phrases/negation and is safe with arbitrary user input.
        var rows = await _dbContext.Contents
            .FromSqlInterpolated($"""
                SELECT *
                FROM "Contents"
                WHERE
                    "SearchVector" @@ websearch_to_tsquery('english', {term})
                    OR similarity("Title", {term}) > 0.2
                    OR similarity(coalesce("Description", ''), {term}) > 0.15
                    OR similarity("Slug", {term}) > 0.2
                ORDER BY (
                    similarity("Title", {term}) * 3 +
                    ts_rank("SearchVector", websearch_to_tsquery('english', {term})) * 2 +
                    similarity(coalesce("Description", ''), {term}) +
                    similarity("Slug", {term}) * 0.5
                ) DESC
                LIMIT 50
                """)
            .AsNoTracking()
            .ToListAsync(cancellationToken);

        if (!string.IsNullOrWhiteSpace(contentType) &&
            Enum.TryParse<ContentType>(contentType, true, out var parsedType))
        {
            rows = rows.Where(r => r.ContentType == parsedType).ToList();
        }

        return rows.Select(r => new AdminContentSearchResultResponse(
            r.Id,
            r.Title,
            r.Slug,
            r.Description,
            r.Cover,
            r.ContentType.ToString(),
            r.IsPublished,
            r.PublishedAt,
            r.CreatedAt
        )).ToList();
    }
}
