using JassSpace.Contracts.Interfaces;
using JassSpace.Data;
using JassSpace.Entities;
using JassSpace.Entities.Enums;
using JassSpace.Services;
using Microsoft.EntityFrameworkCore;

namespace JassSpace.Tests.Services;

public sealed class ContentViewServiceTests
{
    [Fact]
    public async Task RecordViewAsync_ReturnsContentNotFound_WhenContentDoesNotExist()
    {
        await using var dbContext = CreateDbContext();
        var service = new ContentViewService(dbContext);

        var result = await service.RecordViewAsync(Guid.NewGuid());

        Assert.Equal(ContentViewRecordStatus.ContentNotFound, result.Status);
        Assert.Null(result.Response);
        Assert.Empty(dbContext.ContentViews);
    }

    [Fact]
    public async Task RecordViewAsync_InsertsViewAndIncrementsContentCount()
    {
        await using var dbContext = CreateDbContext();
        var content = CreateContent();
        dbContext.Contents.Add(content);
        await dbContext.SaveChangesAsync();
        var service = new ContentViewService(dbContext);

        var result = await service.RecordViewAsync(content.Id);

        Assert.Equal(ContentViewRecordStatus.Success, result.Status);
        Assert.NotNull(result.Response);
        Assert.Equal(content.Id, result.Response.ContentId);
        Assert.Equal(1, result.Response.ViewCount);
        Assert.Single(dbContext.ContentViews);

        var updatedContent = await dbContext.Contents.SingleAsync(c => c.Id == content.Id);
        Assert.Equal(1, updatedContent.ViewCount);
        Assert.NotNull(updatedContent.LastViewedAt);
    }

    [Fact]
    public async Task RecordViewAsync_AllowsMultipleAnonymousViewRecords()
    {
        await using var dbContext = CreateDbContext();
        var content = CreateContent();
        dbContext.Contents.Add(content);
        await dbContext.SaveChangesAsync();
        var service = new ContentViewService(dbContext);

        await service.RecordViewAsync(content.Id);
        var result = await service.RecordViewAsync(content.Id);

        Assert.Equal(ContentViewRecordStatus.Success, result.Status);
        Assert.Equal(2, result.Response?.ViewCount);
        Assert.Equal(2, await dbContext.ContentViews.CountAsync(v => v.ContentId == content.Id));
        Assert.Equal(2, await dbContext.Contents.Where(c => c.Id == content.Id).Select(c => c.ViewCount).SingleAsync());
    }

    private static JassSpaceDbContext CreateDbContext()
    {
        var options = new DbContextOptionsBuilder<JassSpaceDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString("N"))
            .Options;

        return new JassSpaceDbContext(options);
    }

    private static Content CreateContent() => new()
    {
        Id = Guid.NewGuid(),
        ContentType = ContentType.Blog,
        ContentRefId = Guid.NewGuid(),
        Title = "A test post",
        Slug = $"test-post-{Guid.NewGuid():N}",
        IsPublished = true,
        CreatedAt = DateTimeOffset.UtcNow
    };
}
