using JassSpace.Api.Extensions;
using JassSpace.Contracts;
using JassSpace.Contracts.Responses;
using JassSpace.Data;
using JassSpace.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace JassSpace.Api.Controllers;

[Route("likes")]
public sealed class LikeController(
    JassSpaceDbContext dbContext,
    ILogger<LikeController> logger)
    : BaseApiController
{
    /// <summary>
    /// Toggle like status for a content.
    /// </summary>
    [HttpPost("{contentId:guid}")]
    [Authorize]
    [ProducesResponseType(typeof(ApiResponse<LikeStatusResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> ToggleLike(Guid contentId, CancellationToken cancellationToken = default)
    {
        // Verify content exists
        var contentExists = await dbContext.Contents
            .AnyAsync(c => c.Id == contentId, cancellationToken);

        if (!contentExists)
        {
            return NotFoundProblem("Content not found", $"No content found with ID '{contentId}'.");
        }

        if (UserId is null) return Unauthorized();
        var userId = Guid.Parse(UserId);

        try
        {
            var existingLike = await dbContext.Likes
                .FirstOrDefaultAsync(l => l.ContentId == contentId && l.UserId == userId, cancellationToken);

            if (existingLike != null)
            {
                // Unlike
                dbContext.Likes.Remove(existingLike);
                await dbContext.SaveChangesAsync(cancellationToken);

                var likeCount = await dbContext.Likes
                    .CountAsync(l => l.ContentId == contentId, cancellationToken);

                return OkEnvelope(new LikeStatusResponse(contentId, likeCount, false));
            }
            else
            {
                // Like
                var like = new Like
                {
                    ContentId = contentId,
                    UserId = userId,
                    CreatedAt = DateTimeOffset.UtcNow
                };

                dbContext.Likes.Add(like);
                await dbContext.SaveChangesAsync(cancellationToken);

                var likeCount = await dbContext.Likes
                    .CountAsync(l => l.ContentId == contentId, cancellationToken);

                return OkEnvelope(new LikeStatusResponse(contentId, likeCount, true));
            }
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to toggle like for content {ContentId}", contentId);
            return Problem(
                StatusCodes.Status500InternalServerError,
                "Failed to update like status",
                "An unexpected error occurred.");
        }
    }

    /// <summary>
    /// Get like count and current-user like status for a content.
    /// </summary>
    [HttpGet("{contentId:guid}/status")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(ApiResponse<LikeStatusResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetLikeStatus(Guid contentId, CancellationToken cancellationToken = default)
    {
        try
        {
            var contentExists = await dbContext.Contents
                .AnyAsync(c => c.Id == contentId, cancellationToken);

            if (!contentExists)
            {
                return NotFoundProblem("Content not found", $"No content found with ID '{contentId}'.");
            }

            var likeCount = await dbContext.Likes
                .CountAsync(l => l.ContentId == contentId, cancellationToken);

            var isLiked = false;
            if (Guid.TryParse(UserId, out var userId))
            {
                isLiked = await dbContext.Likes
                    .AnyAsync(l => l.ContentId == contentId && l.UserId == userId, cancellationToken);
            }

            return OkEnvelope(new LikeStatusResponse(contentId, likeCount, isLiked));
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to get like status for content {ContentId}", contentId);
            return Problem(
                StatusCodes.Status500InternalServerError,
                "Failed to retrieve like status",
                "An unexpected error occurred.");
        }
    }

    /// <summary>
    /// Get like count for a content.
    /// </summary>
    [HttpGet("{contentId:guid}/count")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(ApiResponse<int>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetLikeCount(Guid contentId, CancellationToken cancellationToken = default)
    {
        try
        {
            var count = await dbContext.Likes
                .CountAsync(l => l.ContentId == contentId, cancellationToken);

            return OkEnvelope(count);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to get like count for content {ContentId}", contentId);
            return Problem(
                StatusCodes.Status500InternalServerError,
                "Failed to retrieve like count",
                "An unexpected error occurred.");
        }
    }
}
