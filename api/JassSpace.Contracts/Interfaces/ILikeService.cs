using JassSpace.Contracts.Responses;

namespace JassSpace.Contracts.Interfaces;

public enum LikeStatusQueryStatus
{
    Success,
    ContentNotFound
}

public sealed record LikeStatusQueryResult(
    LikeStatusQueryStatus Status,
    LikeStatusResponse? Response,
    string? ErrorMessage = null
);

public interface ILikeService
{
    Task<LikeStatusQueryResult> ToggleLikeAsync(
        Guid contentId,
        Guid userId,
        CancellationToken cancellationToken = default);

    Task<LikeStatusQueryResult> GetLikeStatusAsync(
        Guid contentId,
        Guid? userId = null,
        CancellationToken cancellationToken = default);

    Task<int> GetLikeCountAsync(
        Guid contentId,
        CancellationToken cancellationToken = default);
}
