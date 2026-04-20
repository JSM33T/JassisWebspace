using JassSpace.Contracts;
using JassSpace.Contracts.Interfaces;
using JassSpace.Contracts.Requests;
using JassSpace.Contracts.Responses;
using JassSpace.Entities.Enums;
using Microsoft.AspNetCore.Mvc;

namespace JassSpace.Api.Controllers;

[Route("search")]
public sealed class SearchController(
    ILogger<SearchController> logger,
    ISearchService searchService)
    : BaseApiController
{
    [HttpGet]
    [ProducesResponseType(typeof(ApiResponse<SearchResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Search(
        [FromQuery] string? q,
        [FromQuery] ContentType[]? types,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(q))
            return BadRequestProblem("Query required", "Provide a non-empty search query via the 'q' parameter.");

        try
        {
            var result = await searchService.SearchAsync(
                new SearchRequest(q, types, page, pageSize),
                cancellationToken);

            return OkEnvelope(result);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Search failed for query {Query}", q);
            return Problem(
                StatusCodes.Status500InternalServerError,
                "Search failed",
                "An unexpected error occurred while processing the search.");
        }
    }
}
