namespace JassSpace.Contracts.Responses;

public sealed record BlogSeoResponse(
    string Title,
    string Description,
    string CanonicalUrl,
    string? Image,
    List<string> Tags,
    string Type = "article",
    bool NoIndex = false
);
