using JassSpace.Contracts.Responses;

namespace JassSpace.Contracts.Interfaces;

public interface IAdminContentService
{
    Task<List<AdminContentListItemResponse>> GetContentsAsync(
        string? contentType,
        string? sortBy,
        string? sortDir = "desc",
        DateTimeOffset? dateFrom = null,
        DateTimeOffset? dateTo = null,
        CancellationToken cancellationToken = default);

    Task<AdminContentDetailResponse?> GetContentAsync(
        Guid contentId,
        CancellationToken cancellationToken = default);

    Task<List<AdminContentSearchResultResponse>> SearchContentsAsync(
        string query,
        string? contentType = null,
        CancellationToken cancellationToken = default);
}
