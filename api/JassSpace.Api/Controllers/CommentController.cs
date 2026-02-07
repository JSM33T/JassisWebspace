using JassSpace.Api.Extensions;
using JassSpace.Contracts;
using JassSpace.Contracts.Requests;
using JassSpace.Contracts.Responses;
using JassSpace.Data;
using JassSpace.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace JassSpace.Api.Controllers;

[Route("comments")]
public sealed class CommentController(
    JassSpaceDbContext dbContext,
    ILogger<CommentController> logger)
    : BaseApiController
{
    /// <summary>
    /// Get all comments for a specific content (e.g. Blog, Album).
    /// Returns a flat list that the client can organize into a tree, or we can build the tree here.
    /// For this implementation, we'll return a flat list of all comments for the content, 
    /// allowing the client to handle threading using ParentCommentId.
    /// </summary>
    [HttpGet("{contentId:guid}")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(ApiResponse<List<CommentResponse>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetComments(Guid contentId, CancellationToken cancellationToken = default)
    {
        try
        {
            var comments = await dbContext.Comments
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
                    c.Replies.Count(r => !r.IsDeleted), // Count only non-deleted replies
                    c.CreatedAt,
                    c.UpdatedAt
                ))
                .ToListAsync(cancellationToken);

            return OkEnvelope(comments);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to retrieve comments for content {ContentId}", contentId);
            return Problem(
                StatusCodes.Status500InternalServerError,
                "Failed to retrieve comments",
                "An unexpected error occurred while retrieving comments.");
        }
    }

    /// <summary>
    /// Add a new comment or reply.
    /// </summary>
    [HttpPost]
    [Authorize]
    [ProducesResponseType(typeof(ApiResponse<CommentResponse>), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> CreateComment(
        [FromBody] CreateCommentRequest request,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.Text))
        {
            return BadRequestProblem("Invalid comment", "Comment text cannot be empty.");
        }

        try
        {
            // Verify content exists
            var contentExists = await dbContext.Contents
                .AnyAsync(c => c.Id == request.ContentId, cancellationToken);
            
            if (!contentExists)
            {
                return NotFoundProblem("Content not found", $"No content found with ID '{request.ContentId}'.");
            }

            // Verify parent comment if provided
            if (request.ParentCommentId.HasValue)
            {
                var parentExists = await dbContext.Comments
                    .AnyAsync(c => c.Id == request.ParentCommentId && !c.IsDeleted, cancellationToken);
                
                if (!parentExists)
                {
                    return NotFoundProblem("Parent comment not found", "The specified parent comment does not exist or has been deleted.");
                }
            }

            if (UserId is null) return Unauthorized();
            var userId = Guid.Parse(UserId);
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

            dbContext.Comments.Add(comment);
            await dbContext.SaveChangesAsync(cancellationToken);

            // Fetch user details for response
            var user = await dbContext.Users
                .AsNoTracking()
                .FirstOrDefaultAsync(u => u.Id == userId, cancellationToken);

            var response = new CommentResponse(
                comment.Id,
                comment.ContentId,
                comment.ParentCommentId,
                comment.Text,
                comment.UserId,
                user?.Username ?? "Unknown",
                user?.DisplayName,
                user?.AvatarUrl,
                0, // No replies yet
                comment.CreatedAt,
                comment.UpdatedAt
            );

            return Created($"/comments/{comment.Id}", new ApiResponse<CommentResponse>(response));
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to create comment");
            return Problem(
                StatusCodes.Status500InternalServerError,
                "Failed to create comment",
                "An unexpected error occurred while creating the comment.");
        }
    }

    /// <summary>
    /// Update an existing comment.
    /// </summary>
    [HttpPut("{id:guid}")]
    [Authorize]
    [ProducesResponseType(typeof(ApiResponse<CommentResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateComment(
        Guid id,
        [FromBody] UpdateCommentRequest request,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.Text))
        {
            return BadRequestProblem("Invalid comment", "Comment text cannot be empty.");
        }

        var comment = await dbContext.Comments
            .Include(c => c.User)
            .FirstOrDefaultAsync(c => c.Id == id, cancellationToken);

        if (comment is null || comment.IsDeleted)
        {
            return NotFoundProblem("Comment not found", $"No comment found with ID '{id}'.");
        }

            if (UserId is null) return Unauthorized();
            var userId = Guid.Parse(UserId);
        
        // Check authorization (only author can update)
        // Note: Admins might want to moderate? For now, strictly author.
        if (comment.UserId != userId)
        {
            return ForbiddenProblem("You are not authorized to edit this comment.");
        }

        try
        {
            comment.Text = request.Text;
            comment.UpdatedAt = DateTimeOffset.UtcNow;

            await dbContext.SaveChangesAsync(cancellationToken);

            var replyCount = await dbContext.Comments
                .CountAsync(c => c.ParentCommentId == id && !c.IsDeleted, cancellationToken);

            var response = new CommentResponse(
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
                comment.UpdatedAt
            );

            return OkEnvelope(response);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to update comment {CommentId}", id);
            return Problem(
                StatusCodes.Status500InternalServerError,
                "Failed to update comment",
                "An unexpected error occurred while updating the comment.");
        }
    }

    /// <summary>
    /// Soft delete a comment.
    /// </summary>
    [HttpDelete("{id:guid}")]
    [Authorize]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DeleteComment(Guid id, CancellationToken cancellationToken = default)
    {
        var comment = await dbContext.Comments
            .FirstOrDefaultAsync(c => c.Id == id, cancellationToken);

        if (comment is null || comment.IsDeleted)
        {
            return NotFoundProblem("Comment not found", $"No comment found with ID '{id}'.");
        }

        if (UserId is null) return Unauthorized();
        var userId = Guid.Parse(UserId);
        
        // Determine if user is admin/mod
        var isModOrAdmin = User.IsInRole("admin") || User.IsInRole("mod");

        if (comment.UserId != userId && !isModOrAdmin)
        {
            return ForbiddenProblem("You are not authorized to delete this comment.");
        }

        try
        {
            // Fetch all comments for this content to find descendants efficiently in-memory
            var allComments = await dbContext.Comments
                .Where(c => c.ContentId == comment.ContentId && !c.IsDeleted)
                .Select(c => new { c.Id, c.ParentCommentId }) // Select only needed fields
                .ToListAsync(cancellationToken);

            var commentsToDelete = new HashSet<Guid>();
            var stack = new Stack<Guid>();
            
            stack.Push(id);
            commentsToDelete.Add(id);

            while (stack.Count > 0)
            {
                var currentId = stack.Pop();
                var children = allComments.Where(c => c.ParentCommentId == currentId).ToList();
                
                foreach (var child in children)
                {
                    if (!commentsToDelete.Contains(child.Id))
                    {
                        commentsToDelete.Add(child.Id);
                        stack.Push(child.Id);
                    }
                }
            }

            logger.LogInformation("Hard deleting comment {CommentId} and {Count} descendants", id, commentsToDelete.Count - 1);

            // Batch delete all identified comments
            await dbContext.Comments
                .Where(c => commentsToDelete.Contains(c.Id))
                .ExecuteDeleteAsync(cancellationToken);

            return NoContent();
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to delete comment {CommentId}", id);
            return Problem(
                StatusCodes.Status500InternalServerError,
                "Failed to delete comment",
                "An unexpected error occurred while deleting the comment.");
        }
    }
}
