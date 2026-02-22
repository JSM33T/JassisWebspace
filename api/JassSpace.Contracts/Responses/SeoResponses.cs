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

public sealed record GallerySeoResponse(
    string Title,
    string Description,
    string CanonicalUrl,
    string? Image,
    List<string> Tags,
    string Type = "website",
    bool NoIndex = false
);
