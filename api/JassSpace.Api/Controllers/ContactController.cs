using JassSpace.Contracts;
using JassSpace.Contracts.Interfaces;
using JassSpace.Contracts.Requests;
using JassSpace.Contracts.Responses;
using JassSpace.Api.Configuration;
using JassSpace.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;

namespace JassSpace.Api.Controllers;

[Route("contact")]
public sealed class ContactController(
    IContactService contactService,
    ITurnstileVerificationService turnstileVerificationService,
    IOptions<TurnstileOptions> turnstileOptions,
    ILogger<ContactController> logger)
    : BaseApiController
{
    [HttpGet("turnstile/site-key")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(ApiResponse<TurnstileSiteKeyResponse>), StatusCodes.Status200OK)]
    public IActionResult GetTurnstileSiteKey()
    {
        var options = turnstileOptions.Value ?? new TurnstileOptions();
        var siteKey = options.Enabled ? options.SiteKey?.Trim() ?? string.Empty : string.Empty;
        return OkEnvelope(new TurnstileSiteKeyResponse(options.Enabled, siteKey));
    }

    [HttpPost]
    [AllowAnonymous]
    [ProducesResponseType(typeof(ApiResponse<ContactResponse>), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> CreateContact(
        [FromBody] CreateContactRequest request,
        CancellationToken cancellationToken = default)
    {
        var turnstileResult = await turnstileVerificationService.VerifyAsync(
            request.TurnstileToken,
            HttpContext.Connection.RemoteIpAddress?.ToString(),
            cancellationToken);

        if (!turnstileResult.Success)
        {
            logger.LogWarning(
                "Turnstile validation failed for contact request. Errors: {ErrorCodes}",
                string.Join(",", turnstileResult.ErrorCodes));
            return BadRequestProblem(
                "Verification required",
                "Please complete the verification challenge and try again.");
        }

        try
        {
            var result = await contactService.CreateContactAsync(request, cancellationToken);

            switch (result.Status)
            {
                case ContactCreateStatus.Success:
                    logger.LogInformation("Stored contact submission {ContactId}.", result.Response!.Id);
                    return Created(
                        $"/contact/{result.Response.Id}",
                        new ApiResponse<ContactResponse>(result.Response));
                case ContactCreateStatus.InvalidName:
                    return BadRequestProblem("Invalid name", result.ErrorMessage);
                case ContactCreateStatus.InvalidEmail:
                    return BadRequestProblem("Invalid email", result.ErrorMessage);
                case ContactCreateStatus.InvalidPurpose:
                    return BadRequestProblem("Invalid purpose", result.ErrorMessage);
                case ContactCreateStatus.InvalidMessage:
                    return BadRequestProblem("Invalid message", result.ErrorMessage);
                default:
                    return Problem(
                        StatusCodes.Status500InternalServerError,
                        "Failed to save contact request",
                        "An unexpected error occurred while saving your contact request.");
            }
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to store contact submission.");
            return Problem(
                StatusCodes.Status500InternalServerError,
                "Failed to save contact request",
                "An unexpected error occurred while saving your contact request.");
        }
    }
}
