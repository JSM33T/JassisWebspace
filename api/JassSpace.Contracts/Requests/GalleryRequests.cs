namespace JassSpace.Contracts.Requests;

public record CreateAlbumRequest(
    string Name,
    string? Description
);

public record AddImageToAlbumRequest(
    string Url,
    string? Title,
    string? Description,
    int Order
);
