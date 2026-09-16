using JassSpace.Contracts.Interfaces;
using JassSpace.Contracts.Requests;
using JassSpace.Data;
using JassSpace.Entities;
using JassSpace.Infra;
using JassSpace.Services;
using Microsoft.EntityFrameworkCore;

namespace JassSpace.Tests.Services;

public sealed class AdminGalleryServiceTests
{
    [Fact]
    public async Task ReplacementPreservesIdentityAndUpdatesCoverReferences()
    {
        await using var db = CreateDb();
        var image = Seed(db);
        var content = new Content { Id = Guid.NewGuid(), Title = "Album", Slug = "album", Cover = image.Url };
        db.Contents.Add(content);
        await db.SaveChangesAsync();
        var created = image.CreatedAt;
        var storage = new Storage();
        var service = new AdminGalleryService(db, storage, new Processor());

        var result = await service.ReplaceImageAsync(image.Id, Input(), "https://example.test");

        Assert.Equal(AdminGalleryOperationStatus.Success, result.Status);
        Assert.Equal(image.Id, result.Image!.Id);
        Assert.Equal(created, image.CreatedAt);
        Assert.Equal("Original", image.Title);
        Assert.Equal(4, image.Order);
        Assert.NotEqual("https://example.test/media/images/old", image.Url);
        Assert.Equal(image.Url, image.Album.Cover);
        Assert.Equal(image.Url, content.Cover);
        Assert.Equal("gallery/images/old", Assert.Single(storage.Deleted));
    }

    [Fact]
    public async Task ReplacementSavesDetailsAndFileTogether()
    {
        await using var db = CreateDb();
        var image = Seed(db);
        await db.SaveChangesAsync();
        var storage = new Storage();
        var result = await new AdminGalleryService(db, storage, new Processor())
            .ReplaceImageAsync(image.Id, Input(), "https://example.test",
                new AdminGalleryUpdateImageRequest("New title", "", 9));

        Assert.Equal(AdminGalleryOperationStatus.Success, result.Status);
        Assert.Equal("New title", result.Image!.Title);
        Assert.Equal("", result.Image.Description);
        Assert.Equal(9, result.Image.Order);
        db.ChangeTracker.Clear();
        var saved = await db.Images.SingleAsync();
        Assert.Equal("New title", saved.Title);
        Assert.Equal("", saved.Description);
        Assert.Equal(9, saved.Order);
        Assert.NotEqual("https://example.test/media/images/old", saved.Url);
        Assert.Single(storage.Deleted);
    }

    [Fact]
    public async Task SharedImageBlobIsNotDeleted()
    {
        await using var db = CreateDb();
        var image = Seed(db);
        db.Images.Add(new Image { Id = Guid.NewGuid(), AlbumId = image.AlbumId, Url = image.Url });
        await db.SaveChangesAsync();
        var storage = new Storage();
        await new AdminGalleryService(db, storage, new Processor()).ReplaceImageAsync(image.Id, Input(), "https://example.test");
        Assert.Empty(storage.Deleted);
    }

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public async Task FailedProcessingOrUploadPreservesOriginal(bool processingFails)
    {
        await using var db = CreateDb();
        var image = Seed(db);
        await db.SaveChangesAsync();
        var oldUrl = image.Url;
        var storage = new Storage { FailUpload = !processingFails };
        var service = new AdminGalleryService(db, storage, new Processor { Fail = processingFails });
        if (processingFails)
            Assert.Equal(AdminGalleryOperationStatus.InvalidImage,
                (await service.ReplaceImageAsync(image.Id, Input(), "https://example.test")).Status);
        else
            await Assert.ThrowsAsync<IOException>(() => service.ReplaceImageAsync(image.Id, Input(), "https://example.test",
                new AdminGalleryUpdateImageRequest("Unsaved title", "", 99)));
        db.ChangeTracker.Clear();
        Assert.Equal(oldUrl, (await db.Images.SingleAsync()).Url);
        Assert.Empty(storage.Deleted);
    }

    [Fact]
    public async Task FailedDatabaseSaveKeepsOldBlobAndReference()
    {
        await using var db = CreateDb();
        var image = Seed(db);
        await db.SaveChangesAsync();
        var oldUrl = image.Url;
        var storage = new Storage { AfterUpload = () => db.FailSave = true };
        await Assert.ThrowsAsync<IOException>(() => new AdminGalleryService(db, storage, new Processor())
            .ReplaceImageAsync(image.Id, Input(), "https://example.test",
                new AdminGalleryUpdateImageRequest("Unsaved title", "", 99)));
        db.ChangeTracker.Clear();
        var saved = await db.Images.SingleAsync();
        Assert.Equal(oldUrl, saved.Url);
        Assert.Equal("Original", saved.Title);
        Assert.Equal("Description", saved.Description);
        Assert.Equal(4, saved.Order);
        Assert.Empty(storage.Deleted);
    }

    [Fact]
    public async Task CleanupFailureDoesNotFailCommittedReplacement()
    {
        await using var db = CreateDb();
        var image = Seed(db);
        await db.SaveChangesAsync();
        var result = await new AdminGalleryService(db, new Storage { FailDelete = true }, new Processor())
            .ReplaceImageAsync(image.Id, Input(), "https://example.test");
        Assert.Equal(AdminGalleryOperationStatus.Success, result.Status);
    }

    [Fact]
    public async Task MissingImageDoesNotUpload()
    {
        await using var db = CreateDb();
        var storage = new Storage();
        var result = await new AdminGalleryService(db, storage, new Processor())
            .ReplaceImageAsync(Guid.NewGuid(), Input(), "https://example.test");
        Assert.Equal(AdminGalleryOperationStatus.ImageNotFound, result.Status);
        Assert.Equal(0, storage.Uploads);
    }

    [Fact]
    public async Task MetadataCanBeClearedWithoutChangingFile()
    {
        await using var db = CreateDb();
        var image = Seed(db);
        await db.SaveChangesAsync();
        var oldUrl = image.Url;
        await new AdminGalleryService(db, new Storage(), new Processor()).UpdateImageAsync(image.Id, "", "", null);
        Assert.Equal("", image.Title);
        Assert.Equal("", image.Description);
        Assert.Equal(oldUrl, image.Url);
        Assert.Equal(4, image.Order);
    }

    private static TestDb CreateDb() => new(new DbContextOptionsBuilder<JassSpaceDbContext>()
        .UseInMemoryDatabase(Guid.NewGuid().ToString()).Options);
    private sealed class TestDb(DbContextOptions<JassSpaceDbContext> options) : JassSpaceDbContext(options)
    {
        public bool FailSave { get; set; }
        public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
            => FailSave ? throw new IOException("Save failed") : base.SaveChangesAsync(cancellationToken);
    }
    private static Image Seed(JassSpaceDbContext db)
    {
        var album = new Album { Id = Guid.NewGuid(), Name = "Album", Slug = "album", Cover = "https://example.test/media/images/old" };
        var image = new Image { Id = Guid.NewGuid(), Album = album, AlbumId = album.Id,
            Url = album.Cover, Title = "Original", Description = "Description", Order = 4, CreatedAt = DateTimeOffset.UtcNow };
        db.Images.Add(image);
        return image;
    }
    private static AdminMediaUploadInput Input() => new(new MemoryStream([1, 2, 3]), "new.png", null);
    private sealed class Processor : IImageProcessingService
    {
        public bool Fail { get; init; }
        public Task<Stream> ProcessImageAsync(Stream stream, CancellationToken cancellationToken = default)
            => Fail ? throw new InvalidDataException() : Task.FromResult<Stream>(new MemoryStream([4, 5, 6]));
        public Task<Stream> CreateThumbnailAsync(Stream stream, CancellationToken cancellationToken = default) => throw new NotSupportedException();
        public Task<Stream> CreateThumbnailFromFileAsync(string path, CancellationToken cancellationToken = default) => throw new NotSupportedException();
    }
    private sealed class Storage : IAzureBlobStorageService
    {
        public List<string> Deleted { get; } = [];
        public int Uploads { get; private set; }
        public bool FailUpload { get; init; }
        public bool FailDelete { get; init; }
        public Action? AfterUpload { get; init; }
        public Task<BlobUploadResult> UploadImageAsync(Stream stream, string fileName, string contentType, string? blobName = null, CancellationToken cancellationToken = default)
        {
            Uploads++;
            if (FailUpload) throw new IOException("Upload failed");
            AfterUpload?.Invoke();
            return Task.FromResult(new BlobUploadResult(blobName!, "", ""));
        }
        public Task DeleteBlobAsync(string blobName, CancellationToken cancellationToken = default)
        {
            if (FailDelete) throw new IOException("Delete failed");
            Deleted.Add(blobName);
            return Task.CompletedTask;
        }
        public Task<CachedImageResult?> GetImageAsync(string name, CancellationToken cancellationToken = default) => throw new NotSupportedException();
        public Task<CachedImageResult?> GetImageByUrlAsync(string url, CancellationToken cancellationToken = default) => throw new NotSupportedException();
        public Task<CachedImageResult?> GetThumbnailAsync(string name, CancellationToken cancellationToken = default) => throw new NotSupportedException();
        public Task DeleteBlobByUrlAsync(string url, CancellationToken cancellationToken = default) => throw new NotSupportedException();
        public Task EvictLocalCacheAsync(string name, CancellationToken cancellationToken = default) => throw new NotSupportedException();
        public Task<List<string>> ListBlobsByPrefixAsync(string prefix, CancellationToken cancellationToken = default) => throw new NotSupportedException();
    }
}
