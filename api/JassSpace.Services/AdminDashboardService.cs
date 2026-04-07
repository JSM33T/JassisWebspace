using JassSpace.Contracts.Interfaces;
using JassSpace.Contracts.Responses;
using JassSpace.Data;
using Microsoft.EntityFrameworkCore;

namespace JassSpace.Services;

public sealed class AdminDashboardService(JassSpaceDbContext dbContext) : IAdminDashboardService
{
    private readonly JassSpaceDbContext _dbContext = dbContext;

    public async Task<AdminDashboardStatsResponse> GetStatsAsync(CancellationToken cancellationToken = default)
    {
        var since = DateTimeOffset.UtcNow.AddDays(-7);

        var totalUsers = await _dbContext.Users
            .Where(u => u.DeletedAt == null && u.IsActive)
            .CountAsync(cancellationToken);

        var likesLast7Days = await _dbContext.Likes
            .Where(l => l.CreatedAt >= since)
            .CountAsync(cancellationToken);

        var commentsLast7Days = await _dbContext.Comments
            .Where(c => !c.IsDeleted && c.CreatedAt >= since)
            .CountAsync(cancellationToken);

        return new AdminDashboardStatsResponse(totalUsers, likesLast7Days, commentsLast7Days);
    }
}
