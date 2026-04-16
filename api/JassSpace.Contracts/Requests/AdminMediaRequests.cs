namespace JassSpace.Contracts.Requests;

public sealed record AdminMediaUploadInput(
    Stream Content,
    string FileName,
    string? RequestedFileName = null
);

public sealed record AdminGalleryCreateAlbumWithImagesRequest(
    string Name,
    string? Slug,
    string? Description,
    bool? IsActive,
    int? SortOrder,
    List<Guid>? AuthorIds
);

public sealed record AdminGalleryUpdateAlbumRequest(
    string? Name,
    string? Slug,
    string? Description,
    DateTimeOffset? CreatedAt,
    bool? IsActive,
    int? SortOrder,
    List<Guid>? AuthorIds
);

public sealed record AdminGalleryImageUploadInput(
    Stream Content,
    string FileName,
    string? Title,
    string? Description,
    int? Order
);
