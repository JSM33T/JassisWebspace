using Hangfire;
using Hangfire.Common;
using Hangfire.States;
using JassSpace.Api.Configuration;
using JassSpace.Api.Jobs;
using JassSpace.Api.Extensions;
using JassSpace.Contracts;
using JassSpace.Contracts.Interfaces;
using JassSpace.Contracts.Requests;
using JassSpace.Contracts.Responses;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;

namespace JassSpace.Api.Controllers;

[Route("comments")]
public sealed class CommentController(
    ICommentService commentService,
    IBackgroundJobClient backgroundJobClient,
    IOptions<HangfireSettings> hangfireSettings,
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
            var comments = await commentService.GetCommentsAsync(contentId, cancellationToken);
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
        try
        {
            if (UserId is null) return Unauthorized();
            var userId = Guid.Parse(UserId);
            var result = await commentService.CreateCommentAsync(userId, request, cancellationToken);

            switch (result.Status)
            {
                case CommentCreateStatus.Success:
                    var createdComment = result.Response!;
                    var queueName = string.IsNullOrWhiteSpace(hangfireSettings.Value.QueueName) ? "emails" : hangfireSettings.Value.QueueName;
                    backgroundJobClient.Create(
                        Job.FromExpression<ICommentNotificationJob>(job => job.EnqueueForCommentAsync(createdComment.Id)),
                        new EnqueuedState(queueName));

                    logger.LogInformation(
                        "Queued comment notification orchestration for comment {CommentId} on queue {QueueName}.",
                        createdComment.Id,
                        queueName);

                    return Created($"/comments/{createdComment.Id}", new ApiResponse<CommentResponse>(createdComment));
                case CommentCreateStatus.InvalidText:
                    return BadRequestProblem("Invalid comment", result.ErrorMessage);
                case CommentCreateStatus.InvalidParentComment:
                    return BadRequestProblem("Invalid parent comment", result.ErrorMessage);
                case CommentCreateStatus.ContentNotFound:
                    return NotFoundProblem("Content not found", result.ErrorMessage);
                case CommentCreateStatus.ParentCommentNotFound:
                    return NotFoundProblem("Parent comment not found", result.ErrorMessage);
                default:
                    return Problem(
                        StatusCodes.Status500InternalServerError,
                        "Failed to create comment",
                        "An unexpected error occurred while creating the comment.");
            }
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
        if (UserId is null) return Unauthorized();
        var userId = Guid.Parse(UserId);

        try
        {
            var result = await commentService.UpdateCommentAsync(id, userId, request, cancellationToken);
            return result.Status switch
            {
                CommentUpdateStatus.Success => OkEnvelope(result.Response!),
                CommentUpdateStatus.InvalidText => BadRequestProblem("Invalid comment", result.ErrorMessage),
                CommentUpdateStatus.CommentNotFound => NotFoundProblem("Comment not found", result.ErrorMessage),
                CommentUpdateStatus.Forbidden => ForbiddenProblem(result.ErrorMessage ?? "You are not authorized to edit this comment."),
                _ => Problem(
                    StatusCodes.Status500InternalServerError,
                    "Failed to update comment",
                    "An unexpected error occurred while updating the comment.")
            };
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
        if (UserId is null) return Unauthorized();
        var userId = Guid.Parse(UserId);
        var isModOrAdmin = User.IsInRole("admin") || User.IsInRole("mod");

        try
        {
            var result = await commentService.DeleteCommentAsync(id, userId, isModOrAdmin, cancellationToken);
            return result.Status switch
            {
                CommentDeleteStatus.Success => NoContent(),
                CommentDeleteStatus.CommentNotFound => NotFoundProblem("Comment not found", result.ErrorMessage),
                CommentDeleteStatus.Forbidden => ForbiddenProblem(result.ErrorMessage ?? "You are not authorized to delete this comment."),
                _ => Problem(
                    StatusCodes.Status500InternalServerError,
                    "Failed to delete comment",
                    "An unexpected error occurred while deleting the comment.")
            };
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
