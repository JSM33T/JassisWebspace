using JassSpace.Contracts.Requests;
using JassSpace.Contracts.Responses;

namespace JassSpace.Contracts.Interfaces;

public enum AdminBlogCategoryMutationStatus
{
    Success,
    InvalidName,
    CategoryNotFound
}

public sealed record AdminBlogCategoryMutationResult(
    AdminBlogCategoryMutationStatus Status,
    BlogCategoryResponse? Category = null,
    string? ErrorMessage = null
);

public enum AdminBlogMutationStatus
{
    Success,
    InvalidTitle,
    BlogNotFound,
    Forbidden
}

public sealed record AdminBlogMutationResult(
    AdminBlogMutationStatus Status,
    BlogDetailResponse? Blog = null,
    string? ErrorMessage = null
);

public enum AdminBlogDeleteStatus
{
    Success,
    BlogNotFound
}

public sealed record AdminBlogDeleteResult(
    AdminBlogDeleteStatus Status,
    string? ErrorMessage = null
);

public interface IAdminBlogService
{
    Task<List<BlogCategoryResponse>> GetCategoriesAsync(CancellationToken cancellationToken = default);

    Task<AdminBlogCategoryMutationResult> CreateCategoryAsync(
        CreateBlogCategoryRequest request,
        CancellationToken cancellationToken = default);

    Task<AdminBlogCategoryMutationResult> UpdateCategoryAsync(
        Guid id,
        CreateBlogCategoryRequest request,
        CancellationToken cancellationToken = default);

    Task<List<ContentAuthorResponse>> GetAuthorsAsync(
        string? search = null,
        int take = 100,
        CancellationToken cancellationToken = default);

    Task<List<BlogListItemResponse>> GetBlogsAsync(
        GetBlogsQueryParams query,
        CancellationToken cancellationToken = default);

    Task<AdminBlogMutationResult> GetBlogAsync(
        Guid id,
        Guid? currentUserId,
        bool canEditAll,
        CancellationToken cancellationToken = default);

    Task<MediaUploadResponse> UploadBlogImageAsync(
        AdminMediaUploadInput file,
        string mediaBaseUrl,
        CancellationToken cancellationToken = default);

    Task<AdminBlogMutationResult> CreateBlogAsync(
        CreateBlogRequest request,
        CancellationToken cancellationToken = default);

    Task<AdminBlogMutationResult> UpdateBlogAsync(
        Guid id,
        UpdateBlogRequest request,
        Guid? currentUserId,
        bool canEditAll,
        CancellationToken cancellationToken = default);

    Task<AdminBlogDeleteResult> DeleteBlogAsync(
        Guid id,
        CancellationToken cancellationToken = default);
}
