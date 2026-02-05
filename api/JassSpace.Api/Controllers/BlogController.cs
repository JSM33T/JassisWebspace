using JassSpace.Api.Extensions;
using JassSpace.Contracts;
using JassSpace.Contracts.Requests;
using JassSpace.Contracts.Responses;
using JassSpace.Data;
using JassSpace.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Text.RegularExpressions;

namespace JassSpace.Api.Controllers;

[Route("blog")]
public sealed class BlogController(
    JassSpaceDbContext dbContext,
    ILogger<BlogController> logger)
    : BaseApiController
{
    /// <summary>
    /// Gets all published blogs with optional filters (search, date range, category).
    /// </summary>
    [HttpGet]
    [ProducesResponseType(typeof(ApiResponse<List<BlogListItemResponse>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetBlogs(
        [FromQuery] string? search,
        [FromQuery] DateTimeOffset? startDate,
        [FromQuery] DateTimeOffset? endDate,
        [FromQuery] Guid? categoryId,
        [FromQuery] string? authorUsername,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 10,
        CancellationToken cancellationToken = default)
    {
        try
        {
            // Validate pagination
            if (page < 1) page = 1;
            if (pageSize < 1 || pageSize > 100) pageSize = 10;

            var query = dbContext.Blogs
                .Include(b => b.Category)
                .Include(b => b.Authors)
                    .ThenInclude(ba => ba.User)
                .Where(b => b.IsPublished);

            // Apply search filter
            if (!string.IsNullOrWhiteSpace(search))
            {
                var searchLower = search.ToLower();
                query = query.Where(b =>
                    b.Title.ToLower().Contains(searchLower) ||
                    (b.Excerpt != null && b.Excerpt.ToLower().Contains(searchLower)) ||
                    b.Content.ToLower().Contains(searchLower));
            }

            // Apply date range filter
            if (startDate.HasValue)
            {
                query = query.Where(b => b.PublishedAt >= startDate.Value);
            }

            if (endDate.HasValue)
            {
                query = query.Where(b => b.PublishedAt <= endDate.Value);
            }

            // Apply category filter
            if (categoryId.HasValue)
            {
                query = query.Where(b => b.CategoryId == categoryId.Value);
            }

            // Apply author filter
            if (!string.IsNullOrWhiteSpace(authorUsername))
            {
                query = query.Where(b => b.Authors.Any(ba => ba.User.Username == authorUsername));
            }

            // Get total count for pagination
            var totalCount = await query.CountAsync(cancellationToken);

            // Apply pagination and ordering
            var blogs = await query
                .OrderByDescending(b => b.PublishedAt)
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
                    b.Authors
                        .OrderBy(ba => ba.Order)
                        .Select(ba => new BlogAuthorResponse(
                            ba.UserId,
                            ba.User.Username,
                            ba.User.DisplayName,
                            ba.Order
                        ))
                        .ToList(),
                    b.IsPublished,
                    b.PublishedAt,
                    b.CreatedAt,
                    b.UpdatedAt
                ))
                .ToListAsync(cancellationToken);

            return OkEnvelope(blogs);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to retrieve blogs");
            return Problem(
                StatusCodes.Status500InternalServerError,
                "Failed to retrieve blogs",
                "An unexpected error occurred while retrieving blogs.");
        }
    }

    /// <summary>
    /// Gets a specific blog by slug.
    /// </summary>
    [HttpGet("{slug}")]
    [ProducesResponseType(typeof(ApiResponse<BlogDetailResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetBlogBySlug(string slug, CancellationToken cancellationToken = default)
    {
        try
        {
            var blog = await dbContext.Blogs
                .Include(b => b.Category)
                .Include(b => b.Authors)
                    .ThenInclude(ba => ba.User)
                .Where(b => b.Slug == slug && b.IsPublished)
                .Select(b => new BlogDetailResponse(
                    b.Id,
                    b.Title,
                    b.Slug,
                    b.Excerpt,
                    b.Content,
                    b.FeaturedImage,
                    b.Category != null ? new BlogCategoryResponse(
                        b.Category.Id,
                        b.Category.Name,
                        b.Category.Slug,
                        b.Category.Description,
                        b.Category.CreatedAt,
                        b.Category.UpdatedAt
                    ) : null,
                    b.Authors
                        .OrderBy(ba => ba.Order)
                        .Select(ba => new BlogAuthorResponse(
                            ba.UserId,
                            ba.User.Username,
                            ba.User.DisplayName,
                            ba.Order
                        ))
                        .ToList(),
                    b.IsPublished,
                    b.PublishedAt,
                    b.CreatedAt,
                    b.UpdatedAt
                ))
                .FirstOrDefaultAsync(cancellationToken);

            if (blog is null)
            {
                return NotFoundProblem("Blog not found", $"No published blog found with slug '{slug}'.");
            }

            return OkEnvelope(blog);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to retrieve blog with slug {Slug}", slug);
            return Problem(
                StatusCodes.Status500InternalServerError,
                "Failed to retrieve blog",
                "An unexpected error occurred while retrieving the blog.");
        }
    }

    /// <summary>
    /// Gets all blog categories.
    /// </summary>
    [HttpGet("categories")]
    [ProducesResponseType(typeof(ApiResponse<List<BlogCategoryResponse>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetCategories(CancellationToken cancellationToken = default)
    {
        try
        {
            var categories = await dbContext.BlogCategories
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
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to retrieve blog categories");
            return Problem(
                StatusCodes.Status500InternalServerError,
                "Failed to retrieve categories",
                "An unexpected error occurred while retrieving blog categories.");
        }
    }

    /// <summary>
    /// Gets all blogs for a specific category.
    /// </summary>
    [HttpGet("categories/{categorySlug}/blogs")]
    [ProducesResponseType(typeof(ApiResponse<List<BlogListItemResponse>>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetBlogsByCategory(
        string categorySlug,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 10,
        CancellationToken cancellationToken = default)
    {
        try
        {
            // Validate pagination
            if (page < 1) page = 1;
            if (pageSize < 1 || pageSize > 100) pageSize = 10;

            // Find category
            var category = await dbContext.BlogCategories
                .FirstOrDefaultAsync(c => c.Slug == categorySlug, cancellationToken);

            if (category is null)
            {
                return NotFoundProblem("Category not found", $"No category found with slug '{categorySlug}'.");
            }

            var blogs = await dbContext.Blogs
                .Include(b => b.Category)
                .Include(b => b.Authors)
                    .ThenInclude(ba => ba.User)
                .Where(b => b.CategoryId == category.Id && b.IsPublished)
                .OrderByDescending(b => b.PublishedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(b => new BlogListItemResponse(
                    b.Id,
                    b.Title,
                    b.Slug,
                    b.Excerpt,
                    b.FeaturedImage,
                    new BlogCategoryResponse(
                        category.Id,
                        category.Name,
                        category.Slug,
                        category.Description,
                        category.CreatedAt,
                        category.UpdatedAt
                    ),
                    b.Authors
                        .OrderBy(ba => ba.Order)
                        .Select(ba => new BlogAuthorResponse(
                            ba.UserId,
                            ba.User.Username,
                            ba.User.DisplayName,
                            ba.Order
                        ))
                        .ToList(),
                    b.IsPublished,
                    b.PublishedAt,
                    b.CreatedAt,
                    b.UpdatedAt
                ))
                .ToListAsync(cancellationToken);

            return OkEnvelope(blogs);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to retrieve blogs for category {CategorySlug}", categorySlug);
            return Problem(
                StatusCodes.Status500InternalServerError,
                "Failed to retrieve blogs",
                "An unexpected error occurred while retrieving blogs for the category.");
        }
    }

    /// <summary>
    /// Creates a new blog post.
    /// </summary>
    [HttpPost]
    [Authorize]
    [ProducesResponseType(typeof(ApiResponse<BlogDetailResponse>), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> CreateBlog([FromBody] CreateBlogRequest request, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.Title))
        {
            return BadRequestProblem("Invalid blog title", "Blog title cannot be empty.");
        }

        if (string.IsNullOrWhiteSpace(request.Content))
        {
            return BadRequestProblem("Invalid blog content", "Blog content cannot be empty.");
        }

        try
        {
            // Validate category if provided
            if (request.CategoryId.HasValue)
            {
                var categoryExists = await dbContext.BlogCategories
                    .AnyAsync(c => c.Id == request.CategoryId.Value, cancellationToken);

                if (!categoryExists)
                {
                    return BadRequestProblem("Invalid category", $"No category found with ID '{request.CategoryId.Value}'.");
                }
            }

            // Validate authors if provided
            if (request.AuthorIds != null && request.AuthorIds.Any())
            {
                var validAuthorIds = await dbContext.Users
                    .Where(u => request.AuthorIds.Contains(u.Id))
                    .Select(u => u.Id)
                    .ToListAsync(cancellationToken);

                if (validAuthorIds.Count != request.AuthorIds.Count)
                {
                    return BadRequestProblem("Invalid authors", "One or more author IDs are invalid.");
                }
            }

            var slug = await GenerateUniqueBlogSlug(request.Title, cancellationToken);
            var now = DateTimeOffset.UtcNow;

            var blog = new Blog
            {
                Id = Guid.NewGuid(),
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

            // Add authors
            if (request.AuthorIds != null && request.AuthorIds.Any())
            {
                for (int i = 0; i < request.AuthorIds.Count; i++)
                {
                    var blogAuthor = new BlogAuthor
                    {
                        Id = Guid.NewGuid(),
                        BlogId = blog.Id,
                        UserId = request.AuthorIds[i],
                        Order = i,
                        CreatedAt = now
                    };
                    dbContext.BlogAuthors.Add(blogAuthor);
                }
            }

            await dbContext.SaveChangesAsync(cancellationToken);

            // Reload blog with all relationships
            var createdBlog = await dbContext.Blogs
                .Include(b => b.Category)
                .Include(b => b.Authors)
                    .ThenInclude(ba => ba.User)
                .Where(b => b.Id == blog.Id)
                .Select(b => new BlogDetailResponse(
                    b.Id,
                    b.Title,
                    b.Slug,
                    b.Excerpt,
                    b.Content,
                    b.FeaturedImage,
                    b.Category != null ? new BlogCategoryResponse(
                        b.Category.Id,
                        b.Category.Name,
                        b.Category.Slug,
                        b.Category.Description,
                        b.Category.CreatedAt,
                        b.Category.UpdatedAt
                    ) : null,
                    b.Authors
                        .OrderBy(ba => ba.Order)
                        .Select(ba => new BlogAuthorResponse(
                            ba.UserId,
                            ba.User.Username,
                            ba.User.DisplayName,
                            ba.Order
                        ))
                        .ToList(),
                    b.IsPublished,
                    b.PublishedAt,
                    b.CreatedAt,
                    b.UpdatedAt
                ))
                .FirstAsync(cancellationToken);

            return OkEnvelope(createdBlog);
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
    /// Creates a new blog category.
    /// </summary>
    [HttpPost("categories")]
    [Authorize]
    [ProducesResponseType(typeof(ApiResponse<BlogCategoryResponse>), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> CreateCategory([FromBody] CreateBlogCategoryRequest request, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
        {
            return BadRequestProblem("Invalid category name", "Category name cannot be empty.");
        }

        try
        {
            var slug = await GenerateUniqueCategorySlug(request.Name, cancellationToken);
            var now = DateTimeOffset.UtcNow;

            var category = new BlogCategory
            {
                Id = Guid.NewGuid(),
                Name = request.Name,
                Slug = slug,
                Description = request.Description,
                CreatedAt = now,
                UpdatedAt = now
            };

            dbContext.BlogCategories.Add(category);
            await dbContext.SaveChangesAsync(cancellationToken);

            var response = new BlogCategoryResponse(
                category.Id,
                category.Name,
                category.Slug,
                category.Description,
                category.CreatedAt,
                category.UpdatedAt
            );

            return OkEnvelope(response);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to create blog category");
            return Problem(
                StatusCodes.Status500InternalServerError,
                "Failed to create category",
                "An unexpected error occurred while creating the blog category.");
        }
    }

    /// <summary>
    /// Generates a URL-friendly slug from a title.
    /// </summary>
    private static string GenerateSlug(string title)
    {
        // Convert to lowercase
        var slug = title.ToLowerInvariant();

        // Remove special characters and replace spaces with hyphens
        slug = Regex.Replace(slug, @"[^a-z0-9\s-]", "");
        slug = Regex.Replace(slug, @"\s+", "-");
        slug = Regex.Replace(slug, @"-+", "-");

        // Trim hyphens from start and end
        slug = slug.Trim('-');

        return slug;
    }

    /// <summary>
    /// Generates a unique slug for a blog post.
    /// </summary>
    private async Task<string> GenerateUniqueBlogSlug(string title, CancellationToken cancellationToken)
    {
        var baseSlug = GenerateSlug(title);
        var slug = baseSlug;
        var counter = 1;

        while (await dbContext.Blogs.AnyAsync(b => b.Slug == slug, cancellationToken))
        {
            slug = $"{baseSlug}-{counter}";
            counter++;
        }

        return slug;
    }

    /// <summary>
    /// Generates a unique slug for a blog category.
    /// </summary>
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
