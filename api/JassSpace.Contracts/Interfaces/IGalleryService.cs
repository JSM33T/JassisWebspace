using JassSpace.Contracts.Requests;
using JassSpace.Contracts.Responses;

namespace JassSpace.Contracts.Interfaces;

public enum GalleryQueryStatus
{
    Success,
    AlbumNotFound
}

public sealed record GalleryAlbumQueryResult(
    GalleryQueryStatus Status,
    AlbumWithImagesResponse? Album = null,
    string? ErrorMessage = null
);

public sealed record GalleryImagesQueryResult(
    GalleryQueryStatus Status,
    List<ImageResponse> Images,
    string? ErrorMessage = null
);

public sealed record GalleryAlbumListQueryResult(
    IReadOnlyCollection<AlbumResponse> Albums,
    int Page,
    int PageSize,
    int Total
);

public enum GalleryCreateAlbumStatus
{
    Success,
    InvalidName
}

public sealed record GalleryCreateAlbumResult(
    GalleryCreateAlbumStatus Status,
    AlbumResponse? Album = null,
    string? ErrorMessage = null
);

public enum GalleryAddImageStatus
{
    Success,
    InvalidImageUrl,
    AlbumNotFound
}

public sealed record GalleryAddImageResult(
    GalleryAddImageStatus Status,
    ImageResponse? Image = null,
    string? ErrorMessage = null
);

public interface IGalleryService
{
    Task<List<AlbumResponse>> GetAllAlbumsAsync(CancellationToken cancellationToken = default);

    Task<GalleryAlbumListQueryResult> GetAlbumsPageAsync(
        string? sortOrder,
        int page = 1,
        int pageSize = 10,
        CancellationToken cancellationToken = default);

    Task<GalleryAlbumQueryResult> GetAlbumByIdAsync(
        Guid albumId,
        Guid? currentUserId = null,
        CancellationToken cancellationToken = default);

    Task<GalleryImagesQueryResult> GetImagesByAlbumAsync(
        Guid albumId,
        CancellationToken cancellationToken = default);

    Task<GalleryCreateAlbumResult> CreateAlbumAsync(
        CreateAlbumRequest request,
        CancellationToken cancellationToken = default);

    Task<GalleryAddImageResult> AddImageToAlbumAsync(
        Guid albumId,
        AddImageToAlbumRequest request,
        CancellationToken cancellationToken = default);
}
