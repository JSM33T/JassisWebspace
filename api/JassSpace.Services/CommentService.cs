using JassSpace.Contracts.Interfaces;
using JassSpace.Contracts.Requests;
using JassSpace.Contracts.Responses;
using JassSpace.Data;
using JassSpace.Entities;
using Microsoft.EntityFrameworkCore;

namespace JassSpace.Services;

public sealed class CommentService(JassSpaceDbContext dbContext) : ICommentService
{
    private readonly JassSpaceDbContext _dbContext = dbContext;

    public async Task<List<CommentResponse>> GetCommentsAsync(
        Guid contentId,
        CancellationToken cancellationToken = default)
    {
        return await _dbContext.Comments
            .AsNoTracking()
            .Where(c => c.ContentId == contentId && !c.IsDeleted)
            .Include(c => c.User)
            .OrderBy(c => c.CreatedAt)
            .Select(c => new CommentResponse(
                c.Id,
                c.ContentId,
                c.ParentCommentId,
                c.Text,
                c.UserId,
                c.User.Username,
                c.User.DisplayName,
                c.User.AvatarUrl,
                c.Replies.Count(r => !r.IsDeleted),
                c.CreatedAt,
                c.UpdatedAt))
            .ToListAsync(cancellationToken);
    }

    public async Task<CommentCreateResult> CreateCommentAsync(
        Guid userId,
        CreateCommentRequest request,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.Text))
        {
            return new CommentCreateResult(
                CommentCreateStatus.InvalidText,
                null,
                "Comment text cannot be empty.");
        }

        var contentExists = await _dbContext.Contents
            .AsNoTracking()
            .AnyAsync(c => c.Id == request.ContentId, cancellationToken);

        if (!contentExists)
        {
            return new CommentCreateResult(
                CommentCreateStatus.ContentNotFound,
                null,
                $"No content found with ID '{request.ContentId}'.");
        }

        if (request.ParentCommentId.HasValue)
        {
            var parentComment = await _dbContext.Comments
                .AsNoTracking()
                .Where(c => c.Id == request.ParentCommentId.Value && !c.IsDeleted)
                .Select(c => new { c.ContentId })
                .FirstOrDefaultAsync(cancellationToken);

            if (parentComment is null)
            {
                return new CommentCreateResult(
                    CommentCreateStatus.ParentCommentNotFound,
                    null,
                    "The specified parent comment does not exist or has been deleted.");
            }

            if (parentComment.ContentId != request.ContentId)
            {
                return new CommentCreateResult(
                    CommentCreateStatus.InvalidParentComment,
                    null,
                    "Parent comment must belong to the same content.");
            }
        }

        var now = DateTimeOffset.UtcNow;
        var comment = new Comment
        {
            Id = Guid.NewGuid(),
            ContentId = request.ContentId,
            ParentCommentId = request.ParentCommentId,
            UserId = userId,
            Text = request.Text,
            CreatedAt = now,
            UpdatedAt = now
        };

        _dbContext.Comments.Add(comment);
        await _dbContext.SaveChangesAsync(cancellationToken);

        var user = await _dbContext.Users
            .AsNoTracking()
            .Where(u => u.Id == userId)
            .Select(u => new { u.Username, u.DisplayName, u.AvatarUrl })
            .FirstOrDefaultAsync(cancellationToken);

        return new CommentCreateResult(
            CommentCreateStatus.Success,
            new CommentResponse(
                comment.Id,
                comment.ContentId,
                comment.ParentCommentId,
                comment.Text,
                comment.UserId,
                user?.Username ?? "Unknown",
                user?.DisplayName,
                user?.AvatarUrl,
                0,
                comment.CreatedAt,
                comment.UpdatedAt));
    }

    public async Task<CommentUpdateResult> UpdateCommentAsync(
        Guid commentId,
        Guid userId,
        UpdateCommentRequest request,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.Text))
        {
            return new CommentUpdateResult(
                CommentUpdateStatus.InvalidText,
                null,
                "Comment text cannot be empty.");
        }

        var comment = await _dbContext.Comments
            .Include(c => c.User)
            .FirstOrDefaultAsync(c => c.Id == commentId, cancellationToken);

        if (comment is null || comment.IsDeleted)
        {
            return new CommentUpdateResult(
                CommentUpdateStatus.CommentNotFound,
                null,
                $"No comment found with ID '{commentId}'.");
        }

        if (comment.UserId != userId)
        {
            return new CommentUpdateResult(
                CommentUpdateStatus.Forbidden,
                null,
                "You are not authorized to edit this comment.");
        }

        comment.Text = request.Text;
        comment.UpdatedAt = DateTimeOffset.UtcNow;

        await _dbContext.SaveChangesAsync(cancellationToken);

        var replyCount = await _dbContext.Comments
            .AsNoTracking()
            .CountAsync(c => c.ParentCommentId == commentId && !c.IsDeleted, cancellationToken);

        return new CommentUpdateResult(
            CommentUpdateStatus.Success,
            new CommentResponse(
                comment.Id,
                comment.ContentId,
                comment.ParentCommentId,
                comment.Text,
                comment.UserId,
                comment.User.Username,
                comment.User.DisplayName,
                comment.User.AvatarUrl,
                replyCount,
                comment.CreatedAt,
                comment.UpdatedAt));
    }

    public async Task<CommentDeleteResult> DeleteCommentAsync(
        Guid commentId,
        Guid userId,
        bool isModeratorOrAdmin,
        CancellationToken cancellationToken = default)
    {
        var comment = await _dbContext.Comments
            .FirstOrDefaultAsync(c => c.Id == commentId, cancellationToken);

        if (comment is null || comment.IsDeleted)
        {
            return new CommentDeleteResult(
                CommentDeleteStatus.CommentNotFound,
                $"No comment found with ID '{commentId}'.");
        }

        if (comment.UserId != userId && !isModeratorOrAdmin)
        {
            return new CommentDeleteResult(
                CommentDeleteStatus.Forbidden,
                "You are not authorized to delete this comment.");
        }

        var allComments = await _dbContext.Comments
            .AsNoTracking()
            .Where(c => c.ContentId == comment.ContentId && !c.IsDeleted)
            .Select(c => new CommentNode(c.Id, c.ParentCommentId))
            .ToListAsync(cancellationToken);

        var commentsToDelete = new HashSet<Guid> { commentId };
        var stack = new Stack<Guid>();
        stack.Push(commentId);

        while (stack.Count > 0)
        {
            var currentId = stack.Pop();
            foreach (var child in allComments.Where(c => c.ParentCommentId == currentId))
            {
                if (commentsToDelete.Add(child.Id))
                {
                    stack.Push(child.Id);
                }
            }
        }

        await _dbContext.Comments
            .Where(c => commentsToDelete.Contains(c.Id))
            .ExecuteDeleteAsync(cancellationToken);

        return new CommentDeleteResult(CommentDeleteStatus.Success);
    }

    private sealed record CommentNode(Guid Id, Guid? ParentCommentId);
}
