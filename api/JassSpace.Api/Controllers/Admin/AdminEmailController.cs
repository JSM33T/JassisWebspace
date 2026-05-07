using JassSpace.Contracts;
using JassSpace.Contracts.Interfaces;
using JassSpace.Contracts.Requests;
using JassSpace.Contracts.Responses;
using JassSpace.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace JassSpace.Api.Controllers.Admin;

[Route("admin/email")]
[Authorize(Roles = "admin")]
public sealed class AdminEmailController(
    IAdminEmailService adminEmailService,
    JassSpaceDbContext dbContext) : BaseApiController
{
    [HttpGet("opted-out-user-ids")]
    [ProducesResponseType(typeof(ApiResponse<List<Guid>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetOptedOutUserIds(CancellationToken cancellationToken = default)
    {
        var ids = await dbContext.UserEmailPreferences
            .AsNoTracking()
            .Where(p => !p.ReceiveBroadcastEmails)
            .Select(p => p.UserId)
            .ToListAsync(cancellationToken);
        return OkEnvelope(ids);
    }

    [HttpGet("templates")]
    [ProducesResponseType(typeof(ApiResponse<List<EmailTemplateResponse>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetTemplates(CancellationToken cancellationToken = default)
    {
        var templates = await adminEmailService.GetTemplatesAsync(cancellationToken);
        return OkEnvelope(templates);
    }

    [HttpGet("templates/{id:guid}")]
    [ProducesResponseType(typeof(ApiResponse<EmailTemplateResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetTemplate(Guid id, CancellationToken cancellationToken = default)
    {
        var template = await adminEmailService.GetTemplateAsync(id, cancellationToken);
        if (template is null)
            return NotFoundProblem("Template not found", $"No email template found with ID '{id}'.");
        return OkEnvelope(template);
    }

    [HttpPost("templates")]
    [ProducesResponseType(typeof(ApiResponse<EmailTemplateResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status409Conflict)]
    public async Task<IActionResult> CreateTemplate(
        [FromBody] CreateEmailTemplateRequest request,
        CancellationToken cancellationToken = default)
    {
        var result = await adminEmailService.CreateTemplateAsync(request, cancellationToken);
        return result.Status switch
        {
            AdminEmailMutationStatus.Success => OkEnvelope(result.Template!),
            AdminEmailMutationStatus.DuplicateName => ConflictProblem("Duplicate name", result.ErrorMessage!),
            _ => BadRequestProblem("Invalid request", result.ErrorMessage ?? "Validation failed.")
        };
    }

    [HttpPut("templates/{id:guid}")]
    [ProducesResponseType(typeof(ApiResponse<EmailTemplateResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status409Conflict)]
    public async Task<IActionResult> UpdateTemplate(
        Guid id,
        [FromBody] UpdateEmailTemplateRequest request,
        CancellationToken cancellationToken = default)
    {
        var result = await adminEmailService.UpdateTemplateAsync(id, request, cancellationToken);
        return result.Status switch
        {
            AdminEmailMutationStatus.Success => OkEnvelope(result.Template!),
            AdminEmailMutationStatus.NotFound => NotFoundProblem("Template not found", result.ErrorMessage!),
            AdminEmailMutationStatus.DuplicateName => ConflictProblem("Duplicate name", result.ErrorMessage!),
            _ => BadRequestProblem("Invalid request", result.ErrorMessage ?? "Validation failed.")
        };
    }

    [HttpDelete("templates/{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DeleteTemplate(Guid id, CancellationToken cancellationToken = default)
    {
        var result = await adminEmailService.DeleteTemplateAsync(id, cancellationToken);
        return result.Status switch
        {
            AdminEmailMutationStatus.Success => NoContent(),
            _ => NotFoundProblem("Template not found", result.ErrorMessage!)
        };
    }

    [HttpPost("templates/{id:guid}/test")]
    [ProducesResponseType(typeof(ApiResponse<AdminEmailSendResult>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> TestSend(
        Guid id,
        [FromBody] TestEmailRequest request,
        CancellationToken cancellationToken = default)
    {
        var result = await adminEmailService.TestSendAsync(id, request, cancellationToken);
        return result.Status switch
        {
            AdminEmailSendStatus.Success => OkEnvelope(result),
            AdminEmailSendStatus.NotFound => NotFoundProblem("Template not found", result.ErrorMessage!),
            AdminEmailSendStatus.SendFailed => Problem(StatusCodes.Status502BadGateway, "Send failed", result.ErrorMessage!),
            _ => BadRequestProblem("Invalid request", result.ErrorMessage ?? "Validation failed.")
        };
    }

    [HttpPost("templates/{id:guid}/broadcast")]
    [ProducesResponseType(typeof(ApiResponse<AdminEmailSendResult>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Broadcast(
        Guid id,
        [FromBody] BroadcastEmailRequest request,
        CancellationToken cancellationToken = default)
    {
        var result = await adminEmailService.BroadcastAsync(id, request, cancellationToken);
        return result.Status switch
        {
            AdminEmailSendStatus.Success => OkEnvelope(result),
            AdminEmailSendStatus.NotFound => NotFoundProblem("Template not found", result.ErrorMessage!),
            AdminEmailSendStatus.SendFailed => Problem(StatusCodes.Status502BadGateway, "Broadcast failed", result.ErrorMessage!),
            _ => BadRequestProblem("Invalid request", result.ErrorMessage ?? "Validation failed.")
        };
    }
}
