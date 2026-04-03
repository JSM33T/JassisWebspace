using JassSpace.Contracts.Requests;
using JassSpace.Contracts.Responses;

namespace JassSpace.Contracts.Interfaces;

public enum BlogCreateStatus
{
    Success,
    InvalidTitle,
    InvalidContent,
    InvalidCategory,
    InvalidAuthors
}

public sealed record BlogCreateResult(
    BlogCreateStatus Status,
    BlogDetailResponse? Response,
    string? ErrorMessage = null
);

public enum BlogCategoryCreateStatus
{
    Success,
    InvalidName
}

public sealed record BlogCategoryCreateResult(
    BlogCategoryCreateStatus Status,
    BlogCategoryResponse? Response,
    string? ErrorMessage = null
);

public enum BlogCategoryQueryStatus
{
    Success,
    CategoryNotFound
}

public sealed record BlogCategoryBlogsResult(
    BlogCategoryQueryStatus Status,
    List<BlogListItemResponse> Blogs,
    string? ErrorMessage = null
);

public interface IBlogService
{
    Task<List<BlogListItemResponse>> GetBlogsAsync(
        string? search,
        DateTimeOffset? startDate,
        DateTimeOffset? endDate,
        Guid? categoryId,
        string? authorUsername,
        int page = 1,
        int pageSize = 10,
        CancellationToken cancellationToken = default);

    Task<BlogDetailResponse?> GetBlogBySlugAsync(
        string slug,
        Guid? currentUserId = null,
        CancellationToken cancellationToken = default);

    Task<List<BlogCategoryResponse>> GetCategoriesAsync(CancellationToken cancellationToken = default);

    Task<BlogCategoryBlogsResult> GetBlogsByCategoryAsync(
        string categorySlug,
        int page = 1,
        int pageSize = 10,
        CancellationToken cancellationToken = default);

    Task<BlogCreateResult> CreateBlogAsync(
        CreateBlogRequest request,
        CancellationToken cancellationToken = default);

    Task<BlogCategoryCreateResult> CreateCategoryAsync(
        CreateBlogCategoryRequest request,
        CancellationToken cancellationToken = default);
}
