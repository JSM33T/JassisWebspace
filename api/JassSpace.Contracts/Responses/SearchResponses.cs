using JassSpace.Entities.Enums;

namespace JassSpace.Contracts.Responses;

public sealed record SearchResultItem(
    Guid ContentId,
    Guid ContentRefId,
    ContentType ContentType,
    string Title,
    string Slug,
    string? Headline,
    float Rank,
    DateTimeOffset? PublishedAt);

public sealed record SearchResponse(
    IReadOnlyList<SearchResultItem> Items,
    long Total,
    int Page,
    int PageSize);
