namespace JassSpace.Contracts.Requests;

public sealed record TrackAuthorInputRequest(
    Guid UserId,
    string? Role
);

public sealed record TrackLinkInputRequest(
    string Type,
    string Url,
    string Label,
    int? Order
);

public sealed record CreateTrackRequest(
    Guid? Id,
    string Title,
    string? Slug,
    string Description,
    string Category,
    string? Duration,
    DateTimeOffset ReleaseDate,
    string? Genre,
    List<string>? Tags,
    string? Cover,
    List<TrackAuthorInputRequest>? Authors,
    List<TrackLinkInputRequest>? Links,
    Guid? BootlegAssetId,
    bool Featured,
    bool IsPublished
);

public sealed record UpdateTrackRequest(
    string Title,
    string? Slug,
    string Description,
    string Category,
    string? Duration,
    DateTimeOffset ReleaseDate,
    string? Genre,
    List<string>? Tags,
    string? Cover,
    List<TrackAuthorInputRequest>? Authors,
    List<TrackLinkInputRequest>? Links,
    Guid? BootlegAssetId,
    bool Featured,
    bool IsPublished
);
