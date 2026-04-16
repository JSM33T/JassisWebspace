using JassSpace.Contracts.Requests;
using JassSpace.Contracts.Responses;

namespace JassSpace.Contracts.Interfaces;

public enum AdminGalleryOperationStatus
{
    Success,
    InvalidName,
    AlbumNotFound,
    ImageNotFound
}

public sealed record AdminGalleryAlbumMutationResult(
    AdminGalleryOperationStatus Status,
    AlbumResponse? Album = null,
    string? ErrorMessage = null
);

public sealed record AdminGalleryAlbumWithImagesMutationResult(
    AdminGalleryOperationStatus Status,
    AlbumWithImagesResponse? Album = null,
    string? ErrorMessage = null
);

public sealed record AdminGalleryImageMutationResult(
    AdminGalleryOperationStatus Status,
    ImageResponse? Image = null,
    string? ErrorMessage = null
);

public sealed record AdminGalleryImagesMutationResult(
    AdminGalleryOperationStatus Status,
    List<ImageResponse> Images,
    string? ErrorMessage = null
);

public sealed record AdminGalleryDeleteResult(
    AdminGalleryOperationStatus Status,
    string? ErrorMessage = null
);

public interface IAdminGalleryService
{
    Task<List<GalleryAuthorResponse>> GetAuthorsAsync(
        string? search = null,
        int take = 100,
        CancellationToken cancellationToken = default);

    Task<List<AlbumResponse>> GetAlbumsAsync(
        bool? isActive = null,
        CancellationToken cancellationToken = default);

    Task<AdminGalleryAlbumWithImagesMutationResult> GetAlbumAsync(
        Guid albumId,
        Guid? currentUserId,
        CancellationToken cancellationToken = default);

    Task<MediaUploadResponse> UploadGalleryImageAsync(
        AdminMediaUploadInput file,
        string mediaBaseUrl,
        CancellationToken cancellationToken = default);

    Task<AdminGalleryAlbumWithImagesMutationResult> CreateAlbumWithImagesAsync(
        AdminGalleryCreateAlbumWithImagesRequest request,
        AdminMediaUploadInput? coverImage,
        IReadOnlyCollection<AdminGalleryImageUploadInput> imageFiles,
        string mediaBaseUrl,
        CancellationToken cancellationToken = default);

    Task<AdminGalleryImageMutationResult> AddImageToAlbumAsync(
        Guid albumId,
        AdminGalleryImageUploadInput imageFile,
        string mediaBaseUrl,
        CancellationToken cancellationToken = default);

    Task<AdminGalleryImagesMutationResult> AddImagesToAlbumAsync(
        Guid albumId,
        IReadOnlyCollection<AdminGalleryImageUploadInput> imageFiles,
        string mediaBaseUrl,
        CancellationToken cancellationToken = default);

    Task<AdminGalleryAlbumMutationResult> UpdateAlbumAsync(
        Guid albumId,
        AdminGalleryUpdateAlbumRequest request,
        AdminMediaUploadInput? coverImage,
        string mediaBaseUrl,
        CancellationToken cancellationToken = default);

    Task<AdminGalleryDeleteResult> DeleteAlbumAsync(
        Guid albumId,
        CancellationToken cancellationToken = default);

    Task<AdminGalleryImageMutationResult> UpdateImageAsync(
        Guid imageId,
        string? title,
        string? description,
        int? order,
        CancellationToken cancellationToken = default);

    Task<AdminGalleryDeleteResult> DeleteImageAsync(
        Guid imageId,
        CancellationToken cancellationToken = default);
}
