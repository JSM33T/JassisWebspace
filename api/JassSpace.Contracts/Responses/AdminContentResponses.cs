using System.Collections.Generic;

namespace JassSpace.Contracts.Responses;

public sealed record AdminContentUserSummaryResponse(
    Guid UserId,
    string Username,
    string? DisplayName,
    string? AvatarUrl
);

public sealed record AdminContentListItemResponse(
    Guid Id,
    string Title,
    string Slug,
    string ContentType,
    bool IsPublished,
    DateTimeOffset? PublishedAt,
    DateTimeOffset CreatedAt,
    DateTimeOffset? UpdatedAt,
    int LinkCount,
    int CommentCount,
    int LikeCount,
    DateTimeOffset LastActivityAt
);

public sealed record AdminContentDetailResponse(
    Guid Id,
    string Title,
    string Slug,
    string ContentType,
    bool IsPublished,
    DateTimeOffset? PublishedAt,
    DateTimeOffset CreatedAt,
    DateTimeOffset? UpdatedAt,
    int LinkCount,
    int CommentCount,
    int LikeCount,
    DateTimeOffset LastActivityAt,
    IReadOnlyCollection<AdminContentUserSummaryResponse> LikedBy,
    IReadOnlyCollection<AdminContentUserSummaryResponse> CommentedBy
);
