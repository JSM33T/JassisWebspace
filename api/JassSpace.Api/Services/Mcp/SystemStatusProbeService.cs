using System.Diagnostics;
using System.Runtime.InteropServices;
using JassSpace.Contracts.Responses;
using JassSpace.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Distributed;

namespace JassSpace.Api.Services;

public sealed class SystemStatusProbeService(
    JassSpaceDbContext dbContext,
    IDistributedCache cache,
    IHostEnvironment environment,
    TimeProvider timeProvider,
    ILogger<SystemStatusProbeService> logger)
    : ISystemStatusProbeService
{
    public async Task<SystemStatusSnapshot> GetSnapshotAsync(CancellationToken cancellationToken = default)
    {
        var checkedAt = timeProvider.GetUtcNow();
        using var process = Process.GetCurrentProcess();
        var processStartUtc = new DateTimeOffset(process.StartTime.ToUniversalTime(), TimeSpan.Zero);
        var dependencies = new List<SystemDependencyStatus>(2)
        {
            await ProbeDatabaseAsync(cancellationToken),
            await ProbeRedisAsync(cancellationToken)
        };

        var overallStatus = dependencies.All(static dependency => dependency.Status == "Healthy")
            ? "Healthy"
            : "Degraded";

        return new SystemStatusSnapshot(
            overallStatus,
            checkedAt,
            environment.EnvironmentName,
            Environment.MachineName,
            RuntimeInformation.OSDescription,
            RuntimeInformation.OSArchitecture.ToString(),
            RuntimeInformation.ProcessArchitecture.ToString(),
            RuntimeInformation.FrameworkDescription,
            checkedAt - processStartUtc,
            processStartUtc,
            dependencies);
    }

    private async Task<SystemDependencyStatus> ProbeDatabaseAsync(CancellationToken cancellationToken)
    {
        var checkedAt = timeProvider.GetUtcNow();

        try
        {
            var canConnect = await dbContext.Database.CanConnectAsync(cancellationToken);
            return new SystemDependencyStatus(
                "Database",
                canConnect ? "Healthy" : "Degraded",
                canConnect ? "Database connection succeeded." : "Database connection failed.",
                checkedAt);
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Database probe failed while collecting system status.");
            return new SystemDependencyStatus(
                "Database",
                "Degraded",
                $"Database probe failed: {ex.Message}",
                checkedAt);
        }
    }

    private async Task<SystemDependencyStatus> ProbeRedisAsync(CancellationToken cancellationToken)
    {
        var checkedAt = timeProvider.GetUtcNow();
        var probeKey = $"system-status:redis:probe:{Guid.NewGuid():N}";
        var probeValue = checkedAt.ToString("O");

        try
        {
            await cache.SetStringAsync(
                probeKey,
                probeValue,
                new DistributedCacheEntryOptions
                {
                    AbsoluteExpirationRelativeToNow = TimeSpan.FromSeconds(30)
                },
                cancellationToken);

            var value = await cache.GetStringAsync(probeKey, cancellationToken);
            await cache.RemoveAsync(probeKey, cancellationToken);

            var isHealthy = string.Equals(value, probeValue, StringComparison.Ordinal);
            return new SystemDependencyStatus(
                "Redis",
                isHealthy ? "Healthy" : "Degraded",
                isHealthy ? "Redis cache round-trip succeeded." : "Redis returned an unexpected probe value.",
                checkedAt);
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Redis probe failed while collecting system status.");
            return new SystemDependencyStatus(
                "Redis",
                "Degraded",
                $"Redis probe failed: {ex.Message}",
                checkedAt);
        }
    }
}
