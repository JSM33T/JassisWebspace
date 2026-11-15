namespace JassSpace.Contracts.Responses;

public sealed record ArtifactListItemResponse(Guid Id, Guid ContentId, string Title, string OriginalFileName,
    string MediaType, long SizeBytes, Guid? OwnerUserId, string? OwnerName, DateTimeOffset CreatedAt,
    DateTimeOffset? UpdatedAt, int ActiveLinkCount, int TotalDownloads, bool IsPublished);
public sealed record ArtifactPageResponse(IReadOnlyList<ArtifactListItemResponse> Items, int Total,
    int Page, int PageSize, long MaxUploadBytes, long OwnerQuotaBytes, IReadOnlyList<ArtifactOwnerResponse> Owners);
public sealed record ArtifactOwnerResponse(Guid Id, string Name);
public sealed record ArtifactLinkResponse(Guid Id, DateTimeOffset? ExpiresAt, int? MaxDownloads,
    int DownloadCount, DateTimeOffset? RevokedAt, DateTimeOffset CreatedAt, string Status);
public sealed record ArtifactDetailResponse(ArtifactListItemResponse Artifact, string? PrivateNote,
    IReadOnlyList<ArtifactLinkResponse> Links, long MaxUploadBytes, ArtifactListingResponse Listing);
public sealed record ArtifactListingResponse(string? Description, string? Body, string? Category, string[] Tags, bool HasCover);
public sealed record ArtifactCreatedLinkResponse(ArtifactLinkResponse Link, string Token);
public sealed record ArtifactPublicResponse(string Title, string FileName, long SizeBytes,
    DateTimeOffset? ExpiresAt, int? RemainingDownloads);
public sealed record ArtifactRedeemResponse(string GrantToken, DateTimeOffset ExpiresAt);
public sealed record PublicArtifactItemResponse(Guid Id, string Title, string FileName, long SizeBytes,
    string? Description, string? Category, string[] Tags, bool HasCover);
public sealed record PublicArtifactDetailResponse(PublicArtifactItemResponse Artifact, string? Body);
public sealed record PublicArtifactPageResponse(IReadOnlyList<PublicArtifactItemResponse> Items, int Total, int Page, int PageSize,
    IReadOnlyList<string> Categories);
