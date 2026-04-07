using JassSpace.Contracts.Requests;
using JassSpace.Contracts.Responses;

namespace JassSpace.Contracts.Interfaces;

public enum UiPropertyUpsertStatus
{
    Success,
    InvalidKey,
    InvalidValue
}

public sealed record UiPropertyUpsertResult(
    UiPropertyUpsertStatus Status,
    UiPropertyResponse? Property = null,
    string? ErrorMessage = null
);

public interface IUiPropertiesService
{
    Task<IReadOnlyCollection<UiPropertyResponse>> GetUiPropertiesAsync(CancellationToken cancellationToken = default);

    Task<UiPropertyResponse?> GetUiPropertyAsync(string key, CancellationToken cancellationToken = default);

    Task<UiPropertyUpsertResult> SetUiPropertyAsync(
        string key,
        SetUiPropertyRequest request,
        CancellationToken cancellationToken = default);
}
