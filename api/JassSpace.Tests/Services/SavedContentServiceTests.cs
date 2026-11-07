using JassSpace.Data;
using JassSpace.Entities;
using JassSpace.Entities.Enums;
using JassSpace.Services;
using Microsoft.EntityFrameworkCore;

namespace JassSpace.Tests.Services;

public sealed class SavedContentServiceTests
{
    private static JassSpaceDbContext CreateContext() => new(new DbContextOptionsBuilder<JassSpaceDbContext>()
        .UseInMemoryDatabase(Guid.NewGuid().ToString("N")).Options);

    private static User NewUser() => new()
    {
        Id = Guid.NewGuid(), Email = $"{Guid.NewGuid():N}@test.invalid", Username = $"user{Guid.NewGuid():N}",
        PasswordHash = "test", CreatedAt = DateTimeOffset.UtcNow, UpdatedAt = DateTimeOffset.UtcNow
    };

    [Fact]
    public async Task SavesArePerUserAndIdempotent()
    {
        await using var db = CreateContext();
        var first = NewUser();
        var second = NewUser();
        var blog = new Blog { Id = Guid.NewGuid(), Title = "Post", Slug = "post", Content = "Original", IsPublished = true };
        var content = new Content { Id = Guid.NewGuid(), ContentType = ContentType.Blog, ContentRefId = blog.Id,
            Title = blog.Title, Slug = blog.Slug, IsPublished = true };
        db.Users.AddRange(first, second);
        db.Blogs.Add(blog);
        db.Contents.Add(content);
        await db.SaveChangesAsync();
        var service = new SavedContentService(db);

        var saved = await service.SaveAsync(first.Id, content.Id, default);
        var again = await service.SaveAsync(first.Id, content.Id, default);
        var other = await service.SaveAsync(second.Id, content.Id, default);

        Assert.True(saved?.IsSaved);
        Assert.Equal(saved?.SavedAt, again?.SavedAt);
        Assert.True(other?.IsSaved);
        Assert.Equal(2, await db.SavedContents.CountAsync());
        content.Slug = "post-content-slug-is-different";
        await db.SaveChangesAsync();
        Assert.Equal("/blog/post", Assert.Single((await service.GetPageAsync(first.Id, null, 1, 20, default)).Items).Href);

        await service.RemoveAsync(first.Id, content.Id, default);
        Assert.False((await service.GetStatusAsync(first.Id, content.Id, default))?.IsSaved);
        Assert.True((await service.GetStatusAsync(second.Id, content.Id, default))?.IsSaved);
    }

    [Fact]
    public async Task DraftAndPrivateArtifactCannotBeSaved()
    {
        await using var db = CreateContext();
        var user = NewUser();
        var draft = new Blog { Id = Guid.NewGuid(), Title = "Draft", Slug = "draft", Content = "Hidden", IsPublished = false };
        var draftContent = new Content { Id = Guid.NewGuid(), ContentType = ContentType.Blog, ContentRefId = draft.Id,
            Title = draft.Title, Slug = draft.Slug, IsPublished = false };
        var artifactContent = new Content { Id = Guid.NewGuid(), ContentType = ContentType.Artifact, ContentRefId = Guid.NewGuid(),
            Title = "Private", Slug = "private", IsPublished = true };
        db.Users.Add(user);
        db.Blogs.Add(draft);
        db.Contents.AddRange(draftContent, artifactContent);
        await db.SaveChangesAsync();
        var service = new SavedContentService(db);

        Assert.Null(await service.SaveAsync(user.Id, draftContent.Id, default));
        Assert.Null(await service.SaveAsync(user.Id, artifactContent.Id, default));
        Assert.Empty(db.SavedContents);
    }

    [Fact]
    public async Task SavedAlbumIsHiddenWhileInactiveAndReturnsOnRepublish()
    {
        await using var db = CreateContext();
        var user = NewUser();
        var album = new Album { Id = Guid.NewGuid(), Name = "Trip", Slug = "trip", IsActive = true };
        var content = new Content { Id = Guid.NewGuid(), ContentType = ContentType.Album, ContentRefId = album.Id,
            Title = album.Name, Slug = album.Slug, IsPublished = true };
        db.Users.Add(user);
        db.Albums.Add(album);
        db.Contents.Add(content);
        await db.SaveChangesAsync();
        var service = new SavedContentService(db);
        await service.SaveAsync(user.Id, content.Id, default);

        album.IsActive = false;
        content.IsPublished = false;
        await db.SaveChangesAsync();
        Assert.Null(await service.GetStatusAsync(user.Id, content.Id, default));
        Assert.Empty((await service.GetPageAsync(user.Id, null, 1, 20, default)).Items);
        album.IsActive = true;
        content.IsPublished = true;
        await db.SaveChangesAsync();
        Assert.True((await service.GetStatusAsync(user.Id, content.Id, default))?.IsSaved);
        Assert.Single((await service.GetPageAsync(user.Id, null, 1, 20, default)).Items);
        await service.RemoveAsync(user.Id, content.Id, default);
        Assert.Empty(db.SavedContents);
    }
}
