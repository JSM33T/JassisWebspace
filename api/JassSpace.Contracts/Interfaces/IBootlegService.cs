namespace JassSpace.Contracts.Interfaces;

public sealed record BootlegUploadInfo(
    Guid AssetId,
    string Folder,
    string FileName,
    string BlobName,
    long SizeBytes);

public sealed record BootlegAssetListItem(
    Guid Id,
    string Folder,
    string FileName,
    string BlobName,
    string ContentType,
    long SizeBytes,
    DateTimeOffset CreatedAt);

public sealed record BootlegAssetPageResult(
    IReadOnlyCollection<BootlegAssetListItem> Items,
    int Page,
    int PageSize,
    int Total);

public enum BootlegLinkStatus
{
    Success,
    AssetNotFound
}

public sealed record BootlegLinkResult(
    BootlegLinkStatus Status,
    string? BlobName,
    string? ErrorMessage = null
);

public enum BootlegDeleteStatus
{
    Success,
    AssetNotFound
}

public sealed record BootlegDeleteResult(
    BootlegDeleteStatus Status,
    string? ErrorMessage = null
);

public enum BootlegStreamStatus
{
    Success,
    AudioNotFound
}

public sealed record BootlegStreamFileResult(
    BootlegStreamStatus Status,
    string? FilePath,
    string? ContentType,
    string? ErrorMessage = null
);

public interface IBootlegService
{
    Task<BootlegUploadInfo> UploadAudioAsync(
        Stream fileStream,
        string fileName,
        string contentType,
        long sizeBytes,
        string? folder,
        Guid? uploadedByUserId,
        CancellationToken cancellationToken = default);

    Task<BootlegAssetPageResult> GetAssetsAsync(
        string? folder,
        string? search,
        int page = 1,
        int pageSize = 20,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyCollection<string>> GetFoldersAsync(CancellationToken cancellationToken = default);

    Task<BootlegLinkResult> GenerateLinkAsync(
        Guid assetId,
        CancellationToken cancellationToken = default);

    Task<BootlegDeleteResult> DeleteAssetAsync(
        Guid assetId,
        CancellationToken cancellationToken = default);

    Task<BootlegStreamFileResult> GetStreamFileAsync(
        string blobName,
        CancellationToken cancellationToken = default);
}
