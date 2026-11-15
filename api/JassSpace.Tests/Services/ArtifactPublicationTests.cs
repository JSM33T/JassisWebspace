using JassSpace.Contracts.Interfaces;
using JassSpace.Data;
using JassSpace.Entities;
using JassSpace.Entities.Enums;
using JassSpace.Infra;
using JassSpace.Infra.Configuration;
using JassSpace.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;

namespace JassSpace.Tests.Services;

public sealed class ArtifactPublicationTests
{
    [Fact]
    public async Task CatalogAndPublicDownloadRequirePublicationAndAReadyFile()
    {
        await using var db = new JassSpaceDbContext(new DbContextOptionsBuilder<JassSpaceDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString("N")).Options);
        var published = AddArtifact(db, "Public template", "Ready", true);
        var unpublished = AddArtifact(db, "Private template", "Ready", false);
        var pending = AddArtifact(db, "Pending template", "DeletionPending", true);
        await db.SaveChangesAsync();

        var storage = new TestStorage();
        var service = new ArtifactService(db, storage, new AnonymousAccess(), null!,
            Options.Create(new ArtifactSettings()), NullLogger<ArtifactService>.Instance);

        var catalog = await service.ListPublishedAsync("template", 1, 24, default);
        Assert.Equal(1, catalog.Total);
        var item = Assert.Single(catalog.Items);
        Assert.Equal(published.Id, item.Id);
        Assert.Equal(published.OriginalFileName, item.FileName);

        foreach (var id in new[] { unpublished.Id, pending.Id })
        {
            var error = await Assert.ThrowsAsync<ArtifactException>(() => service.OpenPublishedDownloadAsync(id, default));
            Assert.Equal(404, error.StatusCode);
        }
        Assert.Empty(storage.OpenedKeys);

        var file = await service.OpenPublishedDownloadAsync(published.Id, default);
        await using (file.Stream)
        {
            Assert.Equal(published.OriginalFileName, file.FileName);
            Assert.Equal(42, file.Stream.ReadByte());
        }
        Assert.Equal(published.StorageKey, Assert.Single(storage.OpenedKeys));

        published.Content.IsPublished = false;
        await db.SaveChangesAsync();
        Assert.Empty((await service.ListPublishedAsync(null, 1, 24, default)).Items);
        var removed = await Assert.ThrowsAsync<ArtifactException>(() => service.OpenPublishedDownloadAsync(published.Id, default));
        Assert.Equal(404, removed.StatusCode);
        Assert.Single(storage.OpenedKeys);
    }

    private static Artifact AddArtifact(JassSpaceDbContext db, string title, string state, bool published)
    {
        var id = Guid.NewGuid();
        var content = new Content
        {
            Id = Guid.NewGuid(),
            ContentType = ContentType.Artifact,
            ContentRefId = id,
            Title = title,
            Slug = $"artifact-{id:N}",
            IsPublished = published,
        };
        var artifact = new Artifact
        {
            Id = id,
            ContentId = content.Id,
            Content = content,
            Title = title,
            OriginalFileName = $"{title}.zip",
            StorageKey = $"artifacts/{id:N}",
            MediaType = "application/zip",
            SizeBytes = 1,
            State = state,
            PrivateNote = "Private fixture note",
        };
        db.Artifacts.Add(artifact);
        return artifact;
    }

    private sealed class AnonymousAccess : IArtifactAccessContext
    {
        public Guid? UserId => null;
        public bool IsAdmin => false;
        public bool CanManage => false;
    }

    private sealed class TestStorage : IArtifactStorageService
    {
        public List<string> OpenedKeys { get; } = [];

        public Task<bool> ExistsAsync(string key, CancellationToken ct) => Task.FromResult(true);

        public Task<Stream> OpenReadAsync(string key, CancellationToken ct)
        {
            OpenedKeys.Add(key);
            return Task.FromResult<Stream>(new MemoryStream([42]));
        }

        public Task UploadAsync(string key, Stream source, CancellationToken ct) => throw new NotSupportedException();
        public Task DeleteAsync(string key, CancellationToken ct) => throw new NotSupportedException();
    }
}
