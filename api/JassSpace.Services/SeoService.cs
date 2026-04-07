using System.Text.RegularExpressions;
using JassSpace.Contracts.Interfaces;
using JassSpace.Contracts.Responses;
using JassSpace.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;

namespace JassSpace.Services;

public sealed class SeoService(
    JassSpaceDbContext dbContext,
    IConfiguration configuration) : ISeoService
{
    private const string BlogBlobPrefix = "blog/";
    private const string GalleryBlobPrefix = "gallery/";
    private const string MediaPathPrefix = "/media/";
    private const int MaxDescriptionLength = 180;

    private readonly JassSpaceDbContext _dbContext = dbContext;
    private readonly IConfiguration _configuration = configuration;

    public async Task<BlogSeoResponse?> GetBlogSeoAsync(
        string slug,
        string requestBaseUrl,
        CancellationToken cancellationToken = default)
    {
        var blog = await _dbContext.Blogs
            .AsNoTracking()
            .Include(b => b.Category)
            .Where(b => b.Slug == slug && b.IsPublished)
            .Select(b => new
            {
                b.Id,
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
            return null;
        }

        var authorNames = await _dbContext.BlogAuthors
            .AsNoTracking()
            .Where(ba => ba.BlogId == blog.Id)
            .OrderBy(ba => ba.Order)
            .Select(ba => ba.User.DisplayName ?? ba.User.Username)
            .ToListAsync(cancellationToken);

        var authorLabel = BuildAuthorLabel(authorNames);
        var tags = new List<string> { "blog", "article", "JassSpace" };

        if (!string.IsNullOrWhiteSpace(blog.CategoryName))
        {
            tags.Add(blog.CategoryName.Trim());
        }

        tags = tags
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();

        return new BlogSeoResponse(
            AppendAuthorSuffix(blog.Title, authorLabel),
            AppendAuthorSuffix(
                BuildDescription(blog.Excerpt, blog.Content, "Read this JassSpace blog article."),
                authorLabel,
                MaxDescriptionLength),
            BuildCanonicalUrl("blog", blog.Slug, requestBaseUrl),
            NormalizeBlogMediaUrl(blog.FeaturedImage),
            tags,
            Type: "article",
            NoIndex: false);
    }

    public async Task<GallerySeoResponse?> GetGallerySeoAsync(
        string slug,
        string requestBaseUrl,
        CancellationToken cancellationToken = default)
    {
        var album = await _dbContext.Albums
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
            return null;
        }

        var image = NormalizeGalleryMediaUrl(album.Cover) ?? NormalizeGalleryMediaUrl(album.FirstImageUrl);

        return new GallerySeoResponse(
            album.Name,
            BuildDescription(album.Description, album.FirstImageDescription, "Explore this gallery album on JassSpace."),
            BuildCanonicalUrl("gallery", album.Slug, requestBaseUrl),
            image,
            ["gallery", "album", "images", "JassSpace"],
            Type: "website",
            NoIndex: false);
    }

    public async Task<MusicSeoResponse?> GetMusicSeoAsync(
        string slug,
        string requestBaseUrl,
        CancellationToken cancellationToken = default)
    {
        var track = await _dbContext.Tracks
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
            return null;
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

        return new MusicSeoResponse(
            track.Title,
            BuildDescription(track.Description, null, "Listen to this track on JassSpace."),
            BuildCanonicalUrl("music", track.Slug, requestBaseUrl),
            NormalizeMusicMediaUrl(track.Cover),
            tags,
            Type: "article",
            NoIndex: false);
    }

    private string BuildCanonicalUrl(string section, string slug, string requestBaseUrl)
    {
        var baseUrl = _configuration.GetValue<string>("Frontend:BaseUrl");
        if (string.IsNullOrWhiteSpace(baseUrl))
        {
            baseUrl = requestBaseUrl;
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

    private static string? BuildAuthorLabel(IEnumerable<string?> authorNames)
    {
        var names = authorNames
            .Where(name => !string.IsNullOrWhiteSpace(name))
            .Select(name => Regex.Replace(name!.Trim(), @"\s+", " "))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();

        return names.Count == 0 ? null : string.Join(", ", names);
    }

    private static string AppendAuthorSuffix(string value, string? authorLabel, int? maxLength = null)
    {
        if (string.IsNullOrWhiteSpace(authorLabel))
        {
            return value;
        }

        var suffix = $" | {authorLabel.Trim()}";
        if (!maxLength.HasValue || value.Length + suffix.Length <= maxLength.Value)
        {
            return $"{value}{suffix}";
        }

        var allowedValueLength = maxLength.Value - suffix.Length;
        if (allowedValueLength <= 0)
        {
            return TruncateText(authorLabel.Trim(), maxLength.Value);
        }

        return $"{TruncateText(value, allowedValueLength)}{suffix}";
    }

    private static string TruncateText(string value, int maxLength)
    {
        if (maxLength <= 0)
        {
            return string.Empty;
        }

        if (value.Length <= maxLength)
        {
            return value;
        }

        if (maxLength <= 3)
        {
            return value[..maxLength];
        }

        return $"{value[..(maxLength - 3)].Trim()}...";
    }

    private static string? NormalizeBlogMediaUrl(string? mediaUrl)
    {
        if (string.IsNullOrWhiteSpace(mediaUrl))
        {
            return mediaUrl;
        }

        var trimmed = mediaUrl.Trim();
        if (!TryExtractMediaBlobName(trimmed, out var blobName))
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
        if (!TryExtractMediaBlobName(trimmed, out var blobName))
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
        if (!TryExtractMediaBlobName(trimmed, out var blobName))
        {
            return trimmed;
        }

        if (Uri.TryCreate(trimmed, UriKind.Absolute, out var absolute))
        {
            return $"{absolute.Scheme}://{absolute.Authority}{MediaPathPrefix}{blobName}";
        }

        return $"{MediaPathPrefix}{blobName}";
    }

    private static bool TryExtractMediaBlobName(string urlOrPath, out string blobName)
    {
        blobName = string.Empty;
        if (string.IsNullOrWhiteSpace(urlOrPath))
        {
            return false;
        }

        const string marker = "/media/";
        if (Uri.TryCreate(urlOrPath, UriKind.Absolute, out var absolute))
        {
            var path = absolute.AbsolutePath;
            var index = path.IndexOf(marker, StringComparison.OrdinalIgnoreCase);
            if (index == -1)
            {
                return false;
            }

            var candidate = path[(index + marker.Length)..];
            if (string.IsNullOrWhiteSpace(candidate))
            {
                return false;
            }

            blobName = candidate;
            return true;
        }

        var relativeIndex = urlOrPath.IndexOf(marker, StringComparison.OrdinalIgnoreCase);
        if (relativeIndex == -1)
        {
            return false;
        }

        var relativeCandidate = urlOrPath[(relativeIndex + marker.Length)..];
        if (string.IsNullOrWhiteSpace(relativeCandidate))
        {
            return false;
        }

        blobName = relativeCandidate;
        return true;
    }
}
