using JassSpace.Api.Configuration;
using JassSpace.Api.Services;
using JassSpace.Contracts;
using JassSpace.Contracts.Interfaces;
using JassSpace.Contracts.Requests;
using JassSpace.Contracts.Responses;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace JassSpace.Api.Controllers;

[Route("gallery")]
public sealed class GalleryController(
    IGalleryService galleryService,
    ILogger<GalleryController> logger,
    IHttpResponseCacheStore responseCacheStore)
    : BaseApiController
{
    /// <summary>
    /// Gets all albums with their image counts.
    /// </summary>
    [HttpGet("albums")]
    [ProducesResponseType(typeof(ApiResponse<List<AlbumResponse>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAllAlbums(CancellationToken cancellationToken = default)
    {
        try
        {
            var albums = await galleryService.GetAllAlbumsAsync(cancellationToken);
            return OkEnvelope(albums);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to retrieve albums");
            return Problem(
                StatusCodes.Status500InternalServerError,
                "Failed to retrieve albums",
                "An unexpected error occurred while retrieving albums.");
        }
    }

    /// <summary>
    /// Gets a specific album by ID with all its images.
    /// </summary>
    [HttpGet("albums/{albumId:guid}")]
    [ProducesResponseType(typeof(ApiResponse<AlbumWithImagesResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetAlbumById(Guid albumId, CancellationToken cancellationToken = default)
    {
        try
        {
            Guid? currentUserId = Guid.TryParse(UserId, out var userGuid) ? userGuid : null;
            var result = await galleryService.GetAlbumByIdAsync(albumId, currentUserId, cancellationToken);

            if (result.Status == GalleryQueryStatus.AlbumNotFound)
            {
                return NotFoundProblem("Album not found", $"No album found with ID '{albumId}'.");
            }

            return OkEnvelope(result.Album!);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to retrieve album {AlbumId}", albumId);
            return Problem(
                StatusCodes.Status500InternalServerError,
                "Failed to retrieve album",
                "An unexpected error occurred while retrieving the album.");
        }
    }

    /// <summary>
    /// Gets all images for a specific album.
    /// </summary>
    [HttpGet("albums/{albumId:guid}/images")]
    [ProducesResponseType(typeof(ApiResponse<List<ImageResponse>>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetImagesByAlbum(Guid albumId, CancellationToken cancellationToken = default)
    {
        try
        {
            var result = await galleryService.GetImagesByAlbumAsync(albumId, cancellationToken);
            if (result.Status == GalleryQueryStatus.AlbumNotFound)
            {
                return NotFoundProblem("Album not found", $"No album found with ID '{albumId}'.");
            }

            return OkEnvelope(result.Images);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to retrieve images for album {AlbumId}", albumId);
            return Problem(
                StatusCodes.Status500InternalServerError,
                "Failed to retrieve images",
                "An unexpected error occurred while retrieving images.");
        }
    }

    /// <summary>
    /// Creates a new album and automatically creates a Content entry for it.
    /// </summary>
    [HttpPost("albums")]
    [Authorize]
    [ProducesResponseType(typeof(ApiResponse<AlbumResponse>), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> CreateAlbum([FromBody] CreateAlbumRequest request, CancellationToken cancellationToken = default)
    {
        try
        {
            var result = await galleryService.CreateAlbumAsync(request, cancellationToken);
            if (result.Status == GalleryCreateAlbumStatus.InvalidName)
            {
                return BadRequestProblem("Invalid album name", result.ErrorMessage);
            }

            await responseCacheStore.InvalidateByBaseKeyAsync(RedisCacheKeys.GallerySeo, cancellationToken);
            return OkEnvelope(result.Album!);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to create album");
            return Problem(
                StatusCodes.Status500InternalServerError,
                "Failed to create album",
                "An unexpected error occurred while creating the album.");
        }
    }

    /// <summary>
    /// Adds an image to an existing album.
    /// </summary>
    [HttpPost("albums/{albumId:guid}/images")]
    [Authorize]
    [ProducesResponseType(typeof(ApiResponse<ImageResponse>), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> AddImageToAlbum(
        Guid albumId,
        [FromBody] AddImageToAlbumRequest request,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var result = await galleryService.AddImageToAlbumAsync(albumId, request, cancellationToken);
            if (result.Status == GalleryAddImageStatus.InvalidImageUrl)
            {
                return BadRequestProblem("Invalid image URL", result.ErrorMessage);
            }

            if (result.Status == GalleryAddImageStatus.AlbumNotFound)
            {
                return NotFoundProblem("Album not found", $"No album found with ID '{albumId}'.");
            }

            await responseCacheStore.InvalidateByBaseKeyAsync(RedisCacheKeys.GallerySeo, cancellationToken);
            return OkEnvelope(result.Image!);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to add image to album {AlbumId}", albumId);
            return Problem(
                StatusCodes.Status500InternalServerError,
                "Failed to add image",
                "An unexpected error occurred while adding the image.");
        }
    }

}
