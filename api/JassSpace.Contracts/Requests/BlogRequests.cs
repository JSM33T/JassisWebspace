namespace JassSpace.Contracts.Requests;

public record CreateBlogRequest(
    Guid? Id,
    string Title,
    string? Excerpt,
    string Content,
    string? FeaturedImage,
    Guid? CategoryId,
    List<Guid>? AuthorIds,
    bool IsPublished
);

public record UpdateBlogRequest(
    string Title,
    string? Excerpt,
    string Content,
    string? FeaturedImage,
    Guid? CategoryId,
    List<Guid>? AuthorIds,
    bool IsPublished
);

public record CreateBlogCategoryRequest(
    string Name,
    string? Description
);

public record GetBlogsQueryParams(
    string? Search,
    DateTimeOffset? StartDate,
    DateTimeOffset? EndDate,
    Guid? CategoryId,
    int Page = 1,
    int PageSize = 10
);
