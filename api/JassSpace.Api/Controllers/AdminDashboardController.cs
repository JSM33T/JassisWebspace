using JassSpace.Contracts;
using JassSpace.Contracts.Responses;
using JassSpace.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace JassSpace.Api.Controllers;

[Route("admin/dashboard")]
[Authorize(Roles = "admin,mod")]
public sealed class AdminDashboardController(
    JassSpaceDbContext dbContext)
    : BaseApiController
{
    [HttpGet("stats")]
    [ProducesResponseType(typeof(ApiResponse<AdminDashboardStatsResponse>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetStats(CancellationToken cancellationToken = default)
    {
        var since = DateTimeOffset.UtcNow.AddDays(-7);

        var totalUsers = await dbContext.Users
            .Where(u => u.DeletedAt == null && u.IsActive)
            .CountAsync(cancellationToken);
        var likesLast7Days = await dbContext.Likes
            .Where(l => l.CreatedAt >= since)
            .CountAsync(cancellationToken);
        var commentsLast7Days = await dbContext.Comments
            .Where(c => !c.IsDeleted && c.CreatedAt >= since)
            .CountAsync(cancellationToken);

        return OkEnvelope(new AdminDashboardStatsResponse(totalUsers, likesLast7Days, commentsLast7Days));
    }
}
