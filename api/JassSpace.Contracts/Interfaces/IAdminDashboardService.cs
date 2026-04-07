using JassSpace.Contracts.Responses;

namespace JassSpace.Contracts.Interfaces;

public interface IAdminDashboardService
{
    Task<AdminDashboardStatsResponse> GetStatsAsync(CancellationToken cancellationToken = default);
}
