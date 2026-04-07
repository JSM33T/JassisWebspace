using JassSpace.Contracts;
using JassSpace.Contracts.Interfaces;
using JassSpace.Contracts.Responses;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace JassSpace.Api.Controllers;

[Route("admin/content")]
[Authorize(Roles = "admin,mod")]
public sealed class AdminContentController(
    IAdminContentService adminContentService)
    : BaseApiController
{
    [HttpGet]
    [ProducesResponseType(typeof(ApiResponse<List<AdminContentListItemResponse>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetContents(
        [FromQuery] string? contentType,
        [FromQuery] string? sortBy,
        [FromQuery] string? sortDir = "desc",
        [FromQuery] DateTimeOffset? dateFrom = null,
        [FromQuery] DateTimeOffset? dateTo = null,
        CancellationToken cancellationToken = default)
    {
        var response = await adminContentService.GetContentsAsync(
            contentType,
            sortBy,
            sortDir,
            dateFrom,
            dateTo,
            cancellationToken);

        return OkEnvelope(response);
    }

    [HttpGet("{contentId:guid}")]
    [ProducesResponseType(typeof(ApiResponse<AdminContentDetailResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetContent(Guid contentId, CancellationToken cancellationToken = default)
    {
        var detail = await adminContentService.GetContentAsync(contentId, cancellationToken);
        if (detail is null)
        {
            return NotFoundProblem("Content not found", $"No content found with ID '{contentId}'.");
        }

        return OkEnvelope(detail);
    }
}
