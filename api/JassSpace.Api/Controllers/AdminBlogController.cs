using JassSpace.Api.Extensions;
using JassSpace.Api.Services;
using JassSpace.Contracts;
using JassSpace.Contracts.Requests;
using JassSpace.Contracts.Responses;
using JassSpace.Data;
using JassSpace.Entities;
using JassSpace.Entities.Enums;
using JassSpace.Infra;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Text.RegularExpressions;

namespace JassSpace.Api.Controllers;

/// <summary>
/// Admin endpoints for managing blogs
/// </summary>
[Route("admin/blog")]
[Authorize(Roles = "admin,mod")]
public sealed class AdminBlogController(
    JassSpaceDbContext dbContext,
    ILogger<AdminBlogController> logger,
    IAzureBlobStorageService blobStorageService,
    IImageProcessingService imageProcessingService,
    IHttpContextAccessor httpContextAccessor,
    IBlogCategoryCacheService blogCategoryCacheService)
    : BaseApiController
{
    private const string BlogBlobPrefix = "blog/";
    private const string MediaPathPrefix = "/media/";

    /// <summary>
    /// Get all blog categories
    /// </summary>
    [HttpGet("categories")]
    [ProducesResponseType(typeof(ApiResponse<List<BlogCategoryResponse>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetCategories(CancellationToken cancellationToken = default)
    {
        var cacheResult = await blogCategoryCacheService.GetCategoriesAsync(cancellationToken);
        return OkEnvelope(
            cacheResult.Data,
            isFromCache: cacheResult.IsFromCache ? true : null);
    }

    [HttpPost("categories")]
    [ProducesResponseType(typeof(ApiResponse<BlogCategoryResponse>), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> CreateCategory(
        [FromBody] CreateBlogCategoryRequest request,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
        {
            return BadRequestProblem("Invalid category name", "Category name cannot be empty.");
        }

        try
        {
            var now = DateTimeOffset.UtcNow;
            var category = new BlogCategory
            {
                Id = Guid.NewGuid(),
                Name = request.Name.Trim(),
                Slug = await GenerateUniqueCategorySlug(request.Name, cancellationToken),
                Description = string.IsNullOrWhiteSpace(request.Description) ? null : request.Description.Trim(),
                CreatedAt = now,
                UpdatedAt = now
            };

            dbContext.BlogCategories.Add(category);
            await dbContext.SaveChangesAsync(cancellationToken);
            await blogCategoryCacheService.InvalidateAsync(cancellationToken);

            return OkEnvelope(new BlogCategoryResponse(
                category.Id,
                category.Name,
                category.Slug,
                category.Description,
                category.CreatedAt,
                category.UpdatedAt
            ));
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to create blog category");
            return Problem(
                StatusCodes.Status500InternalServerError,
                "Failed to create category",
                "An unexpected error occurred while creating the category.");
        }
    }

    [HttpPut("categories/{id:guid}")]
    [ProducesResponseType(typeof(ApiResponse<BlogCategoryResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateCategory(
        Guid id,
        [FromBody] CreateBlogCategoryRequest request,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
        {
            return BadRequestProblem("Invalid category name", "Category name cannot be empty.");
        }

        var category = await dbContext.BlogCategories
            .FirstOrDefaultAsync(c => c.Id == id, cancellationToken);

        if (category is null)
        {
            return NotFoundProblem("Category not found", $"No category found with ID '{id}'.");
        }

        try
        {
            var normalizedName = request.Name.Trim();
            if (!string.Equals(category.Name, normalizedName, StringComparison.Ordinal))
            {
                var targetSlug = GenerateSlug(normalizedName);
                var slugExists = await dbContext.BlogCategories
                    .AnyAsync(c => c.Slug == targetSlug && c.Id != id, cancellationToken);

                category.Slug = slugExists
                    ? $"{targetSlug}-{Guid.NewGuid().ToString().Substring(0, 8)}"
                    : targetSlug;
            }

            category.Name = normalizedName;
            category.Description = string.IsNullOrWhiteSpace(request.Description) ? null : request.Description.Trim();
            category.UpdatedAt = DateTimeOffset.UtcNow;

            await dbContext.SaveChangesAsync(cancellationToken);
            await blogCategoryCacheService.InvalidateAsync(cancellationToken);

            return OkEnvelope(new BlogCategoryResponse(
                category.Id,
                category.Name,
                category.Slug,
                category.Description,
                category.CreatedAt,
                category.UpdatedAt
            ));
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to update blog category {CategoryId}", id);
            return Problem(
                StatusCodes.Status500InternalServerError,
                "Failed to update category",
                "An unexpected error occurred while updating the category.");
        }
    }

    /// <summary>
    /// Get list of users who can be blog authors (admin or mod roles)
    /// </summary>
    [HttpGet("authors")]
    [ProducesResponseType(typeof(ApiResponse<List<BlogAuthorResponse>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAuthors(
        [FromQuery] string? search = null,
        [FromQuery] int take = 100,
        CancellationToken cancellationToken = default)
    {
        take = Math.Clamp(take, 1, 200);

        var query = dbContext.Users
            .AsNoTracking()
            .Where(u => u.UserRoles.Any(ur => ur.Role.Name == "admin" || ur.Role.Name == "mod"))
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

        var authors = await query
            .OrderBy(u => u.FirstName).ThenBy(u => u.LastName)
            .Take(take)
            .Select(u => new BlogAuthorResponse(
                u.Id,
                u.Username,
                u.DisplayName ?? $"{u.FirstName} {u.LastName}".Trim(),
                0 // Order not applicable for potential authors list
            ))
            .ToListAsync(cancellationToken);

        return OkEnvelope(authors);
    }

    [HttpGet]
    [ProducesResponseType(typeof(ApiResponse<List<BlogListItemResponse>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetBlogs(
        [FromQuery] string? search = null,
        [FromQuery] DateTimeOffset? startDate = null,
        [FromQuery] DateTimeOffset? endDate = null,
        [FromQuery] Guid? categoryId = null,
        [FromQuery] string? authorUsername = null,
        [FromQuery] bool? isPublished = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 100,
        CancellationToken cancellationToken = default)
    {
        try
        {
            if (page < 1) page = 1;
            if (pageSize < 1 || pageSize > 200) pageSize = 100;

            var query = dbContext.Blogs
                .AsNoTracking()
                .Include(b => b.Category)
                .Include(b => b.Authors)
                    .ThenInclude(ba => ba.User)
                .AsQueryable();

            if (isPublished.HasValue)
            {
                query = query.Where(b => b.IsPublished == isPublished.Value);
            }

            if (!string.IsNullOrWhiteSpace(search))
            {
                var searchLower = search.ToLower();
                query = query.Where(b =>
                    b.Title.ToLower().Contains(searchLower) ||
                    (b.Excerpt != null && b.Excerpt.ToLower().Contains(searchLower)) ||
                    b.Content.ToLower().Contains(searchLower));
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
                query = query.Where(b => b.Authors.Any(ba => ba.User.Username == authorUsername));
            }

            var blogs = await query
                .OrderByDescending(b => b.UpdatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(b => new BlogListItemResponse(
                    b.Id,
                    b.Title,
                    b.Slug,
                    b.Excerpt,
                    b.FeaturedImage,
                    b.Category != null ? new BlogCategoryResponse(
                        b.Category.Id,
                        b.Category.Name,
                        b.Category.Slug,
                        b.Category.Description,
                        b.Category.CreatedAt,
                        b.Category.UpdatedAt
                    ) : null,
                    b.Authors.OrderBy(ba => ba.Order).Select(ba => new BlogAuthorResponse(
                        ba.UserId,
                        ba.User.Username,
                        ba.User.DisplayName,
                        ba.Order
                    )).ToList(),
                    b.IsPublished,
                    b.PublishedAt,
                    b.CreatedAt,
                    b.UpdatedAt
                ))
                .ToListAsync(cancellationToken);

            var normalized = blogs
                .Select(b => b with { FeaturedImage = NormalizeBlogMediaUrl(b.FeaturedImage) })
                .ToList();

            return OkEnvelope(normalized);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to retrieve admin blog list");
            return Problem(
                StatusCodes.Status500InternalServerError,
                "Failed to retrieve admin blogs",
                "An unexpected error occurred while retrieving blogs for the admin panel.");
        }
    }

    /// <summary>
    /// Get a blog by ID
    /// </summary>
    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(ApiResponse<BlogDetailResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetBlog(Guid id, CancellationToken cancellationToken = default)
    {
        var blog = await GetBlogWithDetails(id, cancellationToken);
        
        if (blog is null)
        {
            return NotFoundProblem("Blog not found", $"No blog found with ID '{id}'.");
        }

        return OkEnvelope(blog);
    }

    /// <summary>
    /// Upload an image for blog use and get back the media controller URL.
    /// </summary>
    [HttpPost("upload-image")]
    [ProducesResponseType(typeof(ApiResponse<MediaUploadResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> UploadBlogImage(
        [FromForm] IFormFile? file,
        [FromForm] string? fileName,
        CancellationToken cancellationToken = default)
    {
        if (file is null || file.Length == 0)
        {
            return BadRequestProblem("No file uploaded", "Provide a non-empty file in the request body.");
        }

        try
        {
            var baseName = !string.IsNullOrWhiteSpace(fileName) ? fileName : Guid.NewGuid().ToString();
            var uploadResult = await UploadBlogFileAsync(file, baseName, cancellationToken);
            var mediaUrl = BuildBlogMediaUrl(uploadResult.BlobName);
            var response = new MediaUploadResponse(uploadResult.BlobName, mediaUrl);
            return OkEnvelope(response);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Blog image upload failed");
            return Problem(
                StatusCodes.Status500InternalServerError,
                "Image upload failed",
                "An unexpected error occurred while uploading the image.");
        }
    }

    /// <summary>
    /// Create a new blog post
    /// </summary>
    [HttpPost]
    [ProducesResponseType(typeof(ApiResponse<BlogDetailResponse>), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> CreateBlog(
        [FromBody] CreateBlogRequest request,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.Title))
        {
            return BadRequestProblem("Invalid title", "Blog title cannot be empty.");
        }

        try
        {
            // Generate slug
            var slug = !string.IsNullOrWhiteSpace(request.Slug) 
                ? GenerateSlug(request.Slug) 
                : GenerateSlug(request.Title);
            
            // Check if slug already exists
            var slugExists = await dbContext.Blogs
                .AnyAsync(b => b.Slug == slug, cancellationToken);
            
            if (slugExists)
            {
                slug = $"{slug}-{Guid.NewGuid().ToString().Substring(0, 8)}";
            }

            var blogId = request.Id ?? Guid.NewGuid();
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

            dbContext.Blogs.Add(blog);

            // Add Authors
            if (request.AuthorIds != null && request.AuthorIds.Count > 0)
            {
                // Verify users exist
                var existingUserIds = await dbContext.Users
                    .Where(u => request.AuthorIds.Contains(u.Id))
                    .Select(u => u.Id)
                    .ToListAsync(cancellationToken);

                int order = 0;
                foreach (var userId in request.AuthorIds)
                {
                    if (existingUserIds.Contains(userId))
                    {
                        dbContext.BlogAuthors.Add(new BlogAuthor
                        {
                            Id = Guid.NewGuid(),
                            BlogId = blogId,
                            UserId = userId,
                            Order = order++,
                            CreatedAt = now
                        });
                    }
                }
            }

            await dbContext.SaveChangesAsync(cancellationToken);

            // Create Content entry for the blog
            var contentSlug = slug;
            var existingContentSlug = await dbContext.Contents
                .AnyAsync(c => c.Slug == contentSlug, cancellationToken);
            
            if (existingContentSlug)
            {
                contentSlug = $"{slug}-{blog.Id.ToString().Substring(0, 8)}";
            }

            var content = new Content
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
            };

            dbContext.Contents.Add(content);
            await dbContext.SaveChangesAsync(cancellationToken);

            // Fetch created blog for response to ensure we have all includes
            var createdBlog = await GetBlogWithDetails(blogId, cancellationToken);
            if (createdBlog == null) return  Problem(StatusCodes.Status500InternalServerError, "Creation failed", "Could not retrieve created blog.");

            return Created($"/admin/blog/{blog.Id}", new ApiResponse<BlogDetailResponse>(createdBlog));
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to create blog");
            return Problem(
                StatusCodes.Status500InternalServerError,
                "Failed to create blog",
                "An unexpected error occurred while creating the blog.");
        }
    }

    /// <summary>
    /// Update an existing blog post
    /// </summary>
    [HttpPut("{id:guid}")]
    [ProducesResponseType(typeof(ApiResponse<BlogDetailResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateBlog(
        Guid id,
        [FromBody] UpdateBlogRequest request,
        CancellationToken cancellationToken = default)
    {
        var blog = await dbContext.Blogs
            .Include(b => b.Authors)
            .FirstOrDefaultAsync(b => b.Id == id, cancellationToken);

        if (blog is null)
        {
            return NotFoundProblem("Blog not found", $"No blog found with ID '{id}'.");
        }

        try
        {
            // Handle Slug Update
            var targetSlug = !string.IsNullOrWhiteSpace(request.Slug)
                ? GenerateSlug(request.Slug)
                : (request.Title != blog.Title ? GenerateSlug(request.Title) : blog.Slug);

            if (targetSlug != blog.Slug)
            {
                 var slugExists = await dbContext.Blogs
                    .AnyAsync(b => b.Slug == targetSlug && b.Id != id, cancellationToken);
                
                if (!slugExists)
                {
                    blog.Slug = targetSlug;
                }
                else 
                {
                     // If slug taken by another blog, append random
                     blog.Slug = $"{targetSlug}-{Guid.NewGuid().ToString().Substring(0, 8)}";
                }
            }
            
            blog.Title = request.Title;

            // Handle Image Update - Delete old image if changed
            if (request.FeaturedImage != blog.FeaturedImage && !string.IsNullOrWhiteSpace(blog.FeaturedImage))
            {
                try 
                {
                    var oldFeaturedBlobName = ExtractBlogBlobNameFromMediaUrl(blog.FeaturedImage);
                    if (!string.IsNullOrWhiteSpace(oldFeaturedBlobName))
                    {
                        await blobStorageService.DeleteBlobAsync(oldFeaturedBlobName, cancellationToken);
                    }
                }
                catch (Exception ex)
                {
                    logger.LogError(ex, "Failed to delete old image blob {BlobUrl}", blog.FeaturedImage);
                    // Swallow exception so we still update the blog record
                }
            }

            blog.Excerpt = request.Excerpt;
            blog.Content = request.Content;
            blog.FeaturedImage = NormalizeBlogMediaUrl(request.FeaturedImage);
            blog.CategoryId = request.CategoryId;
            
            // Handle Publishing logic
            if (request.IsPublished && !blog.IsPublished)
            {
                blog.PublishedAt = DateTimeOffset.UtcNow; // Set published date if newly published
            }
            blog.IsPublished = request.IsPublished;
            
            blog.UpdatedAt = DateTimeOffset.UtcNow;

            // Update associated Content entity
            var content = await dbContext.Contents
                .FirstOrDefaultAsync(c => c.ContentType == ContentType.Blog && c.ContentRefId == id, cancellationToken);
            
            if (content != null)
            {
                content.Title = blog.Title;
                
                // Update slug if blog slug changed (which happens if title changed)
                // We should try to keep them in sync, but handle uniqueness
                if (content.Slug != blog.Slug)
                {
                    var contentSlug = blog.Slug;
                    var existingContentSlug = await dbContext.Contents
                        .AnyAsync(c => c.Slug == contentSlug && c.Id != content.Id, cancellationToken);
                    
                    if (existingContentSlug)
                    {
                        contentSlug = $"{blog.Slug}-{content.Id.ToString().Substring(0, 8)}";
                    }
                    content.Slug = contentSlug;
                }

                content.IsPublished = blog.IsPublished;
                content.PublishedAt = blog.PublishedAt;
                content.UpdatedAt = DateTimeOffset.UtcNow;
            }
            else
            {
                // If content entry missing for some reason, create it
                 var contentSlug = blog.Slug;
                var existingContentSlug = await dbContext.Contents
                    .AnyAsync(c => c.Slug == contentSlug, cancellationToken);
                
                if (existingContentSlug)
                {
                    contentSlug = $"{blog.Slug}-{blog.Id.ToString().Substring(0, 8)}";
                }

                var newContent = new Content
                {
                    Id = Guid.NewGuid(),
                    ContentType = ContentType.Blog,
                    ContentRefId = blog.Id,
                    Title = blog.Title,
                    Slug = contentSlug,
                    IsPublished = blog.IsPublished,
                    PublishedAt = blog.PublishedAt,
                    CreatedAt = DateTimeOffset.UtcNow,
                    UpdatedAt = DateTimeOffset.UtcNow
                };
                dbContext.Contents.Add(newContent);
            }

            // Update Authors
            // Remove existing not in request
            var requestAuthorIds = request.AuthorIds ?? new List<Guid>();
            var authorsToRemove = blog.Authors.Where(a => !requestAuthorIds.Contains(a.UserId)).ToList();
            foreach (var author in authorsToRemove)
            {
                dbContext.BlogAuthors.Remove(author);
            }

            // Add new authors
            var existingAuthorUserIds = blog.Authors.Select(a => a.UserId).ToList();
            var newAuthorUserIds = requestAuthorIds.Where(uid => !existingAuthorUserIds.Contains(uid)).ToList();

            if (newAuthorUserIds.Count > 0)
            {
                // Verify users exist
                 var existingUsers = await dbContext.Users
                    .Where(u => newAuthorUserIds.Contains(u.Id))
                    .Select(u => u.Id)
                    .ToListAsync(cancellationToken);

                 int currentMaxOrder = blog.Authors.Any() ? blog.Authors.Max(a => a.Order) + 1 : 0;
                 foreach (var userId in requestAuthorIds) 
                 {
                    // Re-ordering logic could be complex. For now, just append new ones. 
                    // If full reorder is needed, we'd clear and re-add or specific index update.
                    // Simple approach: Add new ones at end.
                    if (existingUsers.Contains(userId) && !existingAuthorUserIds.Contains(userId))
                    {
                         dbContext.BlogAuthors.Add(new BlogAuthor
                        {
                            Id = Guid.NewGuid(),
                            BlogId = id,
                            UserId = userId,
                            Order = currentMaxOrder++,
                            CreatedAt = DateTimeOffset.UtcNow
                        });
                    }
                 }
            }
            
            // If strictly respecting order in request is required:
            // This simple implementation doesn't strictly reorder existing authors based on the request list order 
            // unless we rewrite the whole collection. For MVP, adding/removing is sufficient.

            // Handle Orphaned Content Images (Cleanup)
            try
            {
                // 1. Get all blobs associated with this blog's content (legacy and foldered naming)
                var legacyPrefix = $"blog-{id}-";
                var folderPrefix = $"blog/blog-{id}-";
                var storedBlobs = (await blobStorageService.ListBlobsByPrefixAsync(folderPrefix, cancellationToken))
                    .Concat(await blobStorageService.ListBlobsByPrefixAsync(legacyPrefix, cancellationToken))
                    .Distinct(StringComparer.OrdinalIgnoreCase)
                    .ToList();
                
                if (storedBlobs.Any())
                {
                    // 2. Identify images currently used in the new content
                    var usedBlobNames = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

                    foreach (var blobName in ExtractBlobNamesFromContent(request.Content))
                    {
                        usedBlobNames.Add(blobName);
                    }

                    // 3. Find orphans (Stored but not Used)
                    var orphans = storedBlobs.Where(b => !usedBlobNames.Contains(b)).ToList();

                    // 4. Delete orphans
                    foreach (var orphan in orphans)
                    {
                        await blobStorageService.DeleteBlobAsync(orphan, cancellationToken);
                        logger.LogInformation("Deleted orphaned content image {BlobName} for blog {BlogId}", orphan, id);
                    }
                }
            }
            catch (Exception ex) 
            {
                logger.LogError(ex, "Failed to clean up orphaned images for blog {BlogId}", id);
                // Non-critical, swallow exception to ensure blog update persists
            }

            await dbContext.SaveChangesAsync(cancellationToken);

            var updatedBlog = await GetBlogWithDetails(id, cancellationToken);
            if (updatedBlog == null) return Problem(StatusCodes.Status500InternalServerError, "Update failed", "Could not retrieve updated blog.");

            return OkEnvelope(updatedBlog);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to update blog {BlogId}", id);
            return Problem(
                StatusCodes.Status500InternalServerError,
                "Failed to update blog",
                "An unexpected error occurred while updating the blog.");
        }
    }

    /// <summary>
    /// Delete a blog
    /// </summary>
    [HttpDelete("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DeleteBlog(Guid id, CancellationToken cancellationToken = default)
    {
        var blog = await dbContext.Blogs
            .FirstOrDefaultAsync(b => b.Id == id, cancellationToken);

        if (blog is null)
        {
            return NotFoundProblem("Blog not found", $"No blog found with ID '{id}'.");
        }

        try
        {
            if (!string.IsNullOrWhiteSpace(blog.FeaturedImage))
            {
                 try 
                {
                    var featuredBlobName = ExtractBlogBlobNameFromMediaUrl(blog.FeaturedImage);
                    if (!string.IsNullOrWhiteSpace(featuredBlobName))
                    {
                        await blobStorageService.DeleteBlobAsync(featuredBlobName, cancellationToken);
                    }
                }
                catch (Exception ex)
                {
                    logger.LogError(ex, "Failed to delete image blob {BlobUrl}", blog.FeaturedImage);
                }
            }

            // Delete associated Content entity
            var content = await dbContext.Contents
                .FirstOrDefaultAsync(c => c.ContentType == ContentType.Blog && c.ContentRefId == id, cancellationToken);
            
            if (content != null)
            {
                // Delete all comments associated with this content
                await dbContext.Comments
                    .Where(c => c.ContentId == content.Id)
                    .ExecuteDeleteAsync(cancellationToken);

                dbContext.Contents.Remove(content);
            }

            dbContext.Blogs.Remove(blog);
            await dbContext.SaveChangesAsync(cancellationToken);

            return NoContent();
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to delete blog {BlogId}", id);
            return Problem(
                StatusCodes.Status500InternalServerError,
                "Failed to delete blog",
                "An unexpected error occurred while deleting the blog.");
        }
    }

    // Helper to get response DTO
    private async Task<BlogDetailResponse?> GetBlogWithDetails(Guid blogId, CancellationToken cancellationToken)
    {
        var response = await dbContext.Blogs
            .AsNoTracking()
            .Where(b => b.Id == blogId)
            .Select(b => new BlogDetailResponse(
                b.Id,
                dbContext.Contents.FirstOrDefault(c => c.ContentRefId == b.Id && c.ContentType == ContentType.Blog)!.Id,
                b.Title,
                b.Slug,
                b.Excerpt,
                b.Content,
                b.FeaturedImage,
                b.Category == null ? null : new BlogCategoryResponse(
                    b.Category.Id,
                    b.Category.Name,
                    b.Category.Slug,
                    b.Category.Description,
                    b.Category.CreatedAt,
                    b.Category.UpdatedAt
                ),
                b.Authors.OrderBy(a => a.Order).Select(a => new BlogAuthorResponse(
                    a.UserId,
                    a.User.Username,
                    a.User.DisplayName,
                    a.Order
                )).ToList(),
                b.IsPublished,
                b.PublishedAt,
                b.CreatedAt,
                b.UpdatedAt,
                0,
                false,
                0
            ))
            .FirstOrDefaultAsync(cancellationToken);

        return response is null
            ? null
            : response with { FeaturedImage = NormalizeBlogMediaUrl(response.FeaturedImage) };
    }

    private string GetBaseUrl()
    {
        var request = httpContextAccessor.HttpContext?.Request;
        if (request == null) return "http://localhost:5283";
        return $"{request.Scheme}://{request.Host}";
    }

    private string BuildBlogMediaUrl(string blobName)
    {
        var publicBlobName = StripBlogPrefix(blobName);
        return $"{GetBaseUrl()}{MediaPathPrefix}{publicBlobName}";
    }

    private async Task<BlobUploadResult> UploadBlogFileAsync(IFormFile file, string? blobName, CancellationToken cancellationToken)
    {
        await using var stream = file.OpenReadStream();
        await using var processedStream = await imageProcessingService.ProcessImageAsync(stream, cancellationToken);

        return await blobStorageService.UploadImageAsync(
            processedStream,
            file.FileName,
            "image/webp",
            string.IsNullOrWhiteSpace(blobName) ? null : EnsureBlogBlobName(blobName),
            cancellationToken);
    }

    private IEnumerable<string> ExtractBlobNamesFromContent(string content)
    {
        if (string.IsNullOrWhiteSpace(content))
        {
            yield break;
        }

        // Parse /media/... links from markdown/html and map to storage blob names.
        var matches = Regex.Matches(content, @"/media/([^\s\)""'<>]+)", RegexOptions.IgnoreCase);
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

    private static string? ExtractBlogBlobNameFromMediaUrl(string? mediaUrl)
    {
        if (string.IsNullOrWhiteSpace(mediaUrl))
        {
            return null;
        }

        if (!MediaUrlHelper.TryExtractMediaBlobName(mediaUrl.Trim(), out var blobName))
        {
            return null;
        }

        return EnsureBlogBlobName(blobName);
    }

    /// <summary>
    /// Generates a URL-friendly slug from a title
    /// </summary>
    private static string GenerateSlug(string title)
    {
        var slug = title.ToLowerInvariant();
        slug = Regex.Replace(slug, @"[^a-z0-9\s-]", "");
        slug = Regex.Replace(slug, @"\s+", "-");
        slug = Regex.Replace(slug, @"-+", "-");
        slug = slug.Trim('-');
        return slug;
    }

    private async Task<string> GenerateUniqueCategorySlug(string name, CancellationToken cancellationToken)
    {
        var baseSlug = GenerateSlug(name);
        var slug = baseSlug;
        var counter = 1;

        while (await dbContext.BlogCategories.AnyAsync(c => c.Slug == slug, cancellationToken))
        {
            slug = $"{baseSlug}-{counter}";
            counter++;
        }

        return slug;
    }
}
