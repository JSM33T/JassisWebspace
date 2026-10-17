using Azure.Storage.Blobs;
using Azure.Storage.Blobs.Models;
using JassSpace.Infra.Configuration;
using Microsoft.Extensions.Options;

namespace JassSpace.Infra;

public sealed class ArtifactStorageService : IArtifactStorageService
{
    private readonly BlobContainerClient _container;
    public ArtifactStorageService(IOptions<AzureBlobStorageSettings> azure, IOptions<ArtifactSettings> artifacts)
    {
        var name = artifacts.Value.ContainerName;
        if (string.IsNullOrWhiteSpace(name) || string.Equals(name, azure.Value.ContainerName, StringComparison.OrdinalIgnoreCase))
            throw new InvalidOperationException("Artifacts require a separate private Azure container.");
        _container = new BlobServiceClient(azure.Value.ConnectionString).GetBlobContainerClient(name);
    }

    public async Task UploadAsync(string key, Stream source, CancellationToken ct)
    {
        await _container.CreateIfNotExistsAsync(PublicAccessType.None, cancellationToken: ct);
        var access = await _container.GetAccessPolicyAsync(cancellationToken: ct);
        if (access.Value.BlobPublicAccess != PublicAccessType.None)
            throw new InvalidOperationException("The artifact storage container must disable public access.");
        await _container.GetBlobClient(key).UploadAsync(source, new BlobUploadOptions
        {
            HttpHeaders = new BlobHttpHeaders { ContentType = "application/octet-stream" },
            Conditions = new Azure.Storage.Blobs.Models.BlobRequestConditions { IfNoneMatch = Azure.ETag.All }
        }, ct);
    }

    public async Task<bool> ExistsAsync(string key, CancellationToken ct) =>
        (await _container.GetBlobClient(key).ExistsAsync(ct)).Value;

    public Task<Stream> OpenReadAsync(string key, CancellationToken ct) =>
        _container.GetBlobClient(key).OpenReadAsync(new BlobOpenReadOptions(false), ct);

    public async Task DeleteAsync(string key, CancellationToken ct)
    {
        await _container.GetBlobClient(key).DeleteIfExistsAsync(cancellationToken: ct);
    }
}
