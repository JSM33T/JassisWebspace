using JassSpace.Api.Extensions;
using JassSpace.Contracts;
using JassSpace.Contracts.Requests;
using JassSpace.Contracts.Responses;
using JassSpace.Data;
using JassSpace.Entities;
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
    ILogger<AdminBlogController> logger)
    : BaseApiController
{
    /// <summary>
    /// Get all blog categories
    /// </summary>
    [HttpGet("categories")]
    [ProducesResponseType(typeof(ApiResponse<List<BlogCategoryResponse>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetCategories(CancellationToken cancellationToken = default)
    {
        var categories = await dbContext.BlogCategories
            .AsNoTracking()
            .OrderBy(c => c.Name)
            .Select(c => new BlogCategoryResponse(
                c.Id,
                c.Name,
                c.Slug,
                c.Description,
                c.CreatedAt,
                c.UpdatedAt
            ))
            .ToListAsync(cancellationToken);

        return OkEnvelope(categories);
    }

    /// <summary>
    /// Get list of users who can be blog authors (admin or mod roles)
    /// </summary>
    [HttpGet("authors")]
    [ProducesResponseType(typeof(ApiResponse<List<BlogAuthorResponse>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAuthors(CancellationToken cancellationToken = default)
    {
        // Find users with admin or mod roles
        var authors = await dbContext.Users
            .AsNoTracking()
            .Where(u => u.UserRoles.Any(ur => ur.Role.Name == "admin" || ur.Role.Name == "mod"))
            .OrderBy(u => u.FirstName).ThenBy(u => u.LastName)
            .Select(u => new BlogAuthorResponse(
                u.Id,
                u.Username,
                u.DisplayName ?? $"{u.FirstName} {u.LastName}".Trim(),
                0 // Order not applicable for potential authors list
            ))
            .ToListAsync(cancellationToken);

        return OkEnvelope(authors);
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
            var slug = GenerateSlug(request.Title);
            
            // Check if slug already exists
            var slugExists = await dbContext.Blogs
                .AnyAsync(b => b.Slug == slug, cancellationToken);
            
            if (slugExists)
            {
                slug = $"{slug}-{Guid.NewGuid().ToString().Substring(0, 8)}";
            }

            var blogId = Guid.NewGuid();
            var now = DateTimeOffset.UtcNow;

            var blog = new Blog
            {
                Id = blogId,
                Title = request.Title,
                Slug = slug,
                Excerpt = request.Excerpt,
                Content = request.Content,
                FeaturedImage = request.FeaturedImage,
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
            // Update slug if title changed
            if (request.Title != blog.Title)
            {
                blog.Title = request.Title;
                var newSlug = GenerateSlug(request.Title);
                
                var slugExists = await dbContext.Blogs
                    .AnyAsync(b => b.Slug == newSlug && b.Id != id, cancellationToken);
                
                if (!slugExists)
                {
                    blog.Slug = newSlug;
                }
                else 
                {
                     // If slug taken by another blog, append random
                     blog.Slug = $"{newSlug}-{Guid.NewGuid().ToString().Substring(0, 8)}";
                }
            }

            blog.Excerpt = request.Excerpt;
            blog.Content = request.Content;
            blog.FeaturedImage = request.FeaturedImage;
            blog.CategoryId = request.CategoryId;
            
            // Handle Publishing logic
            if (request.IsPublished && !blog.IsPublished)
            {
                blog.PublishedAt = DateTimeOffset.UtcNow; // Set published date if newly published
            }
            blog.IsPublished = request.IsPublished;
            
            blog.UpdatedAt = DateTimeOffset.UtcNow;

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
        return await dbContext.Blogs
            .AsNoTracking()
            .Where(b => b.Id == blogId)
            .Select(b => new BlogDetailResponse(
                b.Id,
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
                b.UpdatedAt
            ))
            .FirstOrDefaultAsync(cancellationToken);
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
}
