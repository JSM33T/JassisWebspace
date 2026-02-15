using JassSpace.Contracts;
using JassSpace.Contracts.Responses;
using JassSpace.Data;
using JassSpace.Entities.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace JassSpace.Api.Controllers;

[Route("admin/content")]
[Authorize(Roles = "admin,mod")]
public sealed class AdminContentController(
    JassSpaceDbContext dbContext)
    : BaseApiController
{
    [HttpGet]
    [ProducesResponseType(typeof(ApiResponse<List<AdminContentListItemResponse>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetContents(
        [FromQuery] string? contentType,
        [FromQuery] string? sortBy,
        [FromQuery] string? sortDir = "desc",
        [FromQuery] DateTimeOffset? dateFrom = null,
        [FromQuery] DateTimeOffset? dateTo = null,
        CancellationToken cancellationToken = default)
    {
        var query = dbContext.Contents.AsNoTracking().AsQueryable();

        if (!string.IsNullOrWhiteSpace(contentType) && Enum.TryParse<ContentType>(contentType, true, out var parsedType))
        {
            query = query.Where(c => c.ContentType == parsedType);
        }

        var contents = await query.ToListAsync(cancellationToken);

        var contentIds = contents.Select(c => c.Id).ToHashSet();

        var commentCounts = await dbContext.Comments
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

        var trackLinkCounts = await dbContext.TrackLinks
            .AsNoTracking()
            .Where(l => musicContentRefIds.Contains(l.TrackId))
            .GroupBy(l => l.TrackId)
            .Select(g => new { g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.Key, x => x.Count, cancellationToken);

        var likeCounts = await dbContext.Likes
            .AsNoTracking()
            .Where(l => contentIds.Contains(l.ContentId))
            .GroupBy(l => l.ContentId)
            .Select(g => new { g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.Key, x => x.Count, cancellationToken);

        var commentActivity = await dbContext.Comments
            .AsNoTracking()
            .Where(c => !c.IsDeleted && contentIds.Contains(c.ContentId))
            .GroupBy(c => c.ContentId)
            .Select(g => new { g.Key, LastActivityAt = g.Max(c => c.CreatedAt) })
            .ToDictionaryAsync(x => x.Key, x => x.LastActivityAt, cancellationToken);

        var likeActivity = await dbContext.Likes
            .AsNoTracking()
            .Where(l => contentIds.Contains(l.ContentId))
            .GroupBy(l => l.ContentId)
            .Select(g => new { g.Key, LastActivityAt = g.Max(l => l.CreatedAt) })
            .ToDictionaryAsync(x => x.Key, x => x.LastActivityAt, cancellationToken);

        var response = contents.Select(content =>
        {
            var commentCount = commentCounts.TryGetValue(content.Id, out var count) ? count : 0;
            var linkCount = content.ContentType == ContentType.Music && trackLinkCounts.TryGetValue(content.ContentRefId, out var trackCount)
                ? trackCount
                : 0;
            var likeCount = likeCounts.TryGetValue(content.Id, out var likeTotal) ? likeTotal : 0;

            var lastActivity = content.UpdatedAt ?? content.CreatedAt;
            if (commentActivity.TryGetValue(content.Id, out var commentLast))
            {
                lastActivity = commentLast > lastActivity ? commentLast : lastActivity;
            }
            if (likeActivity.TryGetValue(content.Id, out var likeLast))
            {
                lastActivity = likeLast > lastActivity ? likeLast : lastActivity;
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
                lastActivity);
        }).ToList();

        response = response
            .Where(r => r.LikeCount > 0 || r.CommentCount > 0)
            .ToList();

        sortDir = sortDir?.ToLowerInvariant() == "asc" ? "asc" : "desc";

        response = sortBy?.Trim() switch
        {
            var s when string.Equals(s, "createdAt", StringComparison.OrdinalIgnoreCase) =>
                sortDir == "asc"
                    ? response.OrderBy(r => r.CreatedAt).ToList()
                    : response.OrderByDescending(r => r.CreatedAt).ToList(),
            var s when string.Equals(s, "updatedAt", StringComparison.OrdinalIgnoreCase) =>
                sortDir == "asc"
                    ? response.OrderBy(r => r.UpdatedAt ?? DateTimeOffset.MinValue).ToList()
                    : response.OrderByDescending(r => r.UpdatedAt ?? DateTimeOffset.MinValue).ToList(),
            _ =>
                sortDir == "asc"
                    ? response.OrderBy(r => r.LastActivityAt).ToList()
                    : response.OrderByDescending(r => r.LastActivityAt).ToList()
        };

        var resolvedTo = dateTo ?? DateTimeOffset.UtcNow;
        var resolvedFrom = dateFrom ?? resolvedTo.AddDays(-7);

        if (resolvedFrom > resolvedTo)
        {
            var temp = resolvedFrom;
            resolvedFrom = resolvedTo;
            resolvedTo = temp;
        }

        response = response
            .Where(r => r.LastActivityAt >= resolvedFrom && r.LastActivityAt <= resolvedTo)
            .ToList();

        return OkEnvelope(response);
    }

    [HttpGet("{contentId:guid}")]
    [ProducesResponseType(typeof(ApiResponse<AdminContentDetailResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetContent(Guid contentId, CancellationToken cancellationToken = default)
    {
        var content = await dbContext.Contents
            .AsNoTracking()
            .FirstOrDefaultAsync(c => c.Id == contentId, cancellationToken);

        if (content is null)
        {
            return NotFoundProblem("Content not found", $"No content found with ID '{contentId}'.");
        }

        var commentCount = await dbContext.Comments
            .AsNoTracking()
            .CountAsync(c => c.ContentId == contentId && !c.IsDeleted, cancellationToken);

        var likes = await dbContext.Likes
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

        var commenterRows = await dbContext.Comments
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
            linkCount = await dbContext.TrackLinks
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

        var detail = new AdminContentDetailResponse(
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
            lastActivity,
            likedBy,
            distinctCommenters);

        return OkEnvelope(detail);
    }
}
