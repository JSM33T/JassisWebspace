using System.Text.RegularExpressions;
using JassSpace.Contracts.Interfaces;
using JassSpace.Contracts.Requests;
using JassSpace.Contracts.Responses;
using JassSpace.Data;
using JassSpace.Entities;
using JassSpace.Entities.Enums;
using Microsoft.EntityFrameworkCore;

namespace JassSpace.Services;

public sealed class BlogService(JassSpaceDbContext dbContext) : IBlogService
{
    private const string BlogBlobPrefix = "blog/";
    private const string MediaPathPrefix = "/media/";

    private readonly JassSpaceDbContext _dbContext = dbContext;

    public async Task<List<BlogListItemResponse>> GetBlogsAsync(
        string? search,
        DateTimeOffset? startDate,
        DateTimeOffset? endDate,
        Guid? categoryId,
        string? authorUsername,
        int page = 1,
        int pageSize = 10,
        CancellationToken cancellationToken = default)
    {
        NormalizePagination(ref page, ref pageSize);

        var query = BuildPublishedBlogQuery(search, startDate, endDate, categoryId, authorUsername);
        return await LoadBlogListPageAsync(query, page, pageSize, cancellationToken);
    }

    public async Task<BlogDetailResponse?> GetBlogBySlugAsync(
        string slug,
        Guid? currentUserId = null,
        CancellationToken cancellationToken = default)
    {
        var normalizedSlug = slug?.Trim();
        if (string.IsNullOrWhiteSpace(normalizedSlug))
        {
            return null;
        }

        var projection = await _dbContext.Blogs
            .AsNoTracking()
            .Where(b => b.Slug == normalizedSlug)
            .Select(b => new BlogDetailProjection(
                b.Id,
                b.Title,
                b.Slug,
                b.Excerpt,
                b.Content,
                b.FeaturedImage,
                b.Category != null
                    ? new BlogCategoryResponse(
                        b.Category.Id,
                        b.Category.Name,
                        b.Category.Slug,
                        b.Category.Description,
                        b.Category.CreatedAt,
                        b.Category.UpdatedAt)
                    : null,
                b.Authors
                    .OrderBy(ba => ba.Order)
                    .Select(ba => new BlogAuthorResponse(
                        ba.UserId,
                        ba.User.Username,
                        ba.User.DisplayName,
                        ba.Order))
                    .ToList(),
                b.IsPublished,
                b.PublishedAt,
                b.CreatedAt,
                b.UpdatedAt))
            .FirstOrDefaultAsync(cancellationToken);

        if (projection is null)
        {
            return null;
        }

        var contentId = await _dbContext.Contents
            .AsNoTracking()
            .Where(c => c.ContentType == ContentType.Blog && c.ContentRefId == projection.Id)
            .Select(c => (Guid?)c.Id)
            .FirstOrDefaultAsync(cancellationToken);

        var likeCount = 0;
        var commentCount = 0;
        var isLiked = false;

        if (contentId.HasValue)
        {
            likeCount = await _dbContext.Likes
                .AsNoTracking()
                .CountAsync(l => l.ContentId == contentId.Value, cancellationToken);

            commentCount = await _dbContext.Comments
                .AsNoTracking()
                .CountAsync(c => c.ContentId == contentId.Value && !c.IsDeleted, cancellationToken);

            if (currentUserId.HasValue)
            {
                isLiked = await _dbContext.Likes
                    .AsNoTracking()
                    .AnyAsync(l => l.ContentId == contentId.Value && l.UserId == currentUserId.Value, cancellationToken);
            }
        }

        return new BlogDetailResponse(
            projection.Id,
            contentId ?? Guid.Empty,
            projection.Title,
            projection.Slug,
            projection.Excerpt,
            projection.Content,
            NormalizeBlogMediaUrl(projection.FeaturedImage),
            projection.Category,
            projection.Authors,
            projection.IsPublished,
            projection.PublishedAt,
            projection.CreatedAt,
            projection.UpdatedAt,
            likeCount,
            isLiked,
            commentCount);
    }

    public async Task<List<BlogCategoryResponse>> GetCategoriesAsync(CancellationToken cancellationToken = default)
    {
        return await _dbContext.BlogCategories
            .AsNoTracking()
            .OrderBy(c => c.Name)
            .Select(c => new BlogCategoryResponse(
                c.Id,
                c.Name,
                c.Slug,
                c.Description,
                c.CreatedAt,
                c.UpdatedAt))
            .ToListAsync(cancellationToken);
    }

    public async Task<BlogCategoryBlogsResult> GetBlogsByCategoryAsync(
        string categorySlug,
        int page = 1,
        int pageSize = 10,
        CancellationToken cancellationToken = default)
    {
        NormalizePagination(ref page, ref pageSize);

        var normalizedCategorySlug = categorySlug?.Trim();
        if (string.IsNullOrWhiteSpace(normalizedCategorySlug))
        {
            return new BlogCategoryBlogsResult(
                BlogCategoryQueryStatus.CategoryNotFound,
                [],
                "No category found with the supplied slug.");
        }

        var category = await _dbContext.BlogCategories
            .AsNoTracking()
            .FirstOrDefaultAsync(c => c.Slug == normalizedCategorySlug, cancellationToken);

        if (category is null)
        {
            return new BlogCategoryBlogsResult(
                BlogCategoryQueryStatus.CategoryNotFound,
                [],
                $"No category found with slug '{normalizedCategorySlug}'.");
        }

        var query = _dbContext.Blogs
            .AsNoTracking()
            .Where(b => b.IsPublished && b.CategoryId == category.Id);

        var blogs = await LoadBlogListPageAsync(query, page, pageSize, cancellationToken);
        return new BlogCategoryBlogsResult(BlogCategoryQueryStatus.Success, blogs);
    }

    public async Task<BlogCreateResult> CreateBlogAsync(
        CreateBlogRequest request,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.Title))
        {
            return new BlogCreateResult(
                BlogCreateStatus.InvalidTitle,
                null,
                "Blog title cannot be empty.");
        }

        if (string.IsNullOrWhiteSpace(request.Content))
        {
            return new BlogCreateResult(
                BlogCreateStatus.InvalidContent,
                null,
                "Blog content cannot be empty.");
        }

        if (request.CategoryId.HasValue)
        {
            var categoryExists = await _dbContext.BlogCategories
                .AnyAsync(c => c.Id == request.CategoryId.Value, cancellationToken);

            if (!categoryExists)
            {
                return new BlogCreateResult(
                    BlogCreateStatus.InvalidCategory,
                    null,
                    $"No category found with ID '{request.CategoryId.Value}'.");
            }
        }

        if (request.AuthorIds is { Count: > 0 })
        {
            var validAuthorIds = await _dbContext.Users
                .Where(u => request.AuthorIds.Contains(u.Id))
                .Select(u => u.Id)
                .ToListAsync(cancellationToken);

            if (validAuthorIds.Count != request.AuthorIds.Count)
            {
                return new BlogCreateResult(
                    BlogCreateStatus.InvalidAuthors,
                    null,
                    "One or more author IDs are invalid.");
            }
        }

        var slug = await GenerateUniqueBlogSlugAsync(request.Title, cancellationToken);
        var now = DateTimeOffset.UtcNow;
        var blog = new Blog
        {
            Id = Guid.NewGuid(),
            Title = request.Title.Trim(),
            Slug = slug,
            Excerpt = request.Excerpt,
            Content = request.Content,
            FeaturedImage = NormalizeBlogMediaUrl(request.FeaturedImage),
            CategoryId = request.CategoryId,
            IsPublished = request.IsPublished,
            PublishedAt = request.IsPublished ? now : null,
            CreatedAt = now,
            UpdatedAt = now
        };

        _dbContext.Blogs.Add(blog);

        if (request.AuthorIds is { Count: > 0 })
        {
            for (var i = 0; i < request.AuthorIds.Count; i++)
            {
                _dbContext.BlogAuthors.Add(new BlogAuthor
                {
                    Id = Guid.NewGuid(),
                    BlogId = blog.Id,
                    UserId = request.AuthorIds[i],
                    Order = i,
                    CreatedAt = now
                });
            }
        }

        var contentSlug = await GenerateUniqueContentSlugAsync(slug, blog.Id, cancellationToken);
        _dbContext.Contents.Add(new Content
        {
            Id = Guid.NewGuid(),
            ContentType = ContentType.Blog,
            ContentRefId = blog.Id,
            Title = blog.Title,
            Slug = contentSlug,
            IsPublished = blog.IsPublished,
            PublishedAt = blog.PublishedAt,
            CreatedAt = now,
            UpdatedAt = now
        });

        await _dbContext.SaveChangesAsync(cancellationToken);

        var createdBlog = await GetBlogBySlugAsync(blog.Slug, null, cancellationToken);
        if (createdBlog is null)
        {
            throw new InvalidOperationException($"Blog '{blog.Slug}' could not be loaded after creation.");
        }

        return new BlogCreateResult(BlogCreateStatus.Success, createdBlog);
    }

    public async Task<BlogCategoryCreateResult> CreateCategoryAsync(
        CreateBlogCategoryRequest request,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
        {
            return new BlogCategoryCreateResult(
                BlogCategoryCreateStatus.InvalidName,
                null,
                "Category name cannot be empty.");
        }

        var slug = await GenerateUniqueCategorySlugAsync(request.Name, cancellationToken);
        var now = DateTimeOffset.UtcNow;

        var category = new BlogCategory
        {
            Id = Guid.NewGuid(),
            Name = request.Name.Trim(),
            Slug = slug,
            Description = request.Description,
            CreatedAt = now,
            UpdatedAt = now
        };

        _dbContext.BlogCategories.Add(category);
        await _dbContext.SaveChangesAsync(cancellationToken);

        return new BlogCategoryCreateResult(
            BlogCategoryCreateStatus.Success,
            new BlogCategoryResponse(
                category.Id,
                category.Name,
                category.Slug,
                category.Description,
                category.CreatedAt,
                category.UpdatedAt));
    }

    private IQueryable<Blog> BuildPublishedBlogQuery(
        string? search,
        DateTimeOffset? startDate,
        DateTimeOffset? endDate,
        Guid? categoryId,
        string? authorUsername)
    {
        var query = _dbContext.Blogs
            .AsNoTracking()
            .Where(b => b.IsPublished);

        if (!string.IsNullOrWhiteSpace(search))
        {
            var pattern = $"%{search.Trim()}%";
            query = query.Where(b =>
                EF.Functions.ILike(b.Title, pattern) ||
                EF.Functions.ILike(b.Excerpt ?? string.Empty, pattern) ||
                EF.Functions.ILike(b.Content, pattern));
        }

        if (startDate.HasValue)
        {
            query = query.Where(b => b.PublishedAt >= startDate.Value);
        }

        if (endDate.HasValue)
        {
            query = query.Where(b => b.PublishedAt <= endDate.Value);
        }

        if (categoryId.HasValue)
        {
            query = query.Where(b => b.CategoryId == categoryId.Value);
        }

        if (!string.IsNullOrWhiteSpace(authorUsername))
        {
            var normalizedAuthorUsername = authorUsername.Trim();
            query = query.Where(b => b.Authors.Any(ba => ba.User.Username == normalizedAuthorUsername));
        }

        return query;
    }

    private async Task<List<BlogListItemResponse>> LoadBlogListPageAsync(
        IQueryable<Blog> query,
        int page,
        int pageSize,
        CancellationToken cancellationToken)
    {
        var blogRows = await query
            .OrderByDescending(b => b.PublishedAt ?? b.CreatedAt)
            .ThenByDescending(b => b.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(b => new BlogListProjection(
                b.Id,
                b.Title,
                b.Slug,
                b.Excerpt,
                b.FeaturedImage,
                b.Category != null
                    ? new BlogCategoryResponse(
                        b.Category.Id,
                        b.Category.Name,
                        b.Category.Slug,
                        b.Category.Description,
                        b.Category.CreatedAt,
                        b.Category.UpdatedAt)
                    : null,
                b.Authors
                    .OrderBy(ba => ba.Order)
                    .Select(ba => new BlogAuthorResponse(
                        ba.UserId,
                        ba.User.Username,
                        ba.User.DisplayName,
                        ba.Order))
                    .ToList(),
                b.IsPublished,
                b.PublishedAt,
                b.CreatedAt,
                b.UpdatedAt))
            .ToListAsync(cancellationToken);

        if (blogRows.Count == 0)
        {
            return [];
        }

        var blogIds = blogRows.Select(b => b.Id).ToList();
        var contentByBlogId = await _dbContext.Contents
            .AsNoTracking()
            .Where(c => c.ContentType == ContentType.Blog && blogIds.Contains(c.ContentRefId))
            .ToDictionaryAsync(c => c.ContentRefId, c => c.Id, cancellationToken);

        var contentIds = contentByBlogId.Values.Distinct().ToList();
        var likeCounts = contentIds.Count == 0
            ? new Dictionary<Guid, int>()
            : await _dbContext.Likes
                .AsNoTracking()
                .Where(l => contentIds.Contains(l.ContentId))
                .GroupBy(l => l.ContentId)
                .Select(g => new { g.Key, Count = g.Count() })
                .ToDictionaryAsync(x => x.Key, x => x.Count, cancellationToken);

        var commentCounts = contentIds.Count == 0
            ? new Dictionary<Guid, int>()
            : await _dbContext.Comments
                .AsNoTracking()
                .Where(c => !c.IsDeleted && contentIds.Contains(c.ContentId))
                .GroupBy(c => c.ContentId)
                .Select(g => new { g.Key, Count = g.Count() })
                .ToDictionaryAsync(x => x.Key, x => x.Count, cancellationToken);

        return blogRows
            .Select(blog =>
            {
                var likeCount = 0;
                var commentCount = 0;

                if (contentByBlogId.TryGetValue(blog.Id, out var contentId))
                {
                    likeCount = likeCounts.TryGetValue(contentId, out var resolvedLikeCount) ? resolvedLikeCount : 0;
                    commentCount = commentCounts.TryGetValue(contentId, out var resolvedCommentCount) ? resolvedCommentCount : 0;
                }

                return new BlogListItemResponse(
                    blog.Id,
                    blog.Title,
                    blog.Slug,
                    blog.Excerpt,
                    NormalizeBlogMediaUrl(blog.FeaturedImage),
                    blog.Category,
                    blog.Authors,
                    blog.IsPublished,
                    blog.PublishedAt,
                    blog.CreatedAt,
                    blog.UpdatedAt,
                    likeCount,
                    commentCount);
            })
            .ToList();
    }

    private static void NormalizePagination(ref int page, ref int pageSize)
    {
        if (page < 1)
        {
            page = 1;
        }

        if (pageSize < 1 || pageSize > 100)
        {
            pageSize = 10;
        }
    }

    private static string GenerateSlug(string title)
    {
        var slug = title.ToLowerInvariant();
        slug = Regex.Replace(slug, @"[^a-z0-9\s-]", "");
        slug = Regex.Replace(slug, @"\s+", "-");
        slug = Regex.Replace(slug, @"-+", "-");
        return slug.Trim('-');
    }

    private async Task<string> GenerateUniqueBlogSlugAsync(string title, CancellationToken cancellationToken)
    {
        var baseSlug = GenerateSlug(title);
        var slug = baseSlug;
        var counter = 1;

        while (await _dbContext.Blogs.AnyAsync(b => b.Slug == slug, cancellationToken))
        {
            slug = $"{baseSlug}-{counter}";
            counter++;
        }

        return slug;
    }

    private async Task<string> GenerateUniqueCategorySlugAsync(string name, CancellationToken cancellationToken)
    {
        var baseSlug = GenerateSlug(name);
        var slug = baseSlug;
        var counter = 1;

        while (await _dbContext.BlogCategories.AnyAsync(c => c.Slug == slug, cancellationToken))
        {
            slug = $"{baseSlug}-{counter}";
            counter++;
        }

        return slug;
    }

    private async Task<string> GenerateUniqueContentSlugAsync(string baseSlug, Guid blogId, CancellationToken cancellationToken)
    {
        var slug = baseSlug;
        var suffix = blogId.ToString("N")[..8];
        var counter = 1;

        while (await _dbContext.Contents.AnyAsync(c => c.Slug == slug, cancellationToken))
        {
            slug = counter == 1
                ? $"{baseSlug}-{suffix}"
                : $"{baseSlug}-{suffix}-{counter}";
            counter++;
        }

        return slug;
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

    private sealed record BlogListProjection(
        Guid Id,
        string Title,
        string Slug,
        string? Excerpt,
        string? FeaturedImage,
        BlogCategoryResponse? Category,
        List<BlogAuthorResponse> Authors,
        bool IsPublished,
        DateTimeOffset? PublishedAt,
        DateTimeOffset CreatedAt,
        DateTimeOffset? UpdatedAt);

    private sealed record BlogDetailProjection(
        Guid Id,
        string Title,
        string Slug,
        string? Excerpt,
        string Content,
        string? FeaturedImage,
        BlogCategoryResponse? Category,
        List<BlogAuthorResponse> Authors,
        bool IsPublished,
        DateTimeOffset? PublishedAt,
        DateTimeOffset CreatedAt,
        DateTimeOffset? UpdatedAt);
}
