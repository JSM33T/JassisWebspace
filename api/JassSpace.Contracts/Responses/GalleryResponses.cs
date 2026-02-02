namespace JassSpace.Contracts.Responses;

public record AlbumResponse(
    Guid Id,
    string Name,
    string Slug,
    string? Cover,
    string? Description,
    DateTimeOffset CreatedAt,
    DateTimeOffset? UpdatedAt,
    int ImageCount
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
    List<ImageResponse> Images
);
