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

/// <summary>
/// Admin endpoints for managing blogs
/// </summary>
[Route("admin/blog")]
[Authorize]
public sealed class AdminBlogController(
    IAdminBlogService adminBlogService,
    ILogger<AdminBlogController> logger,
    IHttpResponseCacheStore responseCacheStore)
    : BaseApiController
{
    /// <summary>
    /// Get all blog categories
    /// </summary>
    [HttpGet("categories")]
    [CachedResponse(RedisCacheKeys.BlogCategory, TtlSeconds = 600, Scope = CacheScope.Anonymous, VaryByQuery = false)]
    [ProducesResponseType(typeof(ApiResponse<List<BlogCategoryResponse>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetCategories(CancellationToken cancellationToken = default)
    {
        var categories = await adminBlogService.GetCategoriesAsync(cancellationToken);
        return OkEnvelope(categories);
    }

    [HttpPost("categories")]
    [Authorize(Roles = "admin,mod")]
    [ProducesResponseType(typeof(ApiResponse<BlogCategoryResponse>), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> CreateCategory(
        [FromBody] CreateBlogCategoryRequest request,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var result = await adminBlogService.CreateCategoryAsync(request, cancellationToken);
            if (result.Status != AdminBlogCategoryMutationStatus.Success)
            {
                return MapCategoryProblem(result, "Category operation failed");
            }

            await InvalidateCategoryCachesAsync(cancellationToken);
            return OkEnvelope(result.Category!);
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
    [Authorize(Roles = "admin,mod")]
    [ProducesResponseType(typeof(ApiResponse<BlogCategoryResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateCategory(
        Guid id,
        [FromBody] CreateBlogCategoryRequest request,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var result = await adminBlogService.UpdateCategoryAsync(id, request, cancellationToken);
            if (result.Status != AdminBlogCategoryMutationStatus.Success)
            {
                return MapCategoryProblem(result, "Category operation failed");
            }

            await InvalidateCategoryCachesAsync(cancellationToken);
            return OkEnvelope(result.Category!);
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
    /// Get list of users who can be blog authors
    /// </summary>
    [HttpGet("authors")]
    [Authorize(Roles = "admin,mod")]
    [ProducesResponseType(typeof(ApiResponse<List<BlogAuthorResponse>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAuthors(
        [FromQuery] string? search = null,
        [FromQuery] int take = 100,
        CancellationToken cancellationToken = default)
    {
        var authors = await adminBlogService.GetAuthorsAsync(search, take, cancellationToken);
        return OkEnvelope(authors);
    }

    [HttpGet]
    [Authorize(Roles = "admin,mod")]
    [ProducesResponseType(typeof(ApiResponse<List<BlogListItemResponse>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetBlogs(
        [FromQuery] GetBlogsQueryParams query,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var blogs = await adminBlogService.GetBlogsAsync(query, cancellationToken);
            return OkEnvelope(blogs);
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
        var result = await adminBlogService.GetBlogAsync(
            id,
            TryGetCurrentUserId(),
            IsPrivilegedUser(),
            cancellationToken);

        return result.Status switch
        {
            AdminBlogMutationStatus.Success => OkEnvelope(result.Blog!),
            AdminBlogMutationStatus.BlogNotFound => NotFoundProblem("Blog not found", result.ErrorMessage),
            AdminBlogMutationStatus.Forbidden => ForbiddenProblem(result.ErrorMessage ?? "You are not authorized to edit this blog."),
            _ => Problem(
                StatusCodes.Status500InternalServerError,
                "Failed to retrieve blog",
                "An unexpected error occurred while retrieving the blog.")
        };
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
            await using var stream = file.OpenReadStream();
            var response = await adminBlogService.UploadBlogImageAsync(
                new AdminMediaUploadInput(stream, file.FileName, fileName),
                GetBaseUrl(),
                cancellationToken);

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
    [Authorize(Roles = "admin,mod")]
    [ProducesResponseType(typeof(ApiResponse<BlogDetailResponse>), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> CreateBlog(
        [FromBody] CreateBlogRequest request,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var result = await adminBlogService.CreateBlogAsync(request, cancellationToken);
            if (result.Status != AdminBlogMutationStatus.Success)
            {
                return MapBlogMutationProblem(result);
            }

            await InvalidateBlogCachesAsync(cancellationToken);
            return Created(
                $"/admin/blog/{result.Blog!.Id}",
                new ApiResponse<BlogDetailResponse>(result.Blog));
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
        try
        {
            var result = await adminBlogService.UpdateBlogAsync(
                id,
                request,
                TryGetCurrentUserId(),
                IsPrivilegedUser(),
                cancellationToken);

            if (result.Status != AdminBlogMutationStatus.Success)
            {
                return MapBlogMutationProblem(result);
            }

            await InvalidateBlogCachesAsync(cancellationToken);
            return OkEnvelope(result.Blog!);
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
    [Authorize(Roles = "admin,mod")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DeleteBlog(Guid id, CancellationToken cancellationToken = default)
    {
        try
        {
            var result = await adminBlogService.DeleteBlogAsync(id, cancellationToken);
            if (result.Status == AdminBlogDeleteStatus.BlogNotFound)
            {
                return NotFoundProblem("Blog not found", result.ErrorMessage);
            }

            await InvalidateBlogCachesAsync(cancellationToken);
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

    private IActionResult MapCategoryProblem(
        AdminBlogCategoryMutationResult result,
        string fallbackTitle)
    {
        return result.Status switch
        {
            AdminBlogCategoryMutationStatus.InvalidName => BadRequestProblem("Invalid category name", result.ErrorMessage),
            AdminBlogCategoryMutationStatus.CategoryNotFound => NotFoundProblem("Category not found", result.ErrorMessage),
            _ => Problem(
                StatusCodes.Status500InternalServerError,
                fallbackTitle,
                "An unexpected error occurred while processing the category.")
        };
    }

    private IActionResult MapBlogMutationProblem(AdminBlogMutationResult result)
    {
        return result.Status switch
        {
            AdminBlogMutationStatus.InvalidTitle => BadRequestProblem("Invalid title", result.ErrorMessage),
            AdminBlogMutationStatus.BlogNotFound => NotFoundProblem("Blog not found", result.ErrorMessage),
            AdminBlogMutationStatus.Forbidden => ForbiddenProblem(result.ErrorMessage ?? "You are not authorized to edit this blog."),
            _ => Problem(
                StatusCodes.Status500InternalServerError,
                "Blog operation failed",
                "An unexpected error occurred while processing the blog.")
        };
    }

    private async Task InvalidateCategoryCachesAsync(CancellationToken cancellationToken)
    {
        await responseCacheStore.InvalidateByBaseKeyAsync(RedisCacheKeys.BlogCategory, cancellationToken);
        await responseCacheStore.InvalidateByBaseKeyAsync(RedisCacheKeys.BlogList, cancellationToken);
        await responseCacheStore.InvalidateByBaseKeyAsync(RedisCacheKeys.BlogSeo, cancellationToken);
    }

    private async Task InvalidateBlogCachesAsync(CancellationToken cancellationToken)
    {
        await responseCacheStore.InvalidateByBaseKeyAsync(RedisCacheKeys.BlogList, cancellationToken);
        await responseCacheStore.InvalidateByBaseKeyAsync(RedisCacheKeys.BlogSeo, cancellationToken);
    }

    private Guid? TryGetCurrentUserId()
    {
        return Guid.TryParse(UserId, out var currentUserId) ? currentUserId : null;
    }

    private bool IsPrivilegedUser()
    {
        return User.IsInRole("admin") || User.IsInRole("mod");
    }

    private string GetBaseUrl()
    {
        return $"{Request.Scheme}://{Request.Host}";
    }
}
