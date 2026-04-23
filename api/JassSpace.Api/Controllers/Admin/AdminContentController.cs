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

    [HttpGet("search")]
    [ProducesResponseType(typeof(ApiResponse<List<AdminContentSearchResultResponse>>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> SearchContents(
        [FromQuery] string q,
        [FromQuery] string? contentType = null,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(q) || q.Trim().Length < 2)
            return BadRequestProblem("Query too short", "Search query must be at least 2 characters.");

        var results = await adminContentService.SearchContentsAsync(q, contentType, cancellationToken);
        return OkEnvelope(results);
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
