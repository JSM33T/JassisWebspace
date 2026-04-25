using JassSpace.Contracts.Interfaces;
using JassSpace.Contracts.Requests;
using JassSpace.Contracts.Responses;
using JassSpace.Data;
using Microsoft.EntityFrameworkCore;
using Npgsql.EntityFrameworkCore.PostgreSQL;

namespace JassSpace.Repositories;

public sealed class SearchRepository(JassSpaceDbContext db) : ISearchRepository
{
    private readonly JassSpaceDbContext _db = db;

    public async Task<(IReadOnlyList<SearchResultItem> Items, long Total)> SearchAsync(
        SearchRequest request,
        CancellationToken cancellationToken = default)
    {
        var q = request.Query;

        // Hybrid: full-text search OR word-similarity trigram match for partial/prefix queries.
        // word_similarity(query, text) > 0.3 catches "jav" → "javascript", "fuzz" → "fuzzy", etc.
        var baseQuery = _db.Contents
            .FromSqlInterpolated($"""
                SELECT * FROM "Contents"
                WHERE "IsPublished" = true
                AND (
                    "SearchVector" @@ websearch_to_tsquery('english', {q})
                    OR word_similarity({q}, "Title") > 0.3
                    OR word_similarity({q}, coalesce("Description", '')) > 0.25
                    OR word_similarity({q}, "Slug") > 0.3
                )
                """)
            .AsNoTracking();

        if (request.Types is { Length: > 0 })
            baseQuery = baseQuery.Where(c => request.Types.Contains(c.ContentType));

        var total = await baseQuery.LongCountAsync(cancellationToken);

        var page = Math.Max(1, request.Page);
        var pageSize = Math.Clamp(request.PageSize, 1, 100);

        var items = await baseQuery
            .OrderByDescending(c =>
                EF.Functions.TrigramsWordSimilarity(q, c.Title) * 3.0 +
                c.SearchVector.Rank(EF.Functions.WebSearchToTsQuery("english", q)) * 2.0 +
                EF.Functions.TrigramsWordSimilarity(q, c.Description ?? "") +
                EF.Functions.TrigramsWordSimilarity(q, c.Slug) * 0.5)
            .ThenByDescending(c => c.PublishedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(c => new SearchResultItem(
                c.Id,
                c.ContentRefId,
                c.ContentType,
                c.Title,
                c.Slug,
                EF.Functions.WebSearchToTsQuery("english", q)
                    .GetResultHeadline(
                        "english",
                        c.Title + " " + (c.SearchBody ?? ""),
                        "MaxFragments=1,MaxWords=20,MinWords=5"),
                (float)(EF.Functions.TrigramsWordSimilarity(q, c.Title) * 3.0 +
                    c.SearchVector.Rank(EF.Functions.WebSearchToTsQuery("english", q)) * 2.0),
                c.PublishedAt))
            .ToListAsync(cancellationToken);

        return (items, total);
    }
}
