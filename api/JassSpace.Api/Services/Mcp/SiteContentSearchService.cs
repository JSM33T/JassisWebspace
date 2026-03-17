using System.Text.RegularExpressions;
using JassSpace.Data;
using Microsoft.EntityFrameworkCore;

namespace JassSpace.Api.Services;

public sealed partial class SiteContentSearchService(
    JassSpaceDbContext dbContext,
    ILogger<SiteContentSearchService> logger)
    : ISiteContentSearchService
{
    private static readonly HashSet<string> StopWords =
    [
        "a", "an", "and", "are", "about", "any", "can", "do", "find", "for", "from",
        "gallery", "galleries", "have", "i", "image", "images", "in", "is", "it",
        "looking", "me", "my", "of", "on", "or", "photo", "photos", "post", "posts",
        "search", "show", "something", "that", "the", "to", "we", "with", "you"
    ];

    public async Task<IReadOnlyList<SiteContentSearchResult>> SearchAsync(
        string query,
        int maxResults = 5,
        CancellationToken cancellationToken = default)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(query);

        var normalizedQuery = Normalize(query);
        var queryTokens = Tokenize(normalizedQuery);
        if (queryTokens.Count == 0)
        {
            return [];
        }

        var blogEntries = await dbContext.Blogs
            .AsNoTracking()
            .Where(blog => blog.IsPublished)
            .Select(blog => new SearchCandidate(
                "Blog",
                blog.Title,
                $"/blog/{blog.Slug}",
                blog.Excerpt,
                blog.FeaturedImage,
                blog.PublishedAt,
                blog.CreatedAt))
            .ToListAsync(cancellationToken);

        var albumEntries = await dbContext.Albums
            .AsNoTracking()
            .Where(album => album.IsActive)
            .Select(album => new SearchCandidate(
                "Gallery",
                album.Name,
                $"/gallery/{album.Slug}",
                album.Description,
                album.Cover,
                album.UpdatedAt,
                album.CreatedAt))
            .ToListAsync(cancellationToken);

        var blogs = blogEntries
            .Select(entry => entry with { Meta = BuildMeta(entry.ContentType, entry.PrimaryDate, entry.FallbackDate) })
            .ToList();

        var albums = albumEntries
            .Select(entry => entry with { Meta = BuildMeta(entry.ContentType, entry.PrimaryDate, entry.FallbackDate) })
            .ToList();

        var rankedResults = blogs
            .Concat(albums)
            .Select(candidate => RankCandidate(candidate, normalizedQuery, queryTokens))
            .Where(result => result is not null)
            .Select(result => result!)
            .OrderByDescending(result => result.Score)
            .ThenBy(result => result.Title, StringComparer.OrdinalIgnoreCase)
            .Take(Math.Clamp(maxResults, 1, 10))
            .ToList();

        logger.LogInformation(
            "Site content search for query '{Query}' produced {ResultCount} result(s).",
            query,
            rankedResults.Count);

        return rankedResults;
    }

    private static SiteContentSearchResult? RankCandidate(
        SearchCandidate candidate,
        string normalizedQuery,
        IReadOnlyCollection<string> queryTokens)
    {
        var normalizedTitle = Normalize(candidate.Title);
        var normalizedSummary = Normalize(candidate.Summary);
        var titleTokens = Tokenize(normalizedTitle);
        var summaryTokens = Tokenize(normalizedSummary);

        var score = 0d;

        if (normalizedTitle.Contains(normalizedQuery, StringComparison.Ordinal))
        {
            score += 50d;
        }

        if (!string.IsNullOrWhiteSpace(normalizedSummary) &&
            normalizedSummary.Contains(normalizedQuery, StringComparison.Ordinal))
        {
            score += 20d;
        }

        foreach (var token in queryTokens)
        {
            if (titleTokens.Contains(token))
            {
                score += 12d;
                continue;
            }

            if (titleTokens.Any(titleToken =>
                    titleToken.Contains(token, StringComparison.Ordinal) ||
                    token.Contains(titleToken, StringComparison.Ordinal)))
            {
                score += 6d;
            }

            if (summaryTokens.Contains(token))
            {
                score += 5d;
                continue;
            }

            if (summaryTokens.Any(summaryToken =>
                    summaryToken.Contains(token, StringComparison.Ordinal) ||
                    token.Contains(summaryToken, StringComparison.Ordinal)))
            {
                score += 2d;
            }
        }

        score += JaccardSimilarity(queryTokens, titleTokens) * 20d;
        score += JaccardSimilarity(queryTokens, summaryTokens) * 10d;

        if (score <= 0d)
        {
            return null;
        }

        return new SiteContentSearchResult(
            candidate.ContentType,
            candidate.Title,
            candidate.Link,
            candidate.Summary,
            candidate.ThumbnailUrl,
            candidate.Meta,
            score);
    }

    private static string BuildMeta(
        string contentType,
        DateTimeOffset? primaryDate,
        DateTimeOffset fallbackDate)
    {
        var resolvedDate = primaryDate ?? fallbackDate;
        var formattedDate = resolvedDate.ToString("MMM d, yyyy");
        return contentType == "Blog"
            ? $"Blog | {formattedDate}"
            : $"Gallery | {formattedDate}";
    }

    private static double JaccardSimilarity(IReadOnlyCollection<string> left, IReadOnlyCollection<string> right)
    {
        if (left.Count == 0 || right.Count == 0)
        {
            return 0d;
        }

        var intersection = left.Intersect(right).Count();
        if (intersection == 0)
        {
            return 0d;
        }

        var union = left.Union(right).Count();
        return union == 0 ? 0d : (double)intersection / union;
    }

    private static HashSet<string> Tokenize(string value)
    {
        return new HashSet<string>(
            SearchTokenRegex()
                .Matches(value)
                .Select(match => match.Value)
                .Where(token => token.Length > 1 && !StopWords.Contains(token)),
            StringComparer.Ordinal);
    }

    private static string Normalize(string? value)
    {
        return string.IsNullOrWhiteSpace(value)
            ? string.Empty
            : value.Trim().ToLowerInvariant();
    }

    [GeneratedRegex("[a-z0-9]+", RegexOptions.Compiled)]
    private static partial Regex SearchTokenRegex();

    private sealed record SearchCandidate(
        string ContentType,
        string Title,
        string Link,
        string? Summary,
        string? ThumbnailUrl,
        DateTimeOffset? PrimaryDate,
        DateTimeOffset FallbackDate)
    {
        public string Meta { get; init; } = string.Empty;
    }
}
