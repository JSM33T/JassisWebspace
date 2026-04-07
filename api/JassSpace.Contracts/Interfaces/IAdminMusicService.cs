using JassSpace.Contracts.Requests;
using JassSpace.Contracts.Responses;

namespace JassSpace.Contracts.Interfaces;

public enum AdminMusicTracksQueryStatus
{
    Success,
    InvalidCategory
}

public sealed record AdminMusicTracksQueryResult(
    AdminMusicTracksQueryStatus Status,
    IReadOnlyCollection<TrackListItemResponse> Tracks,
    int Page,
    int PageSize,
    int Total,
    string? ErrorMessage = null
);

public sealed record AdminMusicCoverUploadResult(
    MediaUploadResponse Response,
    bool TrackUpdated
);

public sealed record AdminMusicAudioUploadResult(
    BootlegUploadResponse Response,
    bool TrackUpdated
);

public enum AdminMusicMutationStatus
{
    Success,
    TrackNotFound,
    InvalidTitle,
    InvalidDescription,
    InvalidCategory,
    InvalidBootlegAsset,
    BootlegAssetAlreadyAttached,
    InvalidAuthors,
    InvalidLinks
}

public sealed record AdminMusicMutationResult(
    AdminMusicMutationStatus Status,
    TrackDetailResponse? Track,
    string? ErrorMessage = null
);

public enum AdminMusicDeleteStatus
{
    Success,
    TrackNotFound
}

public sealed record AdminMusicDeleteResult(
    AdminMusicDeleteStatus Status,
    string? ErrorMessage = null
);

public interface IAdminMusicService
{
    Task<List<TrackAuthorResponse>> GetAuthorsAsync(
        string? search = null,
        int take = 100,
        CancellationToken cancellationToken = default);

    Task<AdminMusicTracksQueryResult> GetTracksAsync(
        string? search,
        string? category,
        string? artist,
        string? genre,
        DateTimeOffset? dateFrom,
        DateTimeOffset? dateTo,
        string? sortBy = "releaseDate",
        string? sortDir = "desc",
        int page = 1,
        int pageSize = 50,
        CancellationToken cancellationToken = default);

    Task<TrackDetailResponse?> GetTrackAsync(
        Guid id,
        CancellationToken cancellationToken = default);

    Task<AdminMusicCoverUploadResult> UploadTrackCoverAsync(
        Guid id,
        Stream fileStream,
        string fileName,
        string mediaBaseUrl,
        CancellationToken cancellationToken = default);

    Task<AdminMusicAudioUploadResult> UploadTrackAudioAsync(
        Guid id,
        Stream fileStream,
        string fileName,
        string contentType,
        long sizeBytes,
        Guid? uploadedByUserId,
        string baseUrl,
        int tokenTtlMinutes,
        CancellationToken cancellationToken = default);

    Task<AdminMusicMutationResult> CreateTrackAsync(
        CreateTrackRequest request,
        CancellationToken cancellationToken = default);

    Task<AdminMusicMutationResult> UpdateTrackAsync(
        Guid id,
        UpdateTrackRequest request,
        CancellationToken cancellationToken = default);

    Task<AdminMusicDeleteResult> DeleteTrackAsync(
        Guid id,
        CancellationToken cancellationToken = default);
}
