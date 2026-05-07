using System.Text.RegularExpressions;
using JassSpace.Contracts.Interfaces;
using JassSpace.Contracts.Requests;
using JassSpace.Contracts.Responses;
using JassSpace.Data;
using JassSpace.Entities;
using JassSpace.Entities.Enums;
using JassSpace.Infra;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace JassSpace.Services;

public sealed class AdminBlogService(
    JassSpaceDbContext dbContext,
    IAzureBlobStorageService blobStorageService,
    IImageProcessingService imageProcessingService,
    ILogger<AdminBlogService> logger) : IAdminBlogService
{
    private const string BlogBlobPrefix = "blog/";
    private const string MediaPathPrefix = "/media/";
    private static readonly TimeSpan RegexTimeout = TimeSpan.FromSeconds(1);

    private readonly JassSpaceDbContext _dbContext = dbContext;
    private readonly IAzureBlobStorageService _blobStorageService = blobStorageService;
    private readonly IImageProcessingService _imageProcessingService = imageProcessingService;
    private readonly ILogger<AdminBlogService> _logger = logger;

    public Task<List<BlogCategoryResponse>> GetCategoriesAsync(CancellationToken cancellationToken = default)
    {
        return _dbContext.BlogCategories
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

    public async Task<AdminBlogCategoryMutationResult> CreateCategoryAsync(
        CreateBlogCategoryRequest request,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
        {
            return new AdminBlogCategoryMutationResult(
                AdminBlogCategoryMutationStatus.InvalidName,
                ErrorMessage: "Category name cannot be empty.");
        }

        var now = DateTimeOffset.UtcNow;
        var category = new BlogCategory
        {
            Id = Guid.NewGuid(),
            Name = request.Name.Trim(),
            Slug = await GenerateUniqueCategorySlugAsync(request.Name, cancellationToken),
            Description = string.IsNullOrWhiteSpace(request.Description) ? null : request.Description.Trim(),
            CreatedAt = now,
            UpdatedAt = now
        };

        _dbContext.BlogCategories.Add(category);
        await _dbContext.SaveChangesAsync(cancellationToken);

        return new AdminBlogCategoryMutationResult(
            AdminBlogCategoryMutationStatus.Success,
            new BlogCategoryResponse(
                category.Id,
                category.Name,
                category.Slug,
                category.Description,
                category.CreatedAt,
                category.UpdatedAt));
    }

    public async Task<AdminBlogCategoryMutationResult> UpdateCategoryAsync(
        Guid id,
        CreateBlogCategoryRequest request,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
        {
            return new AdminBlogCategoryMutationResult(
                AdminBlogCategoryMutationStatus.InvalidName,
                ErrorMessage: "Category name cannot be empty.");
        }

        var category = await _dbContext.BlogCategories
            .FirstOrDefaultAsync(c => c.Id == id, cancellationToken);

        if (category is null)
        {
            return new AdminBlogCategoryMutationResult(
                AdminBlogCategoryMutationStatus.CategoryNotFound,
                ErrorMessage: $"No category found with ID '{id}'.");
        }

        var normalizedName = request.Name.Trim();
        if (!string.Equals(category.Name, normalizedName, StringComparison.Ordinal))
        {
            var targetSlug = GenerateSlug(normalizedName);
            var slugExists = await _dbContext.BlogCategories
                .AnyAsync(c => c.Slug == targetSlug && c.Id != id, cancellationToken);

            category.Slug = slugExists
                ? $"{targetSlug}-{Guid.NewGuid().ToString()[..8]}"
                : targetSlug;
        }

        category.Name = normalizedName;
        category.Description = string.IsNullOrWhiteSpace(request.Description) ? null : request.Description.Trim();
        category.UpdatedAt = DateTimeOffset.UtcNow;

        await _dbContext.SaveChangesAsync(cancellationToken);

        return new AdminBlogCategoryMutationResult(
            AdminBlogCategoryMutationStatus.Success,
            new BlogCategoryResponse(
                category.Id,
                category.Name,
                category.Slug,
                category.Description,
                category.CreatedAt,
                category.UpdatedAt));
    }

    public Task<List<ContentAuthorResponse>> GetAuthorsAsync(
        string? search = null,
        int take = 100,
        CancellationToken cancellationToken = default)
    {
        take = Math.Clamp(take, 1, 200);

        var query = _dbContext.Users
            .AsNoTracking()
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
        {
            var pattern = $"%{search.Trim()}%";
            query = query.Where(u =>
                EF.Functions.ILike(u.Username, pattern) ||
                EF.Functions.ILike(u.DisplayName ?? string.Empty, pattern) ||
                EF.Functions.ILike(u.FirstName ?? string.Empty, pattern) ||
                EF.Functions.ILike(u.LastName ?? string.Empty, pattern));
        }

        return query
            .OrderBy(u => u.FirstName)
            .ThenBy(u => u.LastName)
            .Take(take)
            .Select(u => new ContentAuthorResponse(
                u.Id,
                u.Username,
                u.DisplayName ?? $"{u.FirstName} {u.LastName}".Trim(),
                null,
                0))
            .ToListAsync(cancellationToken);
    }

    public async Task<List<BlogListItemResponse>> GetBlogsAsync(
        GetBlogsQueryParams query,
        CancellationToken cancellationToken = default)
    {
        var page = query.Page < 1 ? 1 : query.Page;
        var pageSize = query.PageSize < 1 || query.PageSize > 200 ? 100 : query.PageSize;

        var blogQuery = _dbContext.Blogs
            .AsNoTracking()
            .Include(b => b.Category)
            .AsQueryable();

        if (query.IsPublished.HasValue)
        {
            blogQuery = blogQuery.Where(b => b.IsPublished == query.IsPublished.Value);
        }

        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var searchLower = query.Search.ToLowerInvariant();
            blogQuery = blogQuery.Where(b =>
                b.Title.ToLower().Contains(searchLower) ||
                (b.Excerpt != null && b.Excerpt.ToLower().Contains(searchLower)) ||
                b.Content.ToLower().Contains(searchLower));
        }

        if (query.StartDate.HasValue)
        {
            blogQuery = blogQuery.Where(b => b.PublishedAt >= query.StartDate.Value);
        }

        if (query.EndDate.HasValue)
        {
            blogQuery = blogQuery.Where(b => b.PublishedAt <= query.EndDate.Value);
        }

        if (query.CategoryId.HasValue)
        {
            blogQuery = blogQuery.Where(b => b.CategoryId == query.CategoryId.Value);
        }

        if (!string.IsNullOrWhiteSpace(query.AuthorUsername))
        {
            var normalizedUsername = query.AuthorUsername.Trim();
            blogQuery = blogQuery.Where(b => _dbContext.Contents
                .Any(c => c.ContentType == ContentType.Blog && c.ContentRefId == b.Id &&
                          c.Authors.Any(ca => ca.User.Username == normalizedUsername)));
        }

        var blogRows = await blogQuery
            .OrderByDescending(b => b.UpdatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(b => new
            {
                b.Id,
                b.Title,
                b.Slug,
                b.Excerpt,
                b.FeaturedImage,
                Category = b.Category != null
                    ? new BlogCategoryResponse(
                        b.Category.Id,
                        b.Category.Name,
                        b.Category.Slug,
                        b.Category.Description,
                        b.Category.CreatedAt,
                        b.Category.UpdatedAt)
                    : null,
                b.IsPublished,
                b.PublishedAt,
                b.CreatedAt,
                b.UpdatedAt
            })
            .ToListAsync(cancellationToken);

        var blogIds = blogRows.Select(b => b.Id).ToList();
        var authorsByBlogId = await LoadAuthorsByBlogIdsAsync(blogIds, cancellationToken);

        return blogRows.Select(b => new BlogListItemResponse(
            b.Id,
            b.Title,
            b.Slug,
            b.Excerpt,
            NormalizeBlogMediaUrl(b.FeaturedImage),
            b.Category,
            authorsByBlogId.TryGetValue(b.Id, out var authors) ? authors : [],
            b.IsPublished,
            b.PublishedAt,
            b.CreatedAt,
            b.UpdatedAt)).ToList();
    }

    public async Task<AdminBlogMutationResult> GetBlogAsync(
        Guid id,
        Guid? currentUserId,
        bool canEditAll,
        CancellationToken cancellationToken = default)
    {
        var blog = await GetBlogWithDetailsAsync(id, cancellationToken);
        if (blog is null)
        {
            return new AdminBlogMutationResult(
                AdminBlogMutationStatus.BlogNotFound,
                ErrorMessage: $"No blog found with ID '{id}'.");
        }

        if (!CanEditBlog(blog.Authors.Select(a => a.UserId), currentUserId, canEditAll))
        {
            return new AdminBlogMutationResult(
                AdminBlogMutationStatus.Forbidden,
                ErrorMessage: "You are not authorized to edit this blog.");
        }

        return new AdminBlogMutationResult(AdminBlogMutationStatus.Success, blog);

    }

    public async Task<MediaUploadResponse> UploadBlogImageAsync(
        AdminMediaUploadInput file,
        string mediaBaseUrl,
        CancellationToken cancellationToken = default)
    {
        var baseName = !string.IsNullOrWhiteSpace(file.RequestedFileName)
            ? file.RequestedFileName
            : Guid.NewGuid().ToString();

        var uploadResult = await UploadBlogFileAsync(
            file.Content,
            file.FileName,
            baseName,
            cancellationToken);

        return new MediaUploadResponse(
            uploadResult.BlobName,
            BuildBlogMediaUrl(mediaBaseUrl, uploadResult.BlobName));
    }

    public async Task<AdminBlogMutationResult> CreateBlogAsync(
        CreateBlogRequest request,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.Title))
        {
            return new AdminBlogMutationResult(
                AdminBlogMutationStatus.InvalidTitle,
                ErrorMessage: "Blog title cannot be empty.");
        }

        var slug = !string.IsNullOrWhiteSpace(request.Slug)
            ? GenerateSlug(request.Slug)
            : GenerateSlug(request.Title);

        var slugExists = await _dbContext.Blogs
            .AnyAsync(b => b.Slug == slug, cancellationToken);

        if (slugExists)
        {
            slug = $"{slug}-{Guid.NewGuid().ToString()[..8]}";
        }

        var blogId = request.Id ?? Guid.NewGuid();
        var contentId = Guid.NewGuid();
        var now = DateTimeOffset.UtcNow;

        var blog = new Blog
        {
            Id = blogId,
            Title = request.Title,
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

        var contentSlug = slug;
        var existingContentSlug = await _dbContext.Contents
            .AnyAsync(c => c.Slug == contentSlug, cancellationToken);

        if (existingContentSlug)
        {
            contentSlug = $"{slug}-{blogId.ToString()[..8]}";
        }

        _dbContext.Contents.Add(new Content
        {
            Id = contentId,
            ContentType = ContentType.Blog,
            ContentRefId = blogId,
            Title = blog.Title,
            Slug = contentSlug,
            Description = blog.Excerpt,
            Cover = blog.FeaturedImage,
            IsPublished = blog.IsPublished,
            PublishedAt = blog.PublishedAt,
            SearchBody = BuildBlogSearchBody(blog.Excerpt, blog.Content),
            CreatedAt = now,
            UpdatedAt = now
        });

        if (request.AuthorIds is { Count: > 0 })
        {
            var existingUserIds = await _dbContext.Users
                .Where(u => request.AuthorIds.Contains(u.Id))
                .Select(u => u.Id)
                .ToListAsync(cancellationToken);

            _dbContext.ContentAuthors.AddRange(
                request.AuthorIds
                    .Where(existingUserIds.Contains)
                    .Select((userId, i) => new ContentAuthor
                    {
                        Id = Guid.NewGuid(),
                        ContentId = contentId,
                        UserId = userId,
                        Order = i,
                        CreatedAt = now
                    }));
        }

        await _dbContext.SaveChangesAsync(cancellationToken);

        var createdBlog = await GetBlogWithDetailsAsync(blogId, cancellationToken)
            ?? throw new InvalidOperationException("The blog was created but could not be loaded.");

        return new AdminBlogMutationResult(AdminBlogMutationStatus.Success, createdBlog);
    }

    public async Task<AdminBlogMutationResult> UpdateBlogAsync(
        Guid id,
        UpdateBlogRequest request,
        Guid? currentUserId,
        bool canEditAll,
        CancellationToken cancellationToken = default)
    {
        var blog = await _dbContext.Blogs
            .FirstOrDefaultAsync(b => b.Id == id, cancellationToken);

        if (blog is null)
        {
            return new AdminBlogMutationResult(
                AdminBlogMutationStatus.BlogNotFound,
                ErrorMessage: $"No blog found with ID '{id}'.");
        }

        var contentId = await _dbContext.Contents
            .Where(c => c.ContentType == ContentType.Blog && c.ContentRefId == id)
            .Select(c => c.Id)
            .FirstOrDefaultAsync(cancellationToken);

        var existingAuthorUserIds = await _dbContext.ContentAuthors
            .Where(ca => ca.ContentId == contentId)
            .Select(ca => ca.UserId)
            .ToListAsync(cancellationToken);

        if (!CanEditBlog(existingAuthorUserIds, currentUserId, canEditAll))
        {
            return new AdminBlogMutationResult(
                AdminBlogMutationStatus.Forbidden,
                ErrorMessage: "You are not authorized to edit this blog.");
        }

        var targetSlug = !string.IsNullOrWhiteSpace(request.Slug)
            ? GenerateSlug(request.Slug)
            : (request.Title != blog.Title ? GenerateSlug(request.Title) : blog.Slug);

        if (targetSlug != blog.Slug)
        {
            var slugExists = await _dbContext.Blogs
                .AnyAsync(b => b.Slug == targetSlug && b.Id != id, cancellationToken);

            blog.Slug = slugExists
                ? $"{targetSlug}-{Guid.NewGuid().ToString()[..8]}"
                : targetSlug;
        }

        blog.Title = request.Title;

        var normalizedFeaturedImage = NormalizeBlogMediaUrl(request.FeaturedImage);
        var existingFeaturedBlobName = ExtractBlogBlobNameFromMediaUrl(blog.FeaturedImage);
        var incomingFeaturedBlobName = ExtractBlogBlobNameFromMediaUrl(normalizedFeaturedImage);

        if (!string.IsNullOrWhiteSpace(existingFeaturedBlobName) &&
            !string.Equals(existingFeaturedBlobName, incomingFeaturedBlobName, StringComparison.OrdinalIgnoreCase))
        {
            try
            {
                await _blobStorageService.DeleteBlobAsync(existingFeaturedBlobName, cancellationToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to delete old image blob {BlobUrl}", blog.FeaturedImage);
            }
        }

        blog.Excerpt = request.Excerpt;
        blog.Content = request.Content;
        blog.FeaturedImage = normalizedFeaturedImage;
        blog.CategoryId = request.CategoryId;

        if (request.IsPublished && !blog.IsPublished)
        {
            blog.PublishedAt = DateTimeOffset.UtcNow;
        }

        blog.IsPublished = request.IsPublished;
        blog.UpdatedAt = DateTimeOffset.UtcNow;

        await UpsertContentAsync(blog, id, cancellationToken);
        await UpdateAuthorsAsync(contentId, existingAuthorUserIds, request.AuthorIds, canEditAll, cancellationToken);
        await CleanupOrphanedContentImagesAsync(id, request.Content, cancellationToken);

        await _dbContext.SaveChangesAsync(cancellationToken);

        var updatedBlog = await GetBlogWithDetailsAsync(id, cancellationToken)
            ?? throw new InvalidOperationException("The blog was updated but could not be loaded.");

        return new AdminBlogMutationResult(AdminBlogMutationStatus.Success, updatedBlog);
    }

    public async Task<AdminBlogDeleteResult> DeleteBlogAsync(
        Guid id,
        CancellationToken cancellationToken = default)
    {
        var blog = await _dbContext.Blogs
            .FirstOrDefaultAsync(b => b.Id == id, cancellationToken);

        if (blog is null)
        {
            return new AdminBlogDeleteResult(
                AdminBlogDeleteStatus.BlogNotFound,
                $"No blog found with ID '{id}'.");
        }

        if (!string.IsNullOrWhiteSpace(blog.FeaturedImage))
        {
            try
            {
                var featuredBlobName = ExtractBlogBlobNameFromMediaUrl(blog.FeaturedImage);
                if (!string.IsNullOrWhiteSpace(featuredBlobName))
                {
                    await _blobStorageService.DeleteBlobAsync(featuredBlobName, cancellationToken);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to delete image blob {BlobUrl}", blog.FeaturedImage);
            }
        }

        var content = await _dbContext.Contents
            .FirstOrDefaultAsync(c => c.ContentType == ContentType.Blog && c.ContentRefId == id, cancellationToken);

        if (content is not null)
        {
            await _dbContext.Comments
                .Where(c => c.ContentId == content.Id)
                .ExecuteDeleteAsync(cancellationToken);

            _dbContext.Contents.Remove(content);
        }

        _dbContext.Blogs.Remove(blog);
        await _dbContext.SaveChangesAsync(cancellationToken);

        return new AdminBlogDeleteResult(AdminBlogDeleteStatus.Success);
    }

    private async Task UpsertContentAsync(Blog blog, Guid id, CancellationToken cancellationToken)
    {
        var content = await _dbContext.Contents
            .FirstOrDefaultAsync(c => c.ContentType == ContentType.Blog && c.ContentRefId == id, cancellationToken);

        if (content is not null)
        {
            content.Title = blog.Title;

            if (content.Slug != blog.Slug)
            {
                var contentSlug = blog.Slug;
                var existingContentSlug = await _dbContext.Contents
                    .AnyAsync(c => c.Slug == contentSlug && c.Id != content.Id, cancellationToken);

                if (existingContentSlug)
                {
                    contentSlug = $"{blog.Slug}-{content.Id.ToString()[..8]}";
                }

                content.Slug = contentSlug;
            }

            content.Description = blog.Excerpt;
            content.Cover = blog.FeaturedImage;
            content.IsPublished = blog.IsPublished;
            content.PublishedAt = blog.PublishedAt;
            content.SearchBody = BuildBlogSearchBody(blog.Excerpt, blog.Content);
            content.UpdatedAt = DateTimeOffset.UtcNow;
            return;
        }

        var newContentSlug = blog.Slug;
        var slugExists = await _dbContext.Contents
            .AnyAsync(c => c.Slug == newContentSlug, cancellationToken);

        if (slugExists)
        {
            newContentSlug = $"{blog.Slug}-{blog.Id.ToString()[..8]}";
        }

        _dbContext.Contents.Add(new Content
        {
            Id = Guid.NewGuid(),
            ContentType = ContentType.Blog,
            ContentRefId = blog.Id,
            Title = blog.Title,
            Slug = newContentSlug,
            Description = blog.Excerpt,
            Cover = blog.FeaturedImage,
            IsPublished = blog.IsPublished,
            PublishedAt = blog.PublishedAt,
            SearchBody = BuildBlogSearchBody(blog.Excerpt, blog.Content),
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow
        });
    }

    private async Task UpdateAuthorsAsync(
        Guid contentId,
        List<Guid> existingAuthorUserIds,
        List<Guid>? requestedAuthorIds,
        bool canEditAll,
        CancellationToken cancellationToken)
    {
        var requestAuthorIds = canEditAll
            ? requestedAuthorIds ?? []
            : existingAuthorUserIds;

        await _dbContext.ContentAuthors
            .Where(ca => ca.ContentId == contentId && !requestAuthorIds.Contains(ca.UserId))
            .ExecuteDeleteAsync(cancellationToken);

        var newAuthorUserIds = requestAuthorIds.Where(uid => !existingAuthorUserIds.Contains(uid)).ToList();
        if (newAuthorUserIds.Count == 0)
        {
            return;
        }

        var validUserIds = await _dbContext.Users
            .Where(u => newAuthorUserIds.Contains(u.Id))
            .Select(u => u.Id)
            .ToListAsync(cancellationToken);

        var currentMaxOrder = existingAuthorUserIds.Count;
        var now = DateTimeOffset.UtcNow;
        _dbContext.ContentAuthors.AddRange(
            requestAuthorIds
                .Where(uid => validUserIds.Contains(uid) && !existingAuthorUserIds.Contains(uid))
                .Select((userId, i) => new ContentAuthor
                {
                    Id = Guid.NewGuid(),
                    ContentId = contentId,
                    UserId = userId,
                    Order = currentMaxOrder + i,
                    CreatedAt = now
                }));
    }

    private async Task CleanupOrphanedContentImagesAsync(
        Guid blogId,
        string content,
        CancellationToken cancellationToken)
    {
        try
        {
            var legacyPrefix = $"blog-{blogId}-";
            var folderPrefix = $"blog/blog-{blogId}-";
            var storedBlobs = (await _blobStorageService.ListBlobsByPrefixAsync(folderPrefix, cancellationToken))
                .Concat(await _blobStorageService.ListBlobsByPrefixAsync(legacyPrefix, cancellationToken))
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .ToList();

            if (storedBlobs.Count == 0)
            {
                return;
            }

            var usedBlobNames = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            foreach (var blobName in ExtractBlobNamesFromContent(content))
            {
                usedBlobNames.Add(blobName);
            }

            var orphans = storedBlobs.Where(b => !usedBlobNames.Contains(b)).ToList();
            foreach (var orphan in orphans)
            {
                await _blobStorageService.DeleteBlobAsync(orphan, cancellationToken);
                _logger.LogInformation("Deleted orphaned content image {BlobName} for blog {BlogId}", orphan, blogId);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to clean up orphaned images for blog {BlogId}", blogId);
        }
    }

    private async Task<BlogDetailResponse?> GetBlogWithDetailsAsync(
        Guid blogId,
        CancellationToken cancellationToken)
    {
        var blog = await _dbContext.Blogs
            .AsNoTracking()
            .Include(b => b.Category)
            .Where(b => b.Id == blogId)
            .FirstOrDefaultAsync(cancellationToken);

        if (blog is null)
        {
            return null;
        }

        var content = await _dbContext.Contents
            .AsNoTracking()
            .FirstOrDefaultAsync(c => c.ContentType == ContentType.Blog && c.ContentRefId == blogId, cancellationToken);

        var authors = content is null
            ? []
            : await _dbContext.ContentAuthors
                .AsNoTracking()
                .Where(ca => ca.ContentId == content.Id)
                .OrderBy(ca => ca.Order)
                .Select(ca => new ContentAuthorResponse(
                    ca.UserId,
                    ca.User.Username,
                    ca.User.DisplayName,
                    ca.Role,
                    ca.Order))
                .ToListAsync(cancellationToken);

        return new BlogDetailResponse(
            blog.Id,
            content?.Id ?? Guid.Empty,
            blog.Title,
            blog.Slug,
            blog.Excerpt,
            blog.Content,
            NormalizeBlogMediaUrl(blog.FeaturedImage),
            blog.Category == null
                ? null
                : new BlogCategoryResponse(
                    blog.Category.Id,
                    blog.Category.Name,
                    blog.Category.Slug,
                    blog.Category.Description,
                    blog.Category.CreatedAt,
                    blog.Category.UpdatedAt),
            authors,
            blog.IsPublished,
            blog.PublishedAt,
            blog.CreatedAt,
            blog.UpdatedAt,
            0,
            false,
            0);
    }

    private async Task<Dictionary<Guid, List<ContentAuthorResponse>>> LoadAuthorsByBlogIdsAsync(
        List<Guid> blogIds,
        CancellationToken cancellationToken)
    {
        if (blogIds.Count == 0)
        {
            return new Dictionary<Guid, List<ContentAuthorResponse>>();
        }

        var contentMap = await _dbContext.Contents
            .AsNoTracking()
            .Where(c => c.ContentType == ContentType.Blog && blogIds.Contains(c.ContentRefId))
            .Select(c => new { c.Id, c.ContentRefId })
            .ToListAsync(cancellationToken);

        var contentIds = contentMap.Select(c => c.Id).ToList();
        var refIdByContentId = contentMap.ToDictionary(c => c.Id, c => c.ContentRefId);

        var authorRows = await _dbContext.ContentAuthors
            .AsNoTracking()
            .Where(ca => contentIds.Contains(ca.ContentId))
            .OrderBy(ca => ca.Order)
            .Select(ca => new
            {
                ca.ContentId,
                Response = new ContentAuthorResponse(
                    ca.UserId,
                    ca.User.Username,
                    ca.User.DisplayName,
                    ca.Role,
                    ca.Order)
            })
            .ToListAsync(cancellationToken);

        return authorRows
            .GroupBy(x => refIdByContentId[x.ContentId])
            .ToDictionary(g => g.Key, g => g.Select(x => x.Response).ToList());
    }

    private async Task<BlobUploadResult> UploadBlogFileAsync(
        Stream fileStream,
        string fileName,
        string? blobName,
        CancellationToken cancellationToken)
    {
        await using var processedStream = await _imageProcessingService.ProcessImageAsync(fileStream, cancellationToken);

        return await _blobStorageService.UploadImageAsync(
            processedStream,
            fileName,
            "image/webp",
            string.IsNullOrWhiteSpace(blobName) ? null : EnsureBlogBlobName(blobName),
            cancellationToken);
    }

    private static bool CanEditBlog(
        IEnumerable<Guid> authorIds,
        Guid? currentUserId,
        bool canEditAll)
    {
        if (canEditAll)
        {
            return true;
        }

        return currentUserId.HasValue && authorIds.Distinct().Contains(currentUserId.Value);
    }

    private static string BuildBlogMediaUrl(string mediaBaseUrl, string blobName)
    {
        var publicBlobName = StripBlogPrefix(blobName);
        return $"{mediaBaseUrl.TrimEnd('/')}{MediaPathPrefix}{publicBlobName}";
    }

    private static IEnumerable<string> ExtractBlobNamesFromContent(string content)
    {
        if (string.IsNullOrWhiteSpace(content))
        {
            yield break;
        }

        var matches = Regex.Matches(content, @"/media/([^\s\)""'<>]+)", RegexOptions.IgnoreCase, RegexTimeout);
        foreach (Match match in matches)
        {
            var candidate = match.Groups[1].Value;
            if (string.IsNullOrWhiteSpace(candidate))
            {
                continue;
            }

            var trimmed = candidate.Split('?', '#')[0].Trim();
            if (string.IsNullOrWhiteSpace(trimmed))
            {
                continue;
            }

            yield return EnsureBlogBlobName(trimmed);
            yield return StripBlogPrefix(trimmed);
        }
    }

    private static string EnsureBlogBlobName(string blobName)
    {
        var normalized = blobName.Trim().TrimStart('/').Replace('\\', '/');
        return normalized.StartsWith(BlogBlobPrefix, StringComparison.OrdinalIgnoreCase)
            ? normalized
            : $"{BlogBlobPrefix}{normalized}";
    }

    private static string StripBlogPrefix(string blobName)
    {
        var normalized = blobName.Trim().TrimStart('/').Replace('\\', '/');
        return normalized.StartsWith(BlogBlobPrefix, StringComparison.OrdinalIgnoreCase)
            ? normalized[BlogBlobPrefix.Length..]
            : normalized;
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

    private static string? ExtractBlogBlobNameFromMediaUrl(string? mediaUrl)
    {
        if (string.IsNullOrWhiteSpace(mediaUrl))
        {
            return null;
        }

        return TryExtractMediaBlobName(mediaUrl.Trim(), out var blobName)
            ? EnsureBlogBlobName(blobName)
            : null;
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
            var index = absolute.AbsolutePath.IndexOf(marker, StringComparison.OrdinalIgnoreCase);
            if (index == -1)
            {
                return false;
            }

            var candidate = absolute.AbsolutePath[(index + marker.Length)..];
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

    private static string GenerateSlug(string title)
    {
        var slug = title.ToLowerInvariant();
        slug = Regex.Replace(slug, @"[^a-z0-9\s-]", "", RegexOptions.None, RegexTimeout);
        slug = Regex.Replace(slug, @"\s+", "-", RegexOptions.None, RegexTimeout);
        slug = Regex.Replace(slug, @"-+", "-", RegexOptions.None, RegexTimeout);
        return slug.Trim('-');
    }

    private async Task<string> GenerateUniqueCategorySlugAsync(
        string name,
        CancellationToken cancellationToken)
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

    private static string? BuildBlogSearchBody(string? excerpt, string? bodyHtml)
    {
        if (!string.IsNullOrWhiteSpace(excerpt))
            return excerpt.Trim();

        if (string.IsNullOrWhiteSpace(bodyHtml))
            return null;

        // Strip HTML tags and truncate to keep the tsvector lean.
        var stripped = Regex.Replace(bodyHtml, @"<[^>]+>", " ", RegexOptions.None, RegexTimeout);
        stripped = Regex.Replace(stripped, @"\s+", " ", RegexOptions.None, RegexTimeout).Trim();
        return stripped.Length > 500 ? stripped[..500] : stripped;
    }
}
