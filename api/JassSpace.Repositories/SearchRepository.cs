using JassSpace.Contracts.Interfaces;
using JassSpace.Contracts.Requests;
using JassSpace.Contracts.Responses;
using JassSpace.Data;
using Microsoft.EntityFrameworkCore;

namespace JassSpace.Repositories;

public sealed class SearchRepository(JassSpaceDbContext db) : ISearchRepository
{
    private readonly JassSpaceDbContext _db = db;

    public async Task<(IReadOnlyList<SearchResultItem> Items, long Total)> SearchAsync(
        SearchRequest request,
        CancellationToken cancellationToken = default)
    {
        var queryText = request.Query;

        var baseQuery = _db.Contents
            .AsNoTracking()
            .Where(c => c.IsPublished &&
                        c.SearchVector.Matches(EF.Functions.WebSearchToTsQuery("english", queryText)));

        if (request.Types is { Length: > 0 })
            baseQuery = baseQuery.Where(c => request.Types.Contains(c.ContentType));

        var total = await baseQuery.LongCountAsync(cancellationToken);

        var page = Math.Max(1, request.Page);
        var pageSize = Math.Clamp(request.PageSize, 1, 100);

        var items = await baseQuery
            .OrderByDescending(c => c.SearchVector.Rank(EF.Functions.WebSearchToTsQuery("english", queryText)))
            .ThenByDescending(c => c.PublishedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(c => new SearchResultItem(
                c.Id,
                c.ContentRefId,
                c.ContentType,
                c.Title,
                c.Slug,
                EF.Functions.WebSearchToTsQuery("english", queryText)
                    .GetResultHeadline(
                        "english",
                        c.Title + " " + (c.SearchBody ?? ""),
                        "MaxFragments=1,MaxWords=20,MinWords=5"),
                (float)c.SearchVector.Rank(EF.Functions.WebSearchToTsQuery("english", queryText)),
                c.PublishedAt))
            .ToListAsync(cancellationToken);

        return (items, total);
    }
}
