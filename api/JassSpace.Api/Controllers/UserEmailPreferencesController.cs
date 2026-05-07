using JassSpace.Contracts;
using JassSpace.Contracts.Requests;
using JassSpace.Contracts.Responses;
using JassSpace.Data;
using JassSpace.Entities;
using JassSpace.Infra;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;

namespace JassSpace.Api.Controllers;

[Route("account/email-preferences")]
public class UserEmailPreferencesController(
    JassSpaceDbContext dbContext,
    IUnsubscribeTokenService tokenService,
    IConfiguration configuration) : BaseApiController
{
    [HttpGet]
    [Authorize]
    [ProducesResponseType(typeof(ApiResponse<UserEmailPreferencesResponse>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetPreferences(CancellationToken cancellationToken)
    {
        if (!Guid.TryParse(UserId, out var userId))
            return UnauthorizedProblem();

        var pref = await dbContext.UserEmailPreferences
            .AsNoTracking()
            .FirstOrDefaultAsync(p => p.UserId == userId, cancellationToken);

        return OkEnvelope(new UserEmailPreferencesResponse(pref?.ReceiveBroadcastEmails ?? true));
    }

    [HttpPut]
    [Authorize]
    [ProducesResponseType(typeof(ApiResponse<UserEmailPreferencesResponse>), StatusCodes.Status200OK)]
    public async Task<IActionResult> UpdatePreferences(
        [FromBody] UpdateEmailPreferencesRequest request,
        CancellationToken cancellationToken)
    {
        if (!Guid.TryParse(UserId, out var userId))
            return UnauthorizedProblem();

        var pref = await dbContext.UserEmailPreferences
            .FirstOrDefaultAsync(p => p.UserId == userId, cancellationToken);

        if (pref is null)
        {
            pref = new UserEmailPreference { UserId = userId };
            dbContext.UserEmailPreferences.Add(pref);
        }

        pref.ReceiveBroadcastEmails = request.ReceiveBroadcastEmails;
        pref.UpdatedAt = DateTimeOffset.UtcNow;

        await dbContext.SaveChangesAsync(cancellationToken);

        return OkEnvelope(new UserEmailPreferencesResponse(pref.ReceiveBroadcastEmails));
    }

    // One-click unsubscribe — no auth required (linked from email footer)
    [HttpGet("unsubscribe")]
    [AllowAnonymous]
    public async Task<IActionResult> Unsubscribe([FromQuery] string token, CancellationToken cancellationToken)
    {
        var userId = tokenService.ValidateToken(token);
        if (userId is null)
            return BadRequest("Invalid or expired unsubscribe link.");

        var pref = await dbContext.UserEmailPreferences
            .FirstOrDefaultAsync(p => p.UserId == userId, cancellationToken);

        if (pref is null)
        {
            pref = new UserEmailPreference { UserId = userId.Value };
            dbContext.UserEmailPreferences.Add(pref);
        }

        pref.ReceiveBroadcastEmails = false;
        pref.UpdatedAt = DateTimeOffset.UtcNow;

        await dbContext.SaveChangesAsync(cancellationToken);

        var appUrl = configuration["AppUrl"] ?? "http://localhost:3001";
        return Redirect($"{appUrl}/account/preferences?unsubscribed=1");
    }
}
