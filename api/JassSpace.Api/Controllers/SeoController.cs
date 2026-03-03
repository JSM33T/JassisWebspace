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
    private const string GalleryBlobPrefix = "gallery/";
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
                BuildDescription(blog.Excerpt, blog.Content, "Read this JassSpace blog article."),
                BuildCanonicalUrl("blog", blog.Slug),
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

    [HttpGet("gallery/{slug}")]
    [CachedResponse(RedisCacheKeys.GallerySeo, TtlSeconds = 600, Scope = CacheScope.Anonymous, VaryByQuery = false)]
    [ProducesResponseType(typeof(ApiResponse<GallerySeoResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetGallerySeo(string slug, CancellationToken cancellationToken = default)
    {
        try
        {
            var album = await dbContext.Albums
                .AsNoTracking()
                .Where(a => a.Slug == slug && a.IsActive)
                .Select(a => new
                {
                    a.Name,
                    a.Slug,
                    a.Description,
                    a.Cover,
                    FirstImageUrl = a.Images
                        .OrderBy(i => i.Order)
                        .Select(i => i.Url)
                        .FirstOrDefault(),
                    FirstImageDescription = a.Images
                        .OrderBy(i => i.Order)
                        .Select(i => i.Description)
                        .FirstOrDefault()
                })
                .FirstOrDefaultAsync(cancellationToken);

            if (album is null)
            {
                return NotFoundProblem("Album not found", $"No active gallery album found with slug '{slug}'.");
            }

            var image = NormalizeGalleryMediaUrl(album.Cover) ?? NormalizeGalleryMediaUrl(album.FirstImageUrl);

            var response = new GallerySeoResponse(
                album.Name,
                BuildDescription(album.Description, album.FirstImageDescription, "Explore this gallery album on JassSpace."),
                BuildCanonicalUrl("gallery", album.Slug),
                image,
                new List<string> { "gallery", "album", "images", "JassSpace" },
                Type: "website",
                NoIndex: false);

            return OkEnvelope(response);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to build SEO payload for gallery {Slug}", slug);
            return Problem(
                StatusCodes.Status500InternalServerError,
                "Failed to build SEO metadata",
                "An unexpected error occurred while preparing SEO metadata.");
        }
    }

    [HttpGet("music/{slug}")]
    [CachedResponse(RedisCacheKeys.MusicSeo, TtlSeconds = 600, Scope = CacheScope.Anonymous, VaryByQuery = false)]
    [ProducesResponseType(typeof(ApiResponse<MusicSeoResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetMusicSeo(string slug, CancellationToken cancellationToken = default)
    {
        try
        {
            var track = await dbContext.Tracks
                .AsNoTracking()
                .Where(t => t.Slug == slug && t.IsPublished)
                .Select(t => new
                {
                    t.Title,
                    t.Slug,
                    t.Description,
                    t.Cover,
                    t.Category,
                    t.Genre,
                    t.Tags
                })
                .FirstOrDefaultAsync(cancellationToken);

            if (track is null)
            {
                return NotFoundProblem("Track not found", $"No published track found with slug '{slug}'.");
            }

            var tags = new List<string> { "music", "track", "audio", "JassSpace", track.Category };
            if (!string.IsNullOrWhiteSpace(track.Genre))
            {
                tags.Add(track.Genre.Trim());
            }

            if (track.Tags is { Length: > 0 })
            {
                tags.AddRange(track.Tags.Where(tag => !string.IsNullOrWhiteSpace(tag)));
            }

            tags = tags
                .Select(tag => tag.Trim())
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .ToList();

            var response = new MusicSeoResponse(
                track.Title,
                BuildDescription(track.Description, null, "Listen to this track on JassSpace."),
                BuildCanonicalUrl("music", track.Slug),
                NormalizeMusicMediaUrl(track.Cover),
                tags,
                Type: "article",
                NoIndex: false);

            return OkEnvelope(response);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to build SEO payload for music track {Slug}", slug);
            return Problem(
                StatusCodes.Status500InternalServerError,
                "Failed to build SEO metadata",
                "An unexpected error occurred while preparing SEO metadata.");
        }
    }

    private string BuildCanonicalUrl(string section, string slug)
    {
        var baseUrl = configuration.GetValue<string>("Frontend:BaseUrl");
        if (string.IsNullOrWhiteSpace(baseUrl))
        {
            baseUrl = $"{Request.Scheme}://{Request.Host}";
        }

        return $"{baseUrl.TrimEnd('/')}/{section}/{Uri.EscapeDataString(slug)}";
    }

    private static string BuildDescription(string? primary, string? secondary, string fallback)
    {
        var source = !string.IsNullOrWhiteSpace(primary) ? primary : secondary;
        if (string.IsNullOrWhiteSpace(source))
        {
            return fallback;
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

    private static string? NormalizeGalleryMediaUrl(string? mediaUrl)
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

        var publicBlobName = StripGalleryPrefix(blobName);

        if (Uri.TryCreate(trimmed, UriKind.Absolute, out var absolute))
        {
            return $"{absolute.Scheme}://{absolute.Authority}{MediaPathPrefix}{publicBlobName}";
        }

        return $"{MediaPathPrefix}{publicBlobName}";
    }

    private static string StripGalleryPrefix(string blobName)
    {
        var normalized = blobName.Trim().TrimStart('/').Replace('\\', '/');
        return normalized.StartsWith(GalleryBlobPrefix, StringComparison.OrdinalIgnoreCase)
            ? normalized[GalleryBlobPrefix.Length..]
            : normalized;
    }

    private static string? NormalizeMusicMediaUrl(string? mediaUrl)
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

        if (Uri.TryCreate(trimmed, UriKind.Absolute, out var absolute))
        {
            return $"{absolute.Scheme}://{absolute.Authority}{MediaPathPrefix}{blobName}";
        }

        return $"{MediaPathPrefix}{blobName}";
    }
}
