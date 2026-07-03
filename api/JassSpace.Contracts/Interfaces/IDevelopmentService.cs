using JassSpace.Contracts.Requests;
using JassSpace.Contracts.Responses;

namespace JassSpace.Contracts.Interfaces;

public static class DevelopmentSuggestionStatuses
{
    public const string Pending = "pending";
    public const string Approved = "approved";
    public const string Rejected = "rejected";
    public const string Archived = "archived";
    public const string Promoted = "promoted";

    public static readonly IReadOnlySet<string> All = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
    {
        Pending,
        Approved,
        Rejected,
        Archived,
        Promoted
    };
}

public enum DevelopmentMutationStatus
{
    Success,
    InvalidTitle,
    InvalidBody,
    InvalidStatus,
    InvalidCategory,
    NotFound,
    GitHubUnavailable,
    AlreadyPromoted
}

public sealed record DevelopmentMutationResult<T>(
    DevelopmentMutationStatus Status,
    T? Response = default,
    string? ErrorMessage = null);

public interface IDevelopmentService
{
    Task<DevelopmentSummaryResponse> GetSummaryAsync(CancellationToken cancellationToken = default);

    Task<IReadOnlyList<DevelopmentIssueResponse>> GetIssuesAsync(
        string? state,
        string? label,
        string? milestone,
        string? search,
        int page = 1,
        int pageSize = 20,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<DevelopmentReleaseResponse>> GetReleasesAsync(
        int page = 1,
        int pageSize = 10,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<DevelopmentSuggestionResponse>> GetPublicSuggestionsAsync(
        int page = 1,
        int pageSize = 20,
        CancellationToken cancellationToken = default);

    Task<DevelopmentMutationResult<DevelopmentSuggestionResponse>> CreateSuggestionAsync(
        Guid userId,
        CreateDevelopmentSuggestionRequest request,
        CancellationToken cancellationToken = default);

    Task<(IReadOnlyCollection<DevelopmentSuggestionResponse> Items, int Page, int PageSize, int Total)> GetAdminSuggestionsAsync(
        string? status,
        int page = 1,
        int pageSize = 20,
        CancellationToken cancellationToken = default);

    Task<DevelopmentMutationResult<DevelopmentSuggestionResponse>> UpdateSuggestionStatusAsync(
        Guid id,
        Guid reviewedByUserId,
        UpdateDevelopmentSuggestionStatusRequest request,
        CancellationToken cancellationToken = default);

    Task<DevelopmentMutationResult<DevelopmentSuggestionResponse>> UpdateSuggestionAsync(
        Guid id,
        Guid reviewedByUserId,
        UpdateDevelopmentSuggestionRequest request,
        CancellationToken cancellationToken = default);

    Task<DevelopmentMutationResult<DevelopmentSuggestionResponse>> PromoteSuggestionAsync(
        Guid id,
        Guid reviewedByUserId,
        PromoteDevelopmentSuggestionRequest request,
        CancellationToken cancellationToken = default);

    Task<DevelopmentMutationResult<DevelopmentSuggestionResponse>> ClosePromotedIssueAsync(
        Guid id,
        Guid reviewedByUserId,
        CancellationToken cancellationToken = default);

    Task<DevelopmentMutationResult<bool>> DeleteSuggestionAsync(
        Guid id,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<DevelopmentNoteResponse>> GetNotesAsync(
        bool publicOnly,
        int page = 1,
        int pageSize = 20,
        CancellationToken cancellationToken = default);

    Task<DevelopmentMutationResult<DevelopmentNoteResponse>> CreateNoteAsync(
        Guid createdByUserId,
        CreateDevelopmentNoteRequest request,
        CancellationToken cancellationToken = default);

    Task<DevelopmentMutationResult<DevelopmentNoteResponse>> UpdateNoteAsync(
        Guid id,
        UpdateDevelopmentNoteRequest request,
        CancellationToken cancellationToken = default);

    Task<DevelopmentMutationResult<bool>> DeleteNoteAsync(
        Guid id,
        CancellationToken cancellationToken = default);
}
