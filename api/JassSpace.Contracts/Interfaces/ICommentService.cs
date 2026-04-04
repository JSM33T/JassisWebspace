using JassSpace.Contracts.Requests;
using JassSpace.Contracts.Responses;

namespace JassSpace.Contracts.Interfaces;

public enum CommentCreateStatus
{
    Success,
    InvalidText,
    ContentNotFound,
    ParentCommentNotFound,
    InvalidParentComment
}

public sealed record CommentCreateResult(
    CommentCreateStatus Status,
    CommentResponse? Response,
    string? ErrorMessage = null
);

public enum CommentUpdateStatus
{
    Success,
    InvalidText,
    CommentNotFound,
    Forbidden
}

public sealed record CommentUpdateResult(
    CommentUpdateStatus Status,
    CommentResponse? Response,
    string? ErrorMessage = null
);

public enum CommentDeleteStatus
{
    Success,
    CommentNotFound,
    Forbidden
}

public sealed record CommentDeleteResult(
    CommentDeleteStatus Status,
    string? ErrorMessage = null
);

public interface ICommentService
{
    Task<List<CommentResponse>> GetCommentsAsync(
        Guid contentId,
        CancellationToken cancellationToken = default);

    Task<CommentCreateResult> CreateCommentAsync(
        Guid userId,
        CreateCommentRequest request,
        CancellationToken cancellationToken = default);

    Task<CommentUpdateResult> UpdateCommentAsync(
        Guid commentId,
        Guid userId,
        UpdateCommentRequest request,
        CancellationToken cancellationToken = default);

    Task<CommentDeleteResult> DeleteCommentAsync(
        Guid commentId,
        Guid userId,
        bool isModeratorOrAdmin,
        CancellationToken cancellationToken = default);
}
