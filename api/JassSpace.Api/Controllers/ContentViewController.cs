using JassSpace.Api.Extensions;
using JassSpace.Contracts;
using JassSpace.Contracts.Interfaces;
using JassSpace.Contracts.Responses;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace JassSpace.Api.Controllers;

[Route("views")]
public sealed class ContentViewController(
    IContentViewService contentViewService,
    ILogger<ContentViewController> logger)
    : BaseApiController
{
    [HttpPost("{contentId:guid}")]
    [AllowAnonymous]
    [RateLimit("content-view", Partition = RateLimitPartitionStrategy.IpAddress)]
    [ProducesResponseType(typeof(ApiResponse<ContentViewResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> RecordView(Guid contentId, CancellationToken cancellationToken = default)
    {
        try
        {
            var result = await contentViewService.RecordViewAsync(contentId, cancellationToken);
            return result.Status switch
            {
                ContentViewRecordStatus.Success => OkEnvelope(result.Response!),
                ContentViewRecordStatus.ContentNotFound => NotFoundProblem("Content not found", result.ErrorMessage),
                _ => Problem(
                    StatusCodes.Status500InternalServerError,
                    "Failed to record content view",
                    "An unexpected error occurred.")
            };
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to record view for content {ContentId}", contentId);
            return Problem(
                StatusCodes.Status500InternalServerError,
                "Failed to record content view",
                "An unexpected error occurred.");
        }
    }
}
