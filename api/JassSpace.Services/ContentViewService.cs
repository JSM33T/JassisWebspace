using JassSpace.Contracts.Interfaces;
using JassSpace.Contracts.Responses;
using JassSpace.Data;
using JassSpace.Entities;
using Microsoft.EntityFrameworkCore;

namespace JassSpace.Services;

public sealed class ContentViewService(JassSpaceDbContext dbContext) : IContentViewService
{
    private readonly JassSpaceDbContext _dbContext = dbContext;

    public async Task<ContentViewRecordResult> RecordViewAsync(
        Guid contentId,
        CancellationToken cancellationToken = default)
    {
        var exists = await _dbContext.Contents
            .AsNoTracking()
            .AnyAsync(c => c.Id == contentId, cancellationToken);

        if (!exists)
        {
            return new ContentViewRecordResult(
                ContentViewRecordStatus.ContentNotFound,
                null,
                $"No content found with ID '{contentId}'.");
        }

        if (_dbContext.Database.IsRelational())
        {
            var strategy = _dbContext.Database.CreateExecutionStrategy();
            var response = await strategy.ExecuteAsync(async () =>
            {
                _dbContext.ChangeTracker.Clear();

                var viewedAt = DateTimeOffset.UtcNow;
                await using var transaction = await _dbContext.Database.BeginTransactionAsync(cancellationToken);

                _dbContext.ContentViews.Add(new ContentView
                {
                    Id = Guid.NewGuid(),
                    ContentId = contentId,
                    ViewedAt = viewedAt
                });

                await _dbContext.SaveChangesAsync(cancellationToken);

                await _dbContext.Contents
                    .Where(c => c.Id == contentId)
                    .ExecuteUpdateAsync(
                        setters => setters
                            .SetProperty(c => c.ViewCount, c => c.ViewCount + 1)
                            .SetProperty(c => c.LastViewedAt, viewedAt),
                        cancellationToken);

                var viewCount = await _dbContext.Contents
                    .AsNoTracking()
                    .Where(c => c.Id == contentId)
                    .Select(c => c.ViewCount)
                    .FirstAsync(cancellationToken);

                await transaction.CommitAsync(cancellationToken);

                return new ContentViewResponse(contentId, viewCount, viewedAt);
            });

            return new ContentViewRecordResult(
                ContentViewRecordStatus.Success,
                response);
        }

        var viewedAt = DateTimeOffset.UtcNow;

        _dbContext.ContentViews.Add(new ContentView
        {
            Id = Guid.NewGuid(),
            ContentId = contentId,
            ViewedAt = viewedAt
        });

        await _dbContext.SaveChangesAsync(cancellationToken);

        var content = await _dbContext.Contents
            .FirstAsync(c => c.Id == contentId, cancellationToken);

        content.ViewCount += 1;
        content.LastViewedAt = viewedAt;
        await _dbContext.SaveChangesAsync(cancellationToken);

        var viewCount = await _dbContext.Contents
            .AsNoTracking()
            .Where(c => c.Id == contentId)
            .Select(c => c.ViewCount)
            .FirstAsync(cancellationToken);

        return new ContentViewRecordResult(
            ContentViewRecordStatus.Success,
            new ContentViewResponse(contentId, viewCount, viewedAt));
    }
}
