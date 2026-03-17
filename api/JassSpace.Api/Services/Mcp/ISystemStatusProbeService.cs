using JassSpace.Contracts.Responses;

namespace JassSpace.Api.Services;

public interface ISystemStatusProbeService
{
    Task<SystemStatusSnapshot> GetSnapshotAsync(CancellationToken cancellationToken = default);
}
