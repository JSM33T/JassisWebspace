namespace JassSpace.Contracts.Responses;

public sealed record SavedContentStatusResponse(Guid ContentId, bool IsSaved, DateTimeOffset? SavedAt);

public sealed record SavedContentItemResponse(
    Guid ContentId,
    string ContentType,
    string Title,
    string? Description,
    string? Cover,
    string Href,
    DateTimeOffset SavedAt);

public sealed record SavedContentPageResponse(IReadOnlyList<SavedContentItemResponse> Items, int Page, int PageSize, int Total);
