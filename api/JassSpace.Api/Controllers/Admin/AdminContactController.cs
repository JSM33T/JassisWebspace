using JassSpace.Contracts.Responses;
using JassSpace.Contracts.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace JassSpace.Api.Controllers;

[Route("admin/contact")]
[Authorize(Roles = "admin")]
public sealed class AdminContactController(
    IContactService contactService)
    : BaseApiController
{
    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyCollection<AdminContactMessageResponse>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetMessages(
        [FromQuery] string? search,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken cancellationToken = default)
    {
        var result = await contactService.GetMessagesAsync(search, page, pageSize, cancellationToken);
        return PagedOk(result.Items, result.Page, result.PageSize, result.Total);
    }

    [HttpDelete("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DeleteMessage(Guid id, CancellationToken cancellationToken = default)
    {
        var result = await contactService.DeleteMessageAsync(id, cancellationToken);
        if (result.Status == ContactDeleteStatus.NotFound)
        {
            return NotFoundProblem("Message not found", result.ErrorMessage);
        }

        return NoContent();
    }
}
