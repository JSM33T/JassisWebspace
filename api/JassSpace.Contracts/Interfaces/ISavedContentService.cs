using JassSpace.Contracts.Responses;
using JassSpace.Entities.Enums;

namespace JassSpace.Contracts.Interfaces;

public interface ISavedContentService
{
    Task<SavedContentStatusResponse?> SaveAsync(Guid userId, Guid contentId, CancellationToken cancellationToken);
    Task<SavedContentStatusResponse> RemoveAsync(Guid userId, Guid contentId, CancellationToken cancellationToken);
    Task<SavedContentStatusResponse?> GetStatusAsync(Guid userId, Guid contentId, CancellationToken cancellationToken);
    Task<IReadOnlyList<SavedContentStatusResponse>> GetStatusesAsync(Guid userId, IReadOnlyList<Guid> contentIds, CancellationToken cancellationToken);
    Task<SavedContentPageResponse> GetPageAsync(Guid userId, ContentType? type, int page, int pageSize, CancellationToken cancellationToken);
}
