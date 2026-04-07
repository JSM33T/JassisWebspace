using JassSpace.Contracts;
using JassSpace.Contracts.Interfaces;
using JassSpace.Contracts.Responses;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace JassSpace.Api.Controllers;

[Route("admin/dashboard")]
[Authorize(Roles = "admin,mod")]
public sealed class AdminDashboardController(
    IAdminDashboardService adminDashboardService)
    : BaseApiController
{
    [HttpGet("stats")]
    [ProducesResponseType(typeof(ApiResponse<AdminDashboardStatsResponse>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetStats(CancellationToken cancellationToken = default)
    {
        var stats = await adminDashboardService.GetStatsAsync(cancellationToken);
        return OkEnvelope(stats);
    }
}
