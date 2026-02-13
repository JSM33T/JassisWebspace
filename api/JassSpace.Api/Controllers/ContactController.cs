using JassSpace.Contracts;
using JassSpace.Contracts.Requests;
using JassSpace.Contracts.Responses;
using JassSpace.Data;
using JassSpace.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Net.Mail;

namespace JassSpace.Api.Controllers;

[Route("contact")]
public sealed class ContactController(
    JassSpaceDbContext dbContext,
    ILogger<ContactController> logger)
    : BaseApiController
{
    [HttpPost]
    [AllowAnonymous]
    [ProducesResponseType(typeof(ApiResponse<ContactResponse>), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> CreateContact(
        [FromBody] CreateContactRequest request,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
        {
            return BadRequestProblem("Invalid name", "Name is required.");
        }

        if (string.IsNullOrWhiteSpace(request.Email))
        {
            return BadRequestProblem("Invalid email", "Email is required.");
        }

        if (!MailAddress.TryCreate(request.Email, out _))
        {
            return BadRequestProblem("Invalid email", "Email format is invalid.");
        }

        if (string.IsNullOrWhiteSpace(request.Purpose))
        {
            return BadRequestProblem("Invalid purpose", "Purpose is required.");
        }

        if (string.IsNullOrWhiteSpace(request.Message))
        {
            return BadRequestProblem("Invalid message", "Message is required.");
        }

        try
        {
            var now = DateTimeOffset.UtcNow;
            var contact = new Contact
            {
                Id = Guid.NewGuid(),
                Name = request.Name.Trim(),
                Email = request.Email.Trim(),
                Purpose = request.Purpose.Trim(),
                Message = request.Message.Trim(),
                RefUrl = string.IsNullOrWhiteSpace(request.RefUrl) ? null : request.RefUrl.Trim(),
                CreatedAt = now
            };

            dbContext.Contacts.Add(contact);
            await dbContext.SaveChangesAsync(cancellationToken);

            logger.LogInformation("Stored contact submission {ContactId} from {Email}", contact.Id, contact.Email);

            return Created(
                $"/contact/{contact.Id}",
                new ApiResponse<ContactResponse>(new ContactResponse(contact.Id, contact.CreatedAt)));
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to store contact submission for {Email}", request.Email);
            return Problem(
                StatusCodes.Status500InternalServerError,
                "Failed to save contact request",
                "An unexpected error occurred while saving your contact request.");
        }
    }
}
