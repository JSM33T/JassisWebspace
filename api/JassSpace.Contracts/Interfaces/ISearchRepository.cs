using JassSpace.Contracts.Requests;
using JassSpace.Contracts.Responses;

namespace JassSpace.Contracts.Interfaces;

public interface ISearchRepository
{
    Task<(IReadOnlyList<SearchResultItem> Items, long Total)> SearchAsync(
        SearchRequest request,
        CancellationToken cancellationToken = default);
}
