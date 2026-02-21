using System.Text.RegularExpressions;
using JassSpace.Api.Configuration;
using JassSpace.Api.Extensions;
using JassSpace.Api.Filters;
using JassSpace.Contracts;
using JassSpace.Contracts.Responses;
using JassSpace.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace JassSpace.Api.Controllers;

[Route("seo")]
[AllowAnonymous]
public sealed class SeoController(
    JassSpaceDbContext dbContext,
    IConfiguration configuration,
    ILogger<SeoController> logger) : BaseApiController
{
    private const string BlogBlobPrefix = "blog/";
    private const string MediaPathPrefix = "/media/";
    private const int MaxDescriptionLength = 180;

    [HttpGet("blog/{slug}")]
    [CachedResponse(RedisCacheKeys.BlogSeo, TtlSeconds = 600, Scope = CacheScope.Anonymous, VaryByQuery = false)]
    [ProducesResponseType(typeof(ApiResponse<BlogSeoResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetBlogSeo(string slug, CancellationToken cancellationToken = default)
    {
        try
        {
            var blog = await dbContext.Blogs
                .AsNoTracking()
                .Include(b => b.Category)
                .Where(b => b.Slug == slug && b.IsPublished)
                .Select(b => new
                {
                    b.Title,
                    b.Slug,
                    b.Excerpt,
                    b.Content,
                    b.FeaturedImage,
                    CategoryName = b.Category != null ? b.Category.Name : null
                })
                .FirstOrDefaultAsync(cancellationToken);

            if (blog is null)
            {
                return NotFoundProblem("Blog not found", $"No published blog found with slug '{slug}'.");
            }

            var tags = new List<string> { "blog", "article", "JassSpace" };
            if (!string.IsNullOrWhiteSpace(blog.CategoryName))
            {
                tags.Add(blog.CategoryName.Trim());
            }

            tags = tags
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .ToList();

            var response = new BlogSeoResponse(
                blog.Title,
                BuildDescription(blog.Excerpt, blog.Content),
                BuildCanonicalUrl(blog.Slug),
                NormalizeBlogMediaUrl(blog.FeaturedImage),
                tags,
                Type: "article",
                NoIndex: false);

            return OkEnvelope(response);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to build SEO payload for blog {Slug}", slug);
            return Problem(
                StatusCodes.Status500InternalServerError,
                "Failed to build SEO metadata",
                "An unexpected error occurred while preparing SEO metadata.");
        }
    }

    private string BuildCanonicalUrl(string slug)
    {
        var baseUrl = configuration.GetValue<string>("Frontend:BaseUrl");
        if (string.IsNullOrWhiteSpace(baseUrl))
        {
            baseUrl = $"{Request.Scheme}://{Request.Host}";
        }

        return $"{baseUrl.TrimEnd('/')}/blog/{Uri.EscapeDataString(slug)}";
    }

    private static string BuildDescription(string? excerpt, string content)
    {
        var source = !string.IsNullOrWhiteSpace(excerpt) ? excerpt : content;
        if (string.IsNullOrWhiteSpace(source))
        {
            return "Read this JassSpace blog article.";
        }

        var withoutHtml = Regex.Replace(source, "<[^>]+>", " ");
        var normalized = Regex.Replace(withoutHtml, @"\s+", " ").Trim();

        if (normalized.Length <= MaxDescriptionLength)
        {
            return normalized;
        }

        return $"{normalized[..(MaxDescriptionLength - 3)].Trim()}...";
    }

    private static string? NormalizeBlogMediaUrl(string? mediaUrl)
    {
        if (string.IsNullOrWhiteSpace(mediaUrl))
        {
            return mediaUrl;
        }

        var trimmed = mediaUrl.Trim();
        if (!MediaUrlHelper.TryExtractMediaBlobName(trimmed, out var blobName))
        {
            return trimmed;
        }

        var publicBlobName = StripBlogPrefix(blobName);

        if (Uri.TryCreate(trimmed, UriKind.Absolute, out var absolute))
        {
            return $"{absolute.Scheme}://{absolute.Authority}{MediaPathPrefix}{publicBlobName}";
        }

        return $"{MediaPathPrefix}{publicBlobName}";
    }

    private static string StripBlogPrefix(string blobName)
    {
        var normalized = blobName.Trim().TrimStart('/').Replace('\\', '/');
        return normalized.StartsWith(BlogBlobPrefix, StringComparison.OrdinalIgnoreCase)
            ? normalized[BlogBlobPrefix.Length..]
            : normalized;
    }
}
