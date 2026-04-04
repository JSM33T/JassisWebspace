using JassSpace.Contracts.Interfaces;
using JassSpace.Contracts.Responses;
using JassSpace.Data;
using JassSpace.Entities;
using Microsoft.EntityFrameworkCore;

namespace JassSpace.Services;

public sealed class LikeService(JassSpaceDbContext dbContext) : ILikeService
{
    private readonly JassSpaceDbContext _dbContext = dbContext;

    public async Task<LikeStatusQueryResult> ToggleLikeAsync(
        Guid contentId,
        Guid userId,
        CancellationToken cancellationToken = default)
    {
        var contentExists = await ContentExistsAsync(contentId, cancellationToken);
        if (!contentExists)
        {
            return new LikeStatusQueryResult(
                LikeStatusQueryStatus.ContentNotFound,
                null,
                $"No content found with ID '{contentId}'.");
        }

        var existingLike = await _dbContext.Likes
            .FirstOrDefaultAsync(l => l.ContentId == contentId && l.UserId == userId, cancellationToken);

        var isLiked = false;

        if (existingLike is not null)
        {
            _dbContext.Likes.Remove(existingLike);
        }
        else
        {
            _dbContext.Likes.Add(new Like
            {
                ContentId = contentId,
                UserId = userId,
                CreatedAt = DateTimeOffset.UtcNow
            });
            isLiked = true;
        }

        await _dbContext.SaveChangesAsync(cancellationToken);

        var likeCount = await GetLikeCountAsync(contentId, cancellationToken);
        return new LikeStatusQueryResult(
            LikeStatusQueryStatus.Success,
            new LikeStatusResponse(contentId, likeCount, isLiked));
    }

    public async Task<LikeStatusQueryResult> GetLikeStatusAsync(
        Guid contentId,
        Guid? userId = null,
        CancellationToken cancellationToken = default)
    {
        var contentExists = await ContentExistsAsync(contentId, cancellationToken);
        if (!contentExists)
        {
            return new LikeStatusQueryResult(
                LikeStatusQueryStatus.ContentNotFound,
                null,
                $"No content found with ID '{contentId}'.");
        }

        var likeCount = await GetLikeCountAsync(contentId, cancellationToken);
        var isLiked = false;

        if (userId.HasValue)
        {
            isLiked = await _dbContext.Likes
                .AsNoTracking()
                .AnyAsync(l => l.ContentId == contentId && l.UserId == userId.Value, cancellationToken);
        }

        return new LikeStatusQueryResult(
            LikeStatusQueryStatus.Success,
            new LikeStatusResponse(contentId, likeCount, isLiked));
    }

    public Task<int> GetLikeCountAsync(Guid contentId, CancellationToken cancellationToken = default) =>
        _dbContext.Likes
            .AsNoTracking()
            .CountAsync(l => l.ContentId == contentId, cancellationToken);

    private Task<bool> ContentExistsAsync(Guid contentId, CancellationToken cancellationToken) =>
        _dbContext.Contents
            .AsNoTracking()
            .AnyAsync(c => c.Id == contentId, cancellationToken);
}
