namespace JassSpace.Contracts.Responses;

public record CommentResponse(
    Guid Id,
    Guid ContentId,
    Guid? ParentCommentId,
    string Text,
    Guid UserId,
    string Username,
    string? UserDisplayName,
    string? UserAvatar,
    int ReplyCount,
    DateTimeOffset CreatedAt,
    DateTimeOffset? UpdatedAt
);

public record CommentTreeResponse(
    Guid Id,
    Guid ContentId,
    string Text,
    Guid UserId,
    string Username,
    string? UserDisplayName,
    string? UserAvatar,
    DateTimeOffset CreatedAt,
    DateTimeOffset? UpdatedAt,
    List<CommentTreeResponse> Replies
);
