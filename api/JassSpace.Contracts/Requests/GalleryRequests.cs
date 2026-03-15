namespace JassSpace.Contracts.Requests;

public record CreateAlbumRequest(
    string Name,
    string? Description,
    List<Guid>? AuthorIds,
    bool? IsActive = null,
    int? SortOrder = null
);

public record AddImageToAlbumRequest(
    string Url,
    string? Title,
    string? Description,
    int Order
);
