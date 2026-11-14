using System.Security.Claims;
using JassSpace.Api.Controllers;
using JassSpace.Contracts.Requests;
using JassSpace.Data;
using JassSpace.Entities;
using JassSpace.Entities.Enums;
using JassSpace.Infra;
using JassSpace.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;

namespace JassSpace.Tests.Services;

public sealed class AdminBlogServiceTests
{
    [Theory]
    [InlineData(false, false, false, 403)]
    [InlineData(false, false, true, 403)]
    [InlineData(false, true, true, 200)]
    [InlineData(true, false, false, 200)]
    public async Task ImageUploadRequiresBlogAccessOrStaffRole(
        bool isModerator, bool isAuthor, bool includeBlogId, int expectedStatus)
    {
        await using var db = CreateDb();
        var (blog, authorId) = await SeedBlogAsync(db);
        var storage = new Storage();
        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, (isAuthor ? authorId : Guid.NewGuid()).ToString())
        };
        if (isModerator)
        {
            claims.Add(new Claim(ClaimTypes.Role, "mod"));
        }

        var context = new DefaultHttpContext { User = new ClaimsPrincipal(new ClaimsIdentity(claims, "test")) };
        context.Request.Scheme = "https";
        context.Request.Host = new HostString("example.test");
        var controller = new AdminBlogController(new AdminBlogService(db, storage, storage),
            NullLogger<AdminBlogController>.Instance, null!)
        {
            ControllerContext = new ControllerContext { HttpContext = context }
        };
        using var input = new MemoryStream([1]);
        var file = new FormFile(input, 0, input.Length, "file", "photo.png");

        var result = await controller.UploadBlogImage(file, includeBlogId ? blog.Id : null);

        Assert.Equal(expectedStatus, Assert.IsAssignableFrom<ObjectResult>(result).StatusCode);
        if (expectedStatus == 200)
        {
            var upload = Assert.Single(storage.Uploads);
            Assert.StartsWith("blog/", upload.Name);
            Assert.True(Guid.TryParseExact(upload.Name["blog/".Length..], "N", out _));
            Assert.False(upload.Overwrite);
        }
        else
        {
            Assert.Empty(storage.Uploads);
        }
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task FailedSavePreservesBlogRelationsAndMedia(bool delete)
    {
        await using var db = CreateDb();
        var (blog, authorId) = await SeedBlogAsync(db);
        var storage = new Storage();
        var service = new AdminBlogService(db, storage, storage);
        db.FailSave = true;

        if (delete)
        {
            await Assert.ThrowsAsync<IOException>(() => service.DeleteBlogAsync(blog.Id));
        }
        else
        {
            var request = new UpdateBlogRequest("Edited", null, null, "", null, null, [], false);
            await Assert.ThrowsAsync<IOException>(() => service.UpdateBlogAsync(blog.Id, request, null, true));
        }

        db.ChangeTracker.Clear();
        Assert.Equal("Original", (await db.Blogs.SingleAsync()).Title);
        Assert.Equal("Original", (await db.Contents.SingleAsync()).Title);
        Assert.Equal(authorId, (await db.ContentAuthors.SingleAsync()).UserId);
        Assert.Single(await db.Comments.ToListAsync());
        Assert.Empty(storage.Deletions);
    }

    private static async Task<(Blog Blog, Guid AuthorId)> SeedBlogAsync(JassSpaceDbContext db)
    {
        var author = new User { Id = Guid.NewGuid(), Username = "author", Email = "author@example.test", PasswordHash = "test" };
        var blog = new Blog
        {
            Id = Guid.NewGuid(), Title = "Original", Slug = "original", Content = "Original body",
            FeaturedImage = "https://example.test/media/cover"
        };
        var content = new Content
        {
            Id = Guid.NewGuid(), Title = blog.Title, Slug = blog.Slug, ContentType = ContentType.Blog,
            ContentRefId = blog.Id, Cover = blog.FeaturedImage
        };
        db.AddRange(blog, content, author,
            new ContentAuthor { Id = Guid.NewGuid(), ContentId = content.Id, UserId = author.Id },
            new Comment { Id = Guid.NewGuid(), ContentId = content.Id, UserId = author.Id, Text = "Comment" });
        await db.SaveChangesAsync();
        db.ChangeTracker.Clear();
        return (blog, author.Id);
    }

    private static TestDb CreateDb() => new(new DbContextOptionsBuilder<JassSpaceDbContext>()
        .UseInMemoryDatabase(Guid.NewGuid().ToString()).Options);

    private sealed class TestDb(DbContextOptions<JassSpaceDbContext> options) : JassSpaceDbContext(options)
    {
        public bool FailSave { get; set; }

        public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
            => FailSave ? throw new IOException("Save failed") : base.SaveChangesAsync(cancellationToken);
    }

    private sealed class Storage : IAzureBlobStorageService, IImageProcessingService
    {
        public List<(string Name, bool Overwrite)> Uploads { get; } = [];
        public List<string> Deletions { get; } = [];

        public Task<BlobUploadResult> UploadImageAsync(Stream fileStream, string fileName, string contentType,
            string? blobName = null, CancellationToken cancellationToken = default, bool overwrite = true)
        {
            Uploads.Add((blobName!, overwrite));
            return Task.FromResult(new BlobUploadResult(blobName!, "", ""));
        }

        public Task DeleteBlobAsync(string blobName, CancellationToken cancellationToken = default)
        {
            Deletions.Add(blobName);
            return Task.CompletedTask;
        }

        public Task<Stream> ProcessImageAsync(Stream input, CancellationToken cancellationToken = default)
            => Task.FromResult<Stream>(new MemoryStream([1]));
        public Task<Stream> CreateThumbnailAsync(Stream input, CancellationToken cancellationToken = default) => throw new NotSupportedException();
        public Task<Stream> CreateThumbnailFromFileAsync(string path, CancellationToken cancellationToken = default) => throw new NotSupportedException();
        public Task<CachedImageResult?> GetImageAsync(string name, CancellationToken cancellationToken = default) => throw new NotSupportedException();
        public Task<CachedImageResult?> GetImageByUrlAsync(string url, CancellationToken cancellationToken = default) => throw new NotSupportedException();
        public Task<CachedImageResult?> GetThumbnailAsync(string name, CancellationToken cancellationToken = default) => throw new NotSupportedException();
        public Task DeleteBlobByUrlAsync(string url, CancellationToken cancellationToken = default) => throw new NotSupportedException();
        public Task EvictLocalCacheAsync(string name, CancellationToken cancellationToken = default) => throw new NotSupportedException();
        public Task<List<string>> ListBlobsByPrefixAsync(string prefix, CancellationToken cancellationToken = default) => throw new NotSupportedException();
    }
}
