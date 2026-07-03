using JassSpace.Contracts.Responses;

namespace JassSpace.Contracts.Interfaces;

public enum ContentViewRecordStatus
{
    Success,
    ContentNotFound
}

public sealed record ContentViewRecordResult(
    ContentViewRecordStatus Status,
    ContentViewResponse? Response,
    string? ErrorMessage = null
);

public interface IContentViewService
{
    Task<ContentViewRecordResult> RecordViewAsync(
        Guid contentId,
        CancellationToken cancellationToken = default);
}
