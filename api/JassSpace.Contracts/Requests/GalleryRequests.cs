namespace JassSpace.Contracts.Requests;

public record CreateAlbumRequest(
    string Name,
    string? Description,
    List<Guid>? AuthorIds
);

public record AddImageToAlbumRequest(
    string Url,
    string? Title,
    string? Description,
    int Order
);
