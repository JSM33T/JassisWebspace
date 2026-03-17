namespace JassSpace.Api.Services;

public interface ISiteContentSearchService
{
    Task<IReadOnlyList<SiteContentSearchResult>> SearchAsync(
        string query,
        int maxResults = 5,
        CancellationToken cancellationToken = default);
}

public sealed record SiteContentSearchResult(
    string ContentType,
    string Title,
    string Link,
    string? Summary,
    string? ThumbnailUrl,
    string Meta,
    double Score
);
