using JassSpace.Contracts.Requests;
using JassSpace.Contracts.Responses;

namespace JassSpace.Contracts.Interfaces;

public interface ISearchService
{
    Task<SearchResponse> SearchAsync(
        SearchRequest request,
        CancellationToken cancellationToken = default);
}
