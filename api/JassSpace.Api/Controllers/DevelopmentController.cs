using JassSpace.Api.Extensions;
using JassSpace.Contracts;
using JassSpace.Contracts.Interfaces;
using JassSpace.Contracts.Requests;
using JassSpace.Contracts.Responses;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace JassSpace.Api.Controllers;

[Route("development")]
public sealed class DevelopmentController(
    IDevelopmentService developmentService,
    ILogger<DevelopmentController> logger)
    : BaseApiController
{
    [HttpGet("summary")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(ApiResponse<DevelopmentSummaryResponse>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetSummary(CancellationToken cancellationToken = default)
    {
        try
        {
            var response = await developmentService.GetSummaryAsync(cancellationToken);
            return OkEnvelope(response);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to load development summary.");
            return Problem(
                StatusCodes.Status502BadGateway,
                "Failed to load development summary",
                "Development data is temporarily unavailable.");
        }
    }

    [HttpGet("issues")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(ApiResponse<IReadOnlyList<DevelopmentIssueResponse>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetIssues(
        [FromQuery] string? state,
        [FromQuery] string? label,
        [FromQuery] string? milestone,
        [FromQuery] string? search,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var response = await developmentService.GetIssuesAsync(
                state,
                label,
                milestone,
                search,
                page,
                pageSize,
                cancellationToken);

            return OkEnvelope(response);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to load GitHub issues.");
            return Problem(
                StatusCodes.Status502BadGateway,
                "Failed to load issues",
                "GitHub issue data is temporarily unavailable.");
        }
    }

    [HttpGet("releases")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(ApiResponse<DevelopmentReleasesWallResponse>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetReleases(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 10,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var releases = await developmentService.GetReleasesAsync(page, pageSize, cancellationToken);
            var notes = await developmentService.GetNotesAsync(publicOnly: true, page, pageSize, cancellationToken);
            return OkEnvelope(new DevelopmentReleasesWallResponse(releases, notes));
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to load GitHub releases.");
            return Problem(
                StatusCodes.Status502BadGateway,
                "Failed to load releases",
                "GitHub release data is temporarily unavailable.");
        }
    }

    [HttpGet("suggestions")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(ApiResponse<IReadOnlyList<DevelopmentSuggestionResponse>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetSuggestions(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken cancellationToken = default)
    {
        var response = await developmentService.GetPublicSuggestionsAsync(page, pageSize, cancellationToken);
        return OkEnvelope(response);
    }

    [HttpPost("suggestions")]
    [Authorize]
    [RateLimit("development-suggestion", Partition = RateLimitPartitionStrategy.UserId, RequireAuthenticatedUser = true)]
    [ProducesResponseType(typeof(ApiResponse<DevelopmentSuggestionResponse>), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> CreateSuggestion(
        [FromBody] CreateDevelopmentSuggestionRequest request,
        CancellationToken cancellationToken = default)
    {
        if (UserId is null)
        {
            return UnauthorizedProblem();
        }

        var result = await developmentService.CreateSuggestionAsync(Guid.Parse(UserId), request, cancellationToken);
        return result.Status switch
        {
            DevelopmentMutationStatus.Success => Created(
                $"/development/suggestions/{result.Response!.Id}",
                new ApiResponse<DevelopmentSuggestionResponse>(result.Response)),
            DevelopmentMutationStatus.InvalidTitle => BadRequestProblem("Invalid title", result.ErrorMessage),
            DevelopmentMutationStatus.InvalidBody => BadRequestProblem("Invalid suggestion", result.ErrorMessage),
            _ => Problem(
                StatusCodes.Status500InternalServerError,
                "Failed to create suggestion",
                "An unexpected error occurred while saving the suggestion.")
        };
    }
}
