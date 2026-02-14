namespace JassSpace.Contracts.Responses;

public sealed record TrackAuthorResponse(
    Guid UserId,
    string Username,
    string? DisplayName,
    string? Role,
    int Order
);

public sealed record TrackLinkResponse(
    string Type,
    string Url,
    string Label,
    int Order
);

public sealed record TrackListItemResponse(
    Guid Id,
    Guid? ContentId,
    string Title,
    string Slug,
    string Description,
    List<TrackAuthorResponse> Authors,
    string Category,
    string? Duration,
    DateTimeOffset ReleaseDate,
    string? Genre,
    List<string> Tags,
    string? Cover,
    List<TrackLinkResponse> Links,
    bool Featured,
    bool IsPublished,
    DateTimeOffset? PublishedAt,
    DateTimeOffset CreatedAt,
    DateTimeOffset? UpdatedAt,
    bool HasPlayableSource,
    Guid? BootlegAssetId
);

public sealed record TrackDetailResponse(
    Guid Id,
    Guid? ContentId,
    string Title,
    string Slug,
    string Description,
    List<TrackAuthorResponse> Authors,
    string Category,
    string? Duration,
    DateTimeOffset ReleaseDate,
    string? Genre,
    List<string> Tags,
    string? Cover,
    List<TrackLinkResponse> Links,
    bool Featured,
    bool IsPublished,
    DateTimeOffset? PublishedAt,
    DateTimeOffset CreatedAt,
    DateTimeOffset? UpdatedAt,
    bool HasPlayableSource,
    Guid? BootlegAssetId,
    int LikeCount = 0,
    bool IsLiked = false,
    int CommentCount = 0
);

public sealed record TrackPlayLinkResponse(
    string StreamUrl,
    DateTimeOffset ExpiresAt
);
