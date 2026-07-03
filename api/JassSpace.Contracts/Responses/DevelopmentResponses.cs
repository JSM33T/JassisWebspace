using System.Text.Json.Serialization;

namespace JassSpace.Contracts.Responses;

public sealed record DevelopmentIssueResponse(
    int Number,
    string Title,
    string State,
    string Url,
    string? Body,
    IReadOnlyList<string> Labels,
    string? Milestone,
    string? Assignee,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt,
    DateTimeOffset? ClosedAt);

public sealed record DevelopmentReleaseResponse(
    long Id,
    string TagName,
    string Name,
    string? Body,
    string Url,
    bool IsDraft,
    bool IsPrerelease,
    DateTimeOffset CreatedAt,
    DateTimeOffset? PublishedAt);

public sealed record DevelopmentSuggestionResponse(
    Guid Id,
    string Title,
    string Body,
    string Status,
    Guid UserId,
    string Username,
    string? UserDisplayName,
    [property: JsonPropertyName("githubIssueNumber")]
    int? GitHubIssueNumber,
    [property: JsonPropertyName("githubIssueUrl")]
    string? GitHubIssueUrl,
    DateTimeOffset CreatedAt,
    DateTimeOffset? UpdatedAt,
    DateTimeOffset? ReviewedAt);

public sealed record DevelopmentNoteResponse(
    Guid Id,
    string Title,
    string Body,
    string? Version,
    string Category,
    bool IsPublished,
    DateTimeOffset? PublishedAt,
    DateTimeOffset CreatedAt,
    DateTimeOffset? UpdatedAt);

public sealed record DevelopmentSummaryResponse(
    int OpenIssueCount,
    int ClosedIssueCount,
    IReadOnlyList<DevelopmentIssueResponse> LatestIssues,
    IReadOnlyList<DevelopmentReleaseResponse> LatestReleases,
    IReadOnlyList<DevelopmentNoteResponse> Notes,
    IReadOnlyList<DevelopmentSuggestionResponse> Suggestions);

public sealed record DevelopmentReleasesWallResponse(
    IReadOnlyList<DevelopmentReleaseResponse> Releases,
    IReadOnlyList<DevelopmentNoteResponse> Notes);
