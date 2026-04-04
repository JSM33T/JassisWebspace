using JassSpace.Api.Extensions;
using JassSpace.Contracts;
using JassSpace.Contracts.Interfaces;
using JassSpace.Contracts.Responses;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace JassSpace.Api.Controllers;

[Route("likes")]
public sealed class LikeController(
    ILikeService likeService,
    ILogger<LikeController> logger)
    : BaseApiController
{
    /// <summary>
    /// Toggle like status for a content.
    /// </summary>
    [HttpPost("{contentId:guid}")]
    [Authorize]
    [ProducesResponseType(typeof(ApiResponse<LikeStatusResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> ToggleLike(Guid contentId, CancellationToken cancellationToken = default)
    {
        if (UserId is null) return Unauthorized();
        var userId = Guid.Parse(UserId);

        try
        {
            var result = await likeService.ToggleLikeAsync(contentId, userId, cancellationToken);
            return result.Status switch
            {
                LikeStatusQueryStatus.Success => OkEnvelope(result.Response!),
                LikeStatusQueryStatus.ContentNotFound => NotFoundProblem("Content not found", result.ErrorMessage),
                _ => Problem(
                    StatusCodes.Status500InternalServerError,
                    "Failed to update like status",
                    "An unexpected error occurred.")
            };
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to toggle like for content {ContentId}", contentId);
            return Problem(
                StatusCodes.Status500InternalServerError,
                "Failed to update like status",
                "An unexpected error occurred.");
        }
    }

    /// <summary>
    /// Get like count and current-user like status for a content.
    /// </summary>
    [HttpGet("{contentId:guid}/status")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(ApiResponse<LikeStatusResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetLikeStatus(Guid contentId, CancellationToken cancellationToken = default)
    {
        try
        {
            Guid? userId = Guid.TryParse(UserId, out var parsedUserId) ? parsedUserId : null;
            var result = await likeService.GetLikeStatusAsync(contentId, userId, cancellationToken);
            return result.Status switch
            {
                LikeStatusQueryStatus.Success => OkEnvelope(result.Response!),
                LikeStatusQueryStatus.ContentNotFound => NotFoundProblem("Content not found", result.ErrorMessage),
                _ => Problem(
                    StatusCodes.Status500InternalServerError,
                    "Failed to retrieve like status",
                    "An unexpected error occurred.")
            };
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to get like status for content {ContentId}", contentId);
            return Problem(
                StatusCodes.Status500InternalServerError,
                "Failed to retrieve like status",
                "An unexpected error occurred.");
        }
    }

    /// <summary>
    /// Get like count for a content.
    /// </summary>
    [HttpGet("{contentId:guid}/count")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(ApiResponse<int>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetLikeCount(Guid contentId, CancellationToken cancellationToken = default)
    {
        try
        {
            var count = await likeService.GetLikeCountAsync(contentId, cancellationToken);

            return OkEnvelope(count);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to get like count for content {ContentId}", contentId);
            return Problem(
                StatusCodes.Status500InternalServerError,
                "Failed to retrieve like count",
                "An unexpected error occurred.");
        }
    }
}
