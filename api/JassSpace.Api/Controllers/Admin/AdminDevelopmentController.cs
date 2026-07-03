using JassSpace.Contracts;
using JassSpace.Contracts.Interfaces;
using JassSpace.Contracts.Requests;
using JassSpace.Contracts.Responses;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace JassSpace.Api.Controllers;

[Route("admin/development")]
[Authorize(Roles = "admin,mod")]
public sealed class AdminDevelopmentController(
    IDevelopmentService developmentService)
    : BaseApiController
{
    [HttpGet("suggestions")]
    [ProducesResponseType(typeof(ApiResponse<IReadOnlyCollection<DevelopmentSuggestionResponse>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetSuggestions(
        [FromQuery] string? status,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken cancellationToken = default)
    {
        var response = await developmentService.GetAdminSuggestionsAsync(status, page, pageSize, cancellationToken);
        return PagedOk(response.Items, response.Page, response.PageSize, response.Total);
    }

    [HttpPut("suggestions/{id:guid}/status")]
    [ProducesResponseType(typeof(ApiResponse<DevelopmentSuggestionResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateSuggestionStatus(
        Guid id,
        [FromBody] UpdateDevelopmentSuggestionStatusRequest request,
        CancellationToken cancellationToken = default)
    {
        if (UserId is null)
        {
            return UnauthorizedProblem();
        }

        var result = await developmentService.UpdateSuggestionStatusAsync(id, Guid.Parse(UserId), request, cancellationToken);
        return result.Status switch
        {
            DevelopmentMutationStatus.Success => OkEnvelope(result.Response!),
            DevelopmentMutationStatus.InvalidStatus => BadRequestProblem("Invalid status", result.ErrorMessage),
            DevelopmentMutationStatus.NotFound => NotFoundProblem("Suggestion not found", result.ErrorMessage),
            _ => Problem(
                StatusCodes.Status500InternalServerError,
                "Failed to update suggestion",
                "An unexpected error occurred while updating the suggestion.")
        };
    }

    [HttpPut("suggestions/{id:guid}")]
    [ProducesResponseType(typeof(ApiResponse<DevelopmentSuggestionResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateSuggestion(
        Guid id,
        [FromBody] UpdateDevelopmentSuggestionRequest request,
        CancellationToken cancellationToken = default)
    {
        if (UserId is null)
        {
            return UnauthorizedProblem();
        }

        var result = await developmentService.UpdateSuggestionAsync(id, Guid.Parse(UserId), request, cancellationToken);
        return result.Status switch
        {
            DevelopmentMutationStatus.Success => OkEnvelope(result.Response!),
            DevelopmentMutationStatus.InvalidTitle => BadRequestProblem("Invalid title", result.ErrorMessage),
            DevelopmentMutationStatus.InvalidBody => BadRequestProblem("Invalid suggestion", result.ErrorMessage),
            DevelopmentMutationStatus.InvalidStatus => BadRequestProblem("Invalid status", result.ErrorMessage),
            DevelopmentMutationStatus.NotFound => NotFoundProblem("Suggestion not found", result.ErrorMessage),
            _ => Problem(
                StatusCodes.Status500InternalServerError,
                "Failed to update suggestion",
                "An unexpected error occurred while updating the suggestion.")
        };
    }

    [HttpPost("suggestions/{id:guid}/promote")]
    [ProducesResponseType(typeof(ApiResponse<DevelopmentSuggestionResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status409Conflict)]
    public async Task<IActionResult> PromoteSuggestion(
        Guid id,
        [FromBody] PromoteDevelopmentSuggestionRequest request,
        CancellationToken cancellationToken = default)
    {
        if (UserId is null)
        {
            return UnauthorizedProblem();
        }

        var result = await developmentService.PromoteSuggestionAsync(id, Guid.Parse(UserId), request, cancellationToken);
        return result.Status switch
        {
            DevelopmentMutationStatus.Success => OkEnvelope(result.Response!),
            DevelopmentMutationStatus.InvalidTitle => BadRequestProblem("Invalid title", result.ErrorMessage),
            DevelopmentMutationStatus.InvalidBody => BadRequestProblem("Invalid suggestion", result.ErrorMessage),
            DevelopmentMutationStatus.InvalidStatus => BadRequestProblem("Invalid status", result.ErrorMessage),
            DevelopmentMutationStatus.NotFound => NotFoundProblem("Suggestion not found", result.ErrorMessage),
            DevelopmentMutationStatus.AlreadyPromoted => ConflictProblem("Already promoted", result.ErrorMessage),
            DevelopmentMutationStatus.GitHubUnavailable => Problem(
                StatusCodes.Status502BadGateway,
                "GitHub unavailable",
                result.ErrorMessage),
            _ => Problem(
                StatusCodes.Status500InternalServerError,
                "Failed to promote suggestion",
                "An unexpected error occurred while promoting the suggestion.")
        };
    }

    [HttpPost("suggestions/{id:guid}/close-issue")]
    [ProducesResponseType(typeof(ApiResponse<DevelopmentSuggestionResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status502BadGateway)]
    public async Task<IActionResult> ClosePromotedIssue(Guid id, CancellationToken cancellationToken = default)
    {
        if (UserId is null)
        {
            return UnauthorizedProblem();
        }

        var result = await developmentService.ClosePromotedIssueAsync(id, Guid.Parse(UserId), cancellationToken);
        return result.Status switch
        {
            DevelopmentMutationStatus.Success => OkEnvelope(result.Response!),
            DevelopmentMutationStatus.InvalidStatus => BadRequestProblem("Issue not linked", result.ErrorMessage),
            DevelopmentMutationStatus.NotFound => NotFoundProblem("Suggestion not found", result.ErrorMessage),
            DevelopmentMutationStatus.GitHubUnavailable => Problem(
                StatusCodes.Status502BadGateway,
                "GitHub unavailable",
                result.ErrorMessage),
            _ => Problem(
                StatusCodes.Status500InternalServerError,
                "Failed to close GitHub issue",
                "An unexpected error occurred while closing the GitHub issue.")
        };
    }

    [HttpDelete("suggestions/{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DeleteSuggestion(Guid id, CancellationToken cancellationToken = default)
    {
        var result = await developmentService.DeleteSuggestionAsync(id, cancellationToken);
        return result.Status switch
        {
            DevelopmentMutationStatus.Success => NoContent(),
            DevelopmentMutationStatus.NotFound => NotFoundProblem("Suggestion not found", result.ErrorMessage),
            _ => Problem(
                StatusCodes.Status500InternalServerError,
                "Failed to delete suggestion",
                "An unexpected error occurred while deleting the suggestion.")
        };
    }

    [HttpGet("notes")]
    [ProducesResponseType(typeof(ApiResponse<IReadOnlyList<DevelopmentNoteResponse>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetNotes(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken cancellationToken = default)
    {
        var response = await developmentService.GetNotesAsync(publicOnly: false, page, pageSize, cancellationToken);
        return OkEnvelope(response);
    }

    [HttpPost("notes")]
    [ProducesResponseType(typeof(ApiResponse<DevelopmentNoteResponse>), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> CreateNote(
        [FromBody] CreateDevelopmentNoteRequest request,
        CancellationToken cancellationToken = default)
    {
        if (UserId is null)
        {
            return UnauthorizedProblem();
        }

        var result = await developmentService.CreateNoteAsync(Guid.Parse(UserId), request, cancellationToken);
        return result.Status switch
        {
            DevelopmentMutationStatus.Success => Created(
                $"/admin/development/notes/{result.Response!.Id}",
                new ApiResponse<DevelopmentNoteResponse>(result.Response)),
            DevelopmentMutationStatus.InvalidTitle => BadRequestProblem("Invalid title", result.ErrorMessage),
            DevelopmentMutationStatus.InvalidBody => BadRequestProblem("Invalid note", result.ErrorMessage),
            DevelopmentMutationStatus.InvalidCategory => BadRequestProblem("Invalid category", result.ErrorMessage),
            _ => Problem(
                StatusCodes.Status500InternalServerError,
                "Failed to create note",
                "An unexpected error occurred while creating the note.")
        };
    }

    [HttpPut("notes/{id:guid}")]
    [ProducesResponseType(typeof(ApiResponse<DevelopmentNoteResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateNote(
        Guid id,
        [FromBody] UpdateDevelopmentNoteRequest request,
        CancellationToken cancellationToken = default)
    {
        var result = await developmentService.UpdateNoteAsync(id, request, cancellationToken);
        return result.Status switch
        {
            DevelopmentMutationStatus.Success => OkEnvelope(result.Response!),
            DevelopmentMutationStatus.InvalidTitle => BadRequestProblem("Invalid title", result.ErrorMessage),
            DevelopmentMutationStatus.InvalidBody => BadRequestProblem("Invalid note", result.ErrorMessage),
            DevelopmentMutationStatus.InvalidCategory => BadRequestProblem("Invalid category", result.ErrorMessage),
            DevelopmentMutationStatus.NotFound => NotFoundProblem("Note not found", result.ErrorMessage),
            _ => Problem(
                StatusCodes.Status500InternalServerError,
                "Failed to update note",
                "An unexpected error occurred while updating the note.")
        };
    }

    [HttpDelete("notes/{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DeleteNote(Guid id, CancellationToken cancellationToken = default)
    {
        var result = await developmentService.DeleteNoteAsync(id, cancellationToken);
        return result.Status switch
        {
            DevelopmentMutationStatus.Success => NoContent(),
            DevelopmentMutationStatus.NotFound => NotFoundProblem("Note not found", result.ErrorMessage),
            _ => Problem(
                StatusCodes.Status500InternalServerError,
                "Failed to delete note",
                "An unexpected error occurred while deleting the note.")
        };
    }
}
