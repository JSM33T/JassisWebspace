namespace JassSpace.Contracts.Responses;

public record AlbumResponse(
    Guid Id,
    string Name,
    string Slug,
    string? Cover,
    string? Description,
    DateTimeOffset CreatedAt,
    DateTimeOffset? UpdatedAt,
    int ImageCount,
    List<ContentAuthorResponse> Authors,
    Guid? ContentId = null,
    bool IsActive = true,
    int SortOrder = 0
);

public record ImageResponse(
    Guid Id,
    Guid AlbumId,
    string Url,
    string? Title,
    string? Description,
    int Order,
    DateTimeOffset CreatedAt
);

public record AlbumWithImagesResponse(
    Guid Id,
    string Name,
    string Slug,
    string? Cover,
    string? Description,
    DateTimeOffset CreatedAt,
    DateTimeOffset? UpdatedAt,
    List<ImageResponse> Images,
    List<ContentAuthorResponse> Authors,
    Guid? ContentId = null,
    int LikeCount = 0,
    bool IsLiked = false,
    int CommentCount = 0,
    bool IsActive = true,
    int SortOrder = 0
);
