namespace JassSpace.Infra;

public interface IArtifactStorageService
{
    Task UploadAsync(string key, Stream source, CancellationToken ct);
    Task<bool> ExistsAsync(string key, CancellationToken ct);
    Task<Stream> OpenReadAsync(string key, CancellationToken ct);
    Task DeleteAsync(string key, CancellationToken ct);
}
