namespace JassSpace.Contracts.Responses;

public record GalleryAuthorResponse(
    Guid UserId,
    string Username,
    string? DisplayName,
    int Order
);

public record AlbumResponse(
    Guid Id,
    string Name,
    string Slug,
    string? Cover,
    string? Description,
    DateTimeOffset CreatedAt,
    DateTimeOffset? UpdatedAt,
    int ImageCount,
    List<GalleryAuthorResponse> Authors,
    Guid? ContentId = null
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
    List<GalleryAuthorResponse> Authors,
    Guid? ContentId = null,
    int LikeCount = 0,
    bool IsLiked = false,
    int CommentCount = 0
);
