using JassSpace.Contracts.Responses;

namespace JassSpace.Contracts.Interfaces;

public enum MusicTracksQueryStatus
{
    Success,
    InvalidCategory
}

public sealed record MusicTracksQueryResult(
    MusicTracksQueryStatus Status,
    IReadOnlyCollection<TrackListItemResponse> Tracks,
    int Page,
    int PageSize,
    int Total,
    string? ErrorMessage = null
);

public enum MusicPlayLinkStatus
{
    Success,
    TrackNotFound,
    PlayableSourceUnavailable,
    UnauthorizedStreamScope
}

public sealed record MusicPlayLinkResult(
    MusicPlayLinkStatus Status,
    TrackPlayLinkResponse? Response,
    string? ErrorMessage = null
);

public interface IMusicService
{
    Task<MusicTracksQueryResult> GetTracksAsync(
        string? search,
        string? category,
        bool? featured,
        int page = 1,
        int pageSize = 50,
        CancellationToken cancellationToken = default);

    Task<TrackDetailResponse?> GetTrackBySlugAsync(
        string slug,
        Guid? currentUserId = null,
        CancellationToken cancellationToken = default);

    Task<MusicPlayLinkResult> CreatePlayLinkAsync(
        Guid id,
        string baseUrl,
        int tokenTtlMinutes,
        CancellationToken cancellationToken = default);
}
