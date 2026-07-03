namespace JassSpace.Contracts.Responses;

public record BlogCategoryResponse(
    Guid Id,
    string Name,
    string Slug,
    string? Description,
    DateTimeOffset CreatedAt,
    DateTimeOffset? UpdatedAt
);

public record BlogListItemResponse(
    Guid Id,
    string Title,
    string Slug,
    string? Excerpt,
    string? FeaturedImage,
    BlogCategoryResponse? Category,
    List<ContentAuthorResponse> Authors,
    bool IsPublished,
    DateTimeOffset? PublishedAt,
    DateTimeOffset CreatedAt,
    DateTimeOffset? UpdatedAt,
    int LikeCount = 0,
    int CommentCount = 0,
    int ViewCount = 0
);

public record BlogDetailResponse(
    Guid Id,
    Guid ContentId,
    string Title,
    string Slug,
    string? Excerpt,
    string Content,
    string? FeaturedImage,
    BlogCategoryResponse? Category,
    List<ContentAuthorResponse> Authors,
    bool IsPublished,
    DateTimeOffset? PublishedAt,
    DateTimeOffset CreatedAt,
    DateTimeOffset? UpdatedAt,
    int LikeCount = 0,
    bool IsLiked = false,
    int CommentCount = 0,
    int ViewCount = 0
);
