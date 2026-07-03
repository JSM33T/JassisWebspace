namespace JassSpace.Contracts.Requests;

public sealed record CreateDevelopmentSuggestionRequest(
    string Title,
    string Body);

public sealed record UpdateDevelopmentSuggestionStatusRequest(
    string Status);

public sealed record UpdateDevelopmentSuggestionRequest(
    string Title,
    string Body,
    string Status);

public sealed record PromoteDevelopmentSuggestionRequest(
    string? Title,
    string? Body);

public sealed record CreateDevelopmentNoteRequest(
    string Title,
    string Body,
    string? Version,
    string Category,
    bool IsPublished,
    DateTimeOffset? PublishedAt);

public sealed record UpdateDevelopmentNoteRequest(
    string Title,
    string Body,
    string? Version,
    string Category,
    bool IsPublished,
    DateTimeOffset? PublishedAt);
