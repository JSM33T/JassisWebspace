using JassSpace.Api.Configuration;
using JassSpace.Api.Services;
using JassSpace.Contracts;
using JassSpace.Contracts.Interfaces;
using JassSpace.Contracts.Requests;
using JassSpace.Contracts.Responses;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace JassSpace.Api.Controllers;

/// <summary>
/// Admin endpoints for managing gallery albums and images
/// </summary>
[Route("admin/gallery")]
[Authorize(Roles = "admin")]
public sealed class AdminGalleryController(
    IAdminGalleryService adminGalleryService,
    ILogger<AdminGalleryController> logger,
    IHttpResponseCacheStore responseCacheStore)
    : BaseApiController
{
    [HttpGet("authors")]
    [ProducesResponseType(typeof(ApiResponse<List<GalleryAuthorResponse>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAuthors(
        [FromQuery] string? search = null,
        [FromQuery] int take = 100,
        CancellationToken cancellationToken = default)
    {
        var authors = await adminGalleryService.GetAuthorsAsync(search, take, cancellationToken);
        return OkEnvelope(authors);
    }

    [HttpGet("albums")]
    [ProducesResponseType(typeof(ApiResponse<List<AlbumResponse>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAlbums(
        [FromQuery] bool? isActive = null,
        CancellationToken cancellationToken = default)
    {
        var albums = await adminGalleryService.GetAlbumsAsync(isActive, cancellationToken);
        return OkEnvelope(albums);
    }

    [HttpGet("albums/{albumId:guid}")]
    [ProducesResponseType(typeof(ApiResponse<AlbumWithImagesResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetAlbum(Guid albumId, CancellationToken cancellationToken = default)
    {
        var result = await adminGalleryService.GetAlbumAsync(albumId, TryGetCurrentUserId(), cancellationToken);
        return result.Status == AdminGalleryOperationStatus.AlbumNotFound
            ? NotFoundProblem("Album not found", result.ErrorMessage)
            : OkEnvelope(result.Album!);
    }

    /// <summary>
    /// Upload an image for gallery use and get back the media controller URL
    /// </summary>
    [HttpPost("upload-image")]
    [ProducesResponseType(typeof(ApiResponse<MediaUploadResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> UploadGalleryImage(
        [FromForm] IFormFile? file,
        [FromForm] string? fileName,
        CancellationToken cancellationToken = default)
    {
        if (file is null || file.Length == 0)
        {
            return BadRequestProblem("No file uploaded", "Provide a non-empty file in the request body.");
        }

        try
        {
            await using var stream = file.OpenReadStream();
            var response = await adminGalleryService.UploadGalleryImageAsync(
                new AdminMediaUploadInput(stream, file.FileName, fileName),
                GetBaseUrl(),
                cancellationToken);

            return OkEnvelope(response);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Gallery image upload failed");
            return Problem(
                StatusCodes.Status500InternalServerError,
                "Image upload failed",
                "An unexpected error occurred while uploading the image.");
        }
    }

    /// <summary>
    /// Create a new album with cover image and multiple images in one request
    /// </summary>
    [HttpPost("albums")]
    [Consumes("multipart/form-data")]
    [ProducesResponseType(typeof(ApiResponse<AlbumWithImagesResponse>), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> CreateAlbumWithImages(
        [FromForm] string name,
        [FromForm] string? slug,
        [FromForm] string? description,
        [FromForm] bool? isActive,
        [FromForm] int? sortOrder,
        [FromForm] IFormFile? coverImage,
        [FromForm] List<IFormFile>? imageFiles,
        [FromForm] List<string>? imageTitles,
        [FromForm] List<string>? imageDescriptions,
        [FromForm] List<int>? imageOrders,
        [FromForm] List<Guid>? authorIds,
        CancellationToken cancellationToken = default)
    {
        var openedStreams = new List<Stream>();
        try
        {
            var coverInput = OpenMediaInput(coverImage, null, openedStreams);
            var imageInputs = OpenGalleryImageInputs(
                imageFiles,
                imageTitles,
                imageDescriptions,
                imageOrders,
                openedStreams);

            var result = await adminGalleryService.CreateAlbumWithImagesAsync(
                new AdminGalleryCreateAlbumWithImagesRequest(
                    name,
                    slug,
                    description,
                    isActive,
                    sortOrder,
                    authorIds),
                coverInput,
                imageInputs,
                GetBaseUrl(),
                cancellationToken);

            if (result.Status != AdminGalleryOperationStatus.Success)
            {
                return MapGalleryProblem(result.Status, result.ErrorMessage);
            }

            await InvalidateGalleryCacheAsync(cancellationToken);
            return OkEnvelope(result.Album!);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to create album with images");
            return Problem(
                StatusCodes.Status500InternalServerError,
                "Failed to create album",
                "An unexpected error occurred while creating the album.");
        }
        finally
        {
            await DisposeStreamsAsync(openedStreams);
        }
    }

    /// <summary>
    /// Add a single image to an existing album
    /// </summary>
    [HttpPost("albums/{albumId:guid}/images/single")]
    [Consumes("multipart/form-data")]
    [ProducesResponseType(typeof(ApiResponse<ImageResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> AddImageToAlbum(
        Guid albumId,
        [FromForm] IFormFile? imageFile,
        [FromForm] string? title,
        [FromForm] string? description,
        [FromForm] int? order,
        CancellationToken cancellationToken = default)
    {
        if (imageFile is null || imageFile.Length == 0)
        {
            return BadRequestProblem("No image provided", "Provide a non-empty image file.");
        }

        try
        {
            await using var stream = imageFile.OpenReadStream();
            var result = await adminGalleryService.AddImageToAlbumAsync(
                albumId,
                new AdminGalleryImageUploadInput(stream, imageFile.FileName, title, description, order),
                GetBaseUrl(),
                cancellationToken);

            if (result.Status != AdminGalleryOperationStatus.Success)
            {
                return MapGalleryProblem(result.Status, result.ErrorMessage);
            }

            await InvalidateGalleryCacheAsync(cancellationToken);
            return OkEnvelope(result.Image!);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to add image to album {AlbumId}", albumId);
            return Problem(
                StatusCodes.Status500InternalServerError,
                "Failed to add image",
                "An unexpected error occurred while adding the image to the album.");
        }
    }

    /// <summary>
    /// Add images to an existing album
    /// </summary>
    [HttpPost("albums/{albumId:guid}/images")]
    [Consumes("multipart/form-data")]
    [ProducesResponseType(typeof(ApiResponse<List<ImageResponse>>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> AddImagesToAlbum(
        Guid albumId,
        [FromForm] List<IFormFile>? imageFiles,
        [FromForm] List<string>? imageTitles,
        [FromForm] List<string>? imageDescriptions,
        [FromForm] List<int>? imageOrders,
        CancellationToken cancellationToken = default)
    {
        if (imageFiles is null || imageFiles.Count == 0)
        {
            return BadRequestProblem("No images provided", "Provide at least one image file.");
        }

        var openedStreams = new List<Stream>();
        try
        {
            var imageInputs = OpenGalleryImageInputs(
                imageFiles,
                imageTitles,
                imageDescriptions,
                imageOrders,
                openedStreams);

            var result = await adminGalleryService.AddImagesToAlbumAsync(
                albumId,
                imageInputs,
                GetBaseUrl(),
                cancellationToken);

            if (result.Status != AdminGalleryOperationStatus.Success)
            {
                return MapGalleryProblem(result.Status, result.ErrorMessage);
            }

            await InvalidateGalleryCacheAsync(cancellationToken);
            return OkEnvelope(result.Images);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to add images to album {AlbumId}", albumId);
            return Problem(
                StatusCodes.Status500InternalServerError,
                "Failed to add images",
                "An unexpected error occurred while adding images to the album.");
        }
        finally
        {
            await DisposeStreamsAsync(openedStreams);
        }
    }

    /// <summary>
    /// Update album details (name, description, cover, active status, sort order)
    /// </summary>
    [HttpPut("albums/{albumId:guid}")]
    [ProducesResponseType(typeof(ApiResponse<AlbumResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateAlbum(
        Guid albumId,
        [FromForm] string? name,
        [FromForm] string? slug,
        [FromForm] string? description,
        [FromForm] DateTimeOffset? createdAt,
        [FromForm] IFormFile? coverImage,
        [FromForm] bool? isActive,
        [FromForm] int? sortOrder,
        [FromForm] List<Guid>? authorIds,
        CancellationToken cancellationToken = default)
    {
        var openedStreams = new List<Stream>();
        try
        {
            var coverInput = OpenMediaInput(coverImage, null, openedStreams);
            var result = await adminGalleryService.UpdateAlbumAsync(
                albumId,
                new AdminGalleryUpdateAlbumRequest(
                    name,
                    slug,
                    description,
                    createdAt,
                    isActive,
                    sortOrder,
                    authorIds),
                coverInput,
                GetBaseUrl(),
                cancellationToken);

            if (result.Status != AdminGalleryOperationStatus.Success)
            {
                return MapGalleryProblem(result.Status, result.ErrorMessage);
            }

            await InvalidateGalleryCacheAsync(cancellationToken);
            return OkEnvelope(result.Album!);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to update album {AlbumId}", albumId);
            return Problem(
                StatusCodes.Status500InternalServerError,
                "Failed to update album",
                "An unexpected error occurred while updating the album.");
        }
        finally
        {
            await DisposeStreamsAsync(openedStreams);
        }
    }

    /// <summary>
    /// Delete an album and all associated images (Hard Delete with Blob Cleanup)
    /// </summary>
    [HttpPost("albums/{albumId:guid}/delete")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DeleteAlbum(Guid albumId, CancellationToken cancellationToken = default)
    {
        try
        {
            var result = await adminGalleryService.DeleteAlbumAsync(albumId, cancellationToken);
            if (result.Status != AdminGalleryOperationStatus.Success)
            {
                return MapGalleryProblem(result.Status, result.ErrorMessage);
            }

            await InvalidateGalleryCacheAsync(cancellationToken);
            return NoContent();
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to delete album {AlbumId} and cleanup blobs", albumId);
            return Problem(
                StatusCodes.Status500InternalServerError,
                "Failed to delete album",
                "An unexpected error occurred while deleting the album.");
        }
    }

    /// <summary>
    /// Update details of a specific image
    /// </summary>
    [HttpPut("images/{imageId:guid}")]
    [ProducesResponseType(typeof(ApiResponse<ImageResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateImage(
        Guid imageId,
        [FromForm] string? title,
        [FromForm] string? description,
        [FromForm] int? order,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var result = await adminGalleryService.UpdateImageAsync(
                imageId,
                title,
                description,
                order,
                cancellationToken);

            if (result.Status != AdminGalleryOperationStatus.Success)
            {
                return MapGalleryProblem(result.Status, result.ErrorMessage);
            }

            await InvalidateGalleryCacheAsync(cancellationToken);
            return OkEnvelope(result.Image!);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to update image {ImageId}", imageId);
            return Problem(
                StatusCodes.Status500InternalServerError,
                "Failed to update image",
                "An unexpected error occurred while updating the image.");
        }
    }

    /// <summary>
    /// Delete an individual image from an album and clean up its blob
    /// </summary>
    [HttpDelete("images/{imageId:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DeleteImage(Guid imageId, CancellationToken cancellationToken = default)
    {
        try
        {
            var result = await adminGalleryService.DeleteImageAsync(imageId, cancellationToken);
            if (result.Status != AdminGalleryOperationStatus.Success)
            {
                return MapGalleryProblem(result.Status, result.ErrorMessage);
            }

            await InvalidateGalleryCacheAsync(cancellationToken);
            return NoContent();
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to delete image {ImageId}", imageId);
            return Problem(
                StatusCodes.Status500InternalServerError,
                "Failed to delete image",
                "An unexpected error occurred while deleting the image.");
        }
    }

    private IActionResult MapGalleryProblem(
        AdminGalleryOperationStatus status,
        string? errorMessage)
    {
        return status switch
        {
            AdminGalleryOperationStatus.InvalidName => BadRequestProblem("Invalid album name", errorMessage),
            AdminGalleryOperationStatus.AlbumNotFound => NotFoundProblem("Album not found", errorMessage),
            AdminGalleryOperationStatus.ImageNotFound => NotFoundProblem("Image not found", errorMessage),
            _ => Problem(
                StatusCodes.Status500InternalServerError,
                "Gallery operation failed",
                "An unexpected error occurred while processing the gallery request.")
        };
    }

    private async Task InvalidateGalleryCacheAsync(CancellationToken cancellationToken)
    {
        await responseCacheStore.InvalidateByBaseKeyAsync(RedisCacheKeys.GallerySeo, cancellationToken);
    }

    private static AdminMediaUploadInput? OpenMediaInput(
        IFormFile? file,
        string? requestedFileName,
        List<Stream> openedStreams)
    {
        if (file is null || file.Length == 0)
        {
            return null;
        }

        var stream = file.OpenReadStream();
        openedStreams.Add(stream);
        return new AdminMediaUploadInput(stream, file.FileName, requestedFileName);
    }

    private static List<AdminGalleryImageUploadInput> OpenGalleryImageInputs(
        List<IFormFile>? imageFiles,
        List<string>? imageTitles,
        List<string>? imageDescriptions,
        List<int>? imageOrders,
        List<Stream> openedStreams)
    {
        var inputs = new List<AdminGalleryImageUploadInput>();
        if (imageFiles is null)
        {
            return inputs;
        }

        for (var i = 0; i < imageFiles.Count; i++)
        {
            var imageFile = imageFiles[i];
            if (imageFile.Length == 0)
            {
                continue;
            }

            var title = imageTitles is not null && i < imageTitles.Count ? imageTitles[i] : null;
            var description = imageDescriptions is not null && i < imageDescriptions.Count ? imageDescriptions[i] : null;
            var order = imageOrders is not null && i < imageOrders.Count ? imageOrders[i] : i + 1;
            var stream = imageFile.OpenReadStream();
            openedStreams.Add(stream);

            inputs.Add(new AdminGalleryImageUploadInput(
                stream,
                imageFile.FileName,
                title,
                description,
                order));
        }

        return inputs;
    }

    private static async ValueTask DisposeStreamsAsync(IEnumerable<Stream> streams)
    {
        foreach (var stream in streams)
        {
            await stream.DisposeAsync();
        }
    }

    private Guid? TryGetCurrentUserId()
    {
        return Guid.TryParse(UserId, out var currentUserId) ? currentUserId : null;
    }

    private string GetBaseUrl()
    {
        return $"{Request.Scheme}://{Request.Host}";
    }
}
