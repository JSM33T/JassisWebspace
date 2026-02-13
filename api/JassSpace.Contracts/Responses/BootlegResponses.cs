namespace JassSpace.Contracts.Responses;

public sealed record BootlegUploadResponse(
    Guid AssetId,
    string Folder,
    string FileName,
    string BlobName,
    long SizeBytes,
    string StreamUrl,
    string Token,
    DateTimeOffset ExpiresAt);

public sealed record BootlegLinkResponse(
    string StreamUrl,
    string Token,
    DateTimeOffset ExpiresAt);

public sealed record BootlegAssetResponse(
    Guid Id,
    string Folder,
    string FileName,
    string BlobName,
    string ContentType,
    long SizeBytes,
    DateTimeOffset CreatedAt,
    string StreamUrl,
    DateTimeOffset ExpiresAt);
