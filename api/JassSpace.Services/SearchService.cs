using JassSpace.Contracts.Interfaces;
using JassSpace.Contracts.Requests;
using JassSpace.Contracts.Responses;

namespace JassSpace.Services;

public sealed class SearchService(ISearchRepository repo) : ISearchService
{
    private readonly ISearchRepository _repo = repo;

    public async Task<SearchResponse> SearchAsync(
        SearchRequest request,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.Query))
            return new SearchResponse([], 0, request.Page, request.PageSize);

        var (items, total) = await _repo.SearchAsync(request, cancellationToken);
        return new SearchResponse(items, total, request.Page, request.PageSize);
    }
}
