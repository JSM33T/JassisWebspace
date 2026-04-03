using JassSpace.Api.Configuration;
using JassSpace.Api.Filters;
using JassSpace.Api.Services;
using JassSpace.Contracts;
using JassSpace.Contracts.Interfaces;
using JassSpace.Contracts.Requests;
using JassSpace.Contracts.Responses;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace JassSpace.Api.Controllers;

[Route("blog")]
public sealed class BlogController(
    ILogger<BlogController> logger,
    IBlogService blogService,
    IHttpResponseCacheStore responseCacheStore)
    : BaseApiController
{
    [HttpGet]
    [CachedResponse(RedisCacheKeys.BlogList, TtlSeconds = 120, Scope = CacheScope.UserOrAnonymous, VaryByQuery = true)]
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
            var blogs = await blogService.GetBlogsAsync(
                search,
                startDate,
                endDate,
                categoryId,
                authorUsername,
                page,
                pageSize,
                cancellationToken);

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

    [HttpGet("{slug}")]
    [ProducesResponseType(typeof(ApiResponse<BlogDetailResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetBlogBySlug(string slug, CancellationToken cancellationToken = default)
    {
        try
        {
            Guid? currentUserId = Guid.TryParse(UserId, out var parsedUserId) ? parsedUserId : null;
            var blog = await blogService.GetBlogBySlugAsync(slug, currentUserId, cancellationToken);

            if (blog is null)
            {
                return NotFoundProblem("Blog not found", $"No blog found with slug '{slug}'.");
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

    [HttpGet("categories")]
    [CachedResponse(RedisCacheKeys.BlogCategory, TtlSeconds = 600, Scope = CacheScope.Anonymous, VaryByQuery = false)]
    [ProducesResponseType(typeof(ApiResponse<List<BlogCategoryResponse>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetCategories(CancellationToken cancellationToken = default)
    {
        try
        {
            var categories = await blogService.GetCategoriesAsync(cancellationToken);
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
            var result = await blogService.GetBlogsByCategoryAsync(categorySlug, page, pageSize, cancellationToken);

            return result.Status switch
            {
                BlogCategoryQueryStatus.Success => OkEnvelope(result.Blogs),
                BlogCategoryQueryStatus.CategoryNotFound => NotFoundProblem("Category not found", result.ErrorMessage),
                _ => Problem(
                    StatusCodes.Status500InternalServerError,
                    "Failed to retrieve blogs",
                    "An unexpected error occurred while retrieving blogs for the category.")
            };
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

    [HttpPost]
    [Authorize]
    [ProducesResponseType(typeof(ApiResponse<BlogDetailResponse>), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> CreateBlog([FromBody] CreateBlogRequest request, CancellationToken cancellationToken = default)
    {
        try
        {
            var result = await blogService.CreateBlogAsync(request, cancellationToken);

            switch (result.Status)
            {
                case BlogCreateStatus.Success:
                    await responseCacheStore.InvalidateByBaseKeyAsync(RedisCacheKeys.BlogList, cancellationToken);
                    await responseCacheStore.InvalidateByBaseKeyAsync(RedisCacheKeys.BlogSeo, cancellationToken);
                    return OkEnvelope(result.Response!);
                case BlogCreateStatus.InvalidTitle:
                    return BadRequestProblem("Invalid blog title", result.ErrorMessage);
                case BlogCreateStatus.InvalidContent:
                    return BadRequestProblem("Invalid blog content", result.ErrorMessage);
                case BlogCreateStatus.InvalidCategory:
                    return BadRequestProblem("Invalid category", result.ErrorMessage);
                case BlogCreateStatus.InvalidAuthors:
                    return BadRequestProblem("Invalid authors", result.ErrorMessage);
                default:
                    return Problem(
                        StatusCodes.Status500InternalServerError,
                        "Failed to create blog",
                        "An unexpected error occurred while creating the blog.");
            }
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

    [HttpPost("categories")]
    [Authorize]
    [ProducesResponseType(typeof(ApiResponse<BlogCategoryResponse>), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> CreateCategory([FromBody] CreateBlogCategoryRequest request, CancellationToken cancellationToken = default)
    {
        try
        {
            var result = await blogService.CreateCategoryAsync(request, cancellationToken);

            switch (result.Status)
            {
                case BlogCategoryCreateStatus.Success:
                    await responseCacheStore.InvalidateByBaseKeyAsync(RedisCacheKeys.BlogCategory, cancellationToken);
                    await responseCacheStore.InvalidateByBaseKeyAsync(RedisCacheKeys.BlogList, cancellationToken);
                    await responseCacheStore.InvalidateByBaseKeyAsync(RedisCacheKeys.BlogSeo, cancellationToken);
                    return OkEnvelope(result.Response!);
                case BlogCategoryCreateStatus.InvalidName:
                    return BadRequestProblem("Invalid category name", result.ErrorMessage);
                default:
                    return Problem(
                        StatusCodes.Status500InternalServerError,
                        "Failed to create category",
                        "An unexpected error occurred while creating the blog category.");
            }
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
}
