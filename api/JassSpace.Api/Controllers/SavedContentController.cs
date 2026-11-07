using JassSpace.Contracts.Interfaces;
using JassSpace.Contracts.Requests;
using JassSpace.Data;
using JassSpace.Entities.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace JassSpace.Api.Controllers;

[Route("saved-content")]
[Authorize]
public sealed class SavedContentController(ISavedContentService savedContent, JassSpaceDbContext db) : BaseApiController
{
    private bool TryUser(out Guid userId) => Guid.TryParse(UserId, out userId) && userId != Guid.Empty;
    private Task<bool> ActiveUser(Guid userId, CancellationToken cancellationToken) =>
        db.Users.AsNoTracking().AnyAsync(u => u.Id == userId && u.IsActive && u.DeletedAt == null, cancellationToken);
    private void PrivateResponse() => Response.Headers["Cache-Control"] = "private, no-store";

    [HttpPut("{contentId:guid}")]
    public async Task<IActionResult> Save(Guid contentId, CancellationToken cancellationToken)
    {
        PrivateResponse();
        if (!TryUser(out var userId) || !await ActiveUser(userId, cancellationToken)) return Unauthorized();
        if (contentId == Guid.Empty) return BadRequestProblem("Invalid content ID");
        var result = await savedContent.SaveAsync(userId, contentId, cancellationToken);
        return result is null ? NotFoundProblem("Content not found") : OkEnvelope(result);
    }

    [HttpDelete("{contentId:guid}")]
    public async Task<IActionResult> Remove(Guid contentId, CancellationToken cancellationToken)
    {
        PrivateResponse();
        if (!TryUser(out var userId) || !await ActiveUser(userId, cancellationToken)) return Unauthorized();
        if (contentId == Guid.Empty) return BadRequestProblem("Invalid content ID");
        return OkEnvelope(await savedContent.RemoveAsync(userId, contentId, cancellationToken));
    }

    [HttpGet("{contentId:guid}/status")]
    public async Task<IActionResult> Status(Guid contentId, CancellationToken cancellationToken)
    {
        PrivateResponse();
        if (!TryUser(out var userId) || !await ActiveUser(userId, cancellationToken)) return Unauthorized();
        if (contentId == Guid.Empty) return BadRequestProblem("Invalid content ID");
        var result = await savedContent.GetStatusAsync(userId, contentId, cancellationToken);
        return result is null ? NotFoundProblem("Content not found") : OkEnvelope(result);
    }

    [HttpPost("status")]
    public async Task<IActionResult> Statuses([FromBody] SavedContentStatusRequest request, CancellationToken cancellationToken)
    {
        PrivateResponse();
        if (!TryUser(out var userId) || !await ActiveUser(userId, cancellationToken)) return Unauthorized();
        if (request.ContentIds is null || request.ContentIds.Count is < 1 or > 100 || request.ContentIds.Contains(Guid.Empty))
            return BadRequestProblem("Provide 1 to 100 valid content IDs");
        return OkEnvelope(await savedContent.GetStatusesAsync(userId, request.ContentIds, cancellationToken));
    }

    [HttpGet]
    public async Task<IActionResult> List([FromQuery] string? contentType, [FromQuery] int page = 1, [FromQuery] int pageSize = 20, CancellationToken cancellationToken = default)
    {
        PrivateResponse();
        if (!TryUser(out var userId) || !await ActiveUser(userId, cancellationToken)) return Unauthorized();
        if (page < 1 || pageSize is < 1 or > 50 || page > int.MaxValue / pageSize) return BadRequestProblem("Invalid pagination");
        ContentType? type = null;
        if (contentType is not null)
        {
            if (!Enum.TryParse<ContentType>(contentType, true, out var parsed) || parsed is not (ContentType.Blog or ContentType.Album or ContentType.Music))
                return BadRequestProblem("Invalid content type");
            type = parsed;
        }
        return OkEnvelope(await savedContent.GetPageAsync(userId, type, page, pageSize, cancellationToken));
    }

}
