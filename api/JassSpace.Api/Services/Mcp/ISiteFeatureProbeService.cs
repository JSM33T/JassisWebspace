namespace JassSpace.Api.Services;

public interface ISiteFeatureProbeService
{
    SiteFeatureProbeResult Probe(string query);
}

public sealed record SiteFeatureProbeResult(
    bool IsFeatureQuery,
    bool HasExactMatch,
    bool IsOverview,
    string Query,
    IReadOnlyList<SiteFeatureMatch> Matches
);

public sealed record SiteFeatureMatch(
    string Id,
    string Title,
    string Status,
    string Summary,
    IReadOnlyList<string> Highlights,
    IReadOnlyList<SiteFeatureLink> Links
);

public sealed record SiteFeatureLink(string Label, string Href);
