using JassSpace.Api.Extensions;
using JassSpace.Contracts;
using JassSpace.Contracts.Requests;
using JassSpace.Contracts.Responses;
using JassSpace.Data;
using JassSpace.Entities;
using JassSpace.Entities.Enums;
using JassSpace.Infra;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Text.RegularExpressions;

namespace JassSpace.Api.Controllers;

/// <summary>
/// Admin endpoints for managing gallery albums and images
/// </summary>
[Route("admin/gallery")]
[Authorize(Roles = "admin")]
public sealed class AdminGalleryController(
    JassSpaceDbContext dbContext,
    IAzureBlobStorageService blobStorageService,
    IImageProcessingService imageProcessingService,
    ILogger<AdminGalleryController> logger,
    IHttpContextAccessor httpContextAccessor)
    : BaseApiController
{
    private string GetBaseUrl()
    {
        var request = httpContextAccessor.HttpContext?.Request;
        if (request == null) return "http://localhost:5283";
        return $"{request.Scheme}://{request.Host}";
    }

    private string GetFullMediaUrl(string blobName)
    {
        return $"{GetBaseUrl()}/media/{blobName}";
    }

    private async Task<BlobUploadResult> UploadFileAsync(IFormFile file, string? blobName, CancellationToken cancellationToken)
    {
        await using var stream = file.OpenReadStream();
        
        // Process the image (convert to WebP and scale if needed)
        await using var processedStream = await imageProcessingService.ProcessImageAsync(stream, cancellationToken);
        
        return await blobStorageService.UploadImageAsync(
            processedStream,
            file.FileName,
            "image/webp", // Force WebP content type
            blobName,
            cancellationToken);
    }

    /// <summary>
    /// Upload an image for gallery use and get back the media controller URL
    /// </summary>
    [HttpPost("upload-image")]
    [ProducesResponseType(typeof(ApiResponse<MediaUploadResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> UploadGalleryImage(
        [FromForm] IFormFile? file,
        CancellationToken cancellationToken = default)
    {
        if (file is null || file.Length == 0)
        {
            return BadRequestProblem("No file uploaded", "Provide a non-empty file in the request body.");
        }

        try
        {
            // Upload to Azure Blob Storage
            var uploadResult = await UploadFileAsync(file, "gallery/" + Guid.NewGuid(), cancellationToken);
            
            // Return the media controller URL instead of blob URL
            var mediaUrl = GetFullMediaUrl(uploadResult.BlobName);
            var response = new MediaUploadResponse(uploadResult.BlobName, mediaUrl);
            
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
        [FromForm] string? description,
        [FromForm] IFormFile? coverImage,
        [FromForm] List<IFormFile>? imageFiles,
        [FromForm] List<string>? imageTitles,
        [FromForm] List<string>? imageDescriptions,
        [FromForm] List<int>? imageOrders,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(name))
        {
            return BadRequestProblem("Invalid album name", "Album name cannot be empty.");
        }

        try
        {
            // Generate slug
            var slug = GenerateSlug(name);
            
            // Check if slug already exists
            var slugExists = await dbContext.Albums
                .AnyAsync(a => a.Slug == slug, cancellationToken);
            
            if (slugExists)
            {
                slug = $"{slug}-{Guid.NewGuid().ToString().Substring(0, 8)}";
            }

            var albumId = Guid.NewGuid();

            // Upload cover image if provided
            string? coverUrl = null;
            if (coverImage is not null && coverImage.Length > 0)
            {
                // Use ID for immutable blob path
                var coverUpload = await UploadFileAsync(coverImage, $"gallery/covers/{albumId}", cancellationToken);
                coverUrl = GetFullMediaUrl(coverUpload.BlobName);
            }

            // Create the album
            var album = new Album
            {
                Id = albumId,
                Name = name,
                Slug = slug,
                Cover = coverUrl,
                Description = description,
                IsActive = true,
                CreatedAt = DateTimeOffset.UtcNow,
                UpdatedAt = DateTimeOffset.UtcNow
            };

            dbContext.Albums.Add(album);

            // Create Content entry
            var contentSlug = slug;
            var existingContentSlug = await dbContext.Contents
                .AnyAsync(c => c.Slug == contentSlug, cancellationToken);
            
            if (existingContentSlug)
            {
                contentSlug = $"{slug}-{album.Id.ToString().Substring(0, 8)}";
            }

            var content = new Content
            {
                Id = Guid.NewGuid(),
                ContentType = ContentType.Album,
                ContentRefId = album.Id,
                Title = name,
                Slug = contentSlug,
                IsPublished = true,
                PublishedAt = DateTimeOffset.UtcNow,
                CreatedAt = DateTimeOffset.UtcNow,
                UpdatedAt = DateTimeOffset.UtcNow
            };

            dbContext.Contents.Add(content);

            // Upload and create images
            var images = new List<Image>();
            if (imageFiles is not null && imageFiles.Count > 0)
            {
                for (int i = 0; i < imageFiles.Count; i++)
                {
                    var imageFile = imageFiles[i];
                    if (imageFile.Length == 0) continue;

                    // Upload image to blob using Album ID
                    var imageUpload = await UploadFileAsync(imageFile, $"gallery/images/{albumId}-{Guid.NewGuid()}", cancellationToken);
                    var imageUrl = GetFullMediaUrl(imageUpload.BlobName);

                    // Get metadata for this image
                    var title = imageTitles != null && i < imageTitles.Count ? imageTitles[i] : null;
                    var desc = imageDescriptions != null && i < imageDescriptions.Count ? imageDescriptions[i] : null;
                    var order = imageOrders != null && i < imageOrders.Count ? imageOrders[i] : i + 1;

                    var image = new Image
                    {
                        Id = Guid.NewGuid(),
                        AlbumId = album.Id,
                        Url = imageUrl,
                        Title = title,
                        Description = desc,
                        Order = order,
                        CreatedAt = DateTimeOffset.UtcNow
                    };

                    images.Add(image);
                    dbContext.Images.Add(image);
                }
            }

            await dbContext.SaveChangesAsync(cancellationToken);

            // Return the created album with images
            var response = new AlbumWithImagesResponse(
                album.Id,
                album.Name,
                album.Slug,
                album.Cover,
                album.Description,
                album.CreatedAt,
                album.UpdatedAt,
                images.Select(i => new ImageResponse(
                    i.Id,
                    i.AlbumId,
                    i.Url,
                    i.Title,
                    i.Description,
                    i.Order,
                    i.CreatedAt
                )).ToList()
            );

            return OkEnvelope(response);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to create album with images");
            return Problem(
                StatusCodes.Status500InternalServerError,
                "Failed to create album",
                "An unexpected error occurred while creating the album.");
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
        // Check if album exists
        var albumExists = await dbContext.Albums
            .AnyAsync(a => a.Id == albumId, cancellationToken);

        if (!albumExists)
        {
            return NotFoundProblem("Album not found", $"No album found with ID '{albumId}'.");
        }

        if (imageFiles is null || imageFiles.Count == 0)
        {
            return BadRequestProblem("No images provided", "Provide at least one image file.");
        }

        try
        {
            var images = new List<Image>();

            for (int i = 0; i < imageFiles.Count; i++)
            {
                var imageFile = imageFiles[i];
                if (imageFile.Length == 0) continue;

                // Upload image to blob
                var imageUpload = await UploadFileAsync(imageFile, $"gallery/images/{albumId}-{Guid.NewGuid()}", cancellationToken);
                var imageUrl = GetFullMediaUrl(imageUpload.BlobName);

                // Get metadata for this image
                var title = imageTitles != null && i < imageTitles.Count ? imageTitles[i] : null;
                var desc = imageDescriptions != null && i < imageDescriptions.Count ? imageDescriptions[i] : null;
                var order = imageOrders != null && i < imageOrders.Count ? imageOrders[i] : i + 1;

                var image = new Image
                {
                    Id = Guid.NewGuid(),
                    AlbumId = albumId,
                    Url = imageUrl,
                    Title = title,
                    Description = desc,
                    Order = order,
                    CreatedAt = DateTimeOffset.UtcNow
                };

                images.Add(image);
                dbContext.Images.Add(image);
            }

            await dbContext.SaveChangesAsync(cancellationToken);

            var response = images.Select(i => new ImageResponse(
                i.Id,
                i.AlbumId,
                i.Url,
                i.Title,
                i.Description,
                i.Order,
                i.CreatedAt
            )).ToList();

            return OkEnvelope(response);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to add images to album {AlbumId}", albumId);
            return Problem(
                StatusCodes.Status500InternalServerError,
                "Failed to add images",
                "An unexpected error occurred while adding images to the album.");
        }
    }

    /// <summary>
    /// Update album details (name, description, cover, active status)
    /// </summary>
    [HttpPut("albums/{albumId:guid}")]
    [ProducesResponseType(typeof(ApiResponse<AlbumResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateAlbum(
        Guid albumId,
        [FromForm] string? name,
        [FromForm] string? description,
        [FromForm] IFormFile? coverImage,
        [FromForm] bool? isActive,
        CancellationToken cancellationToken = default)
    {
        var album = await dbContext.Albums
            .FirstOrDefaultAsync(a => a.Id == albumId, cancellationToken);

        if (album is null)
        {
            return NotFoundProblem("Album not found", $"No album found with ID '{albumId}'.");
        }

        try
        {
            // Update name and slug if provided
            if (!string.IsNullOrWhiteSpace(name) && name != album.Name)
            {
                album.Name = name;
                var newSlug = GenerateSlug(name);
                
                var slugExists = await dbContext.Albums
                    .AnyAsync(a => a.Slug == newSlug && a.Id != albumId, cancellationToken);
                
                if (!slugExists)
                {
                    album.Slug = newSlug;
                }
            }

            // Update description
            if (description is not null)
            {
                album.Description = description;
            }

            // Upload new cover image if provided
            if (coverImage is not null && coverImage.Length > 0)
            {
                var coverUpload = await UploadFileAsync(coverImage, $"gallery/covers/{albumId}", cancellationToken);
                album.Cover = GetFullMediaUrl(coverUpload.BlobName);
            }

            // Update active status
            if (isActive.HasValue)
            {
                album.IsActive = isActive.Value;
            }

            album.UpdatedAt = DateTimeOffset.UtcNow;

            await dbContext.SaveChangesAsync(cancellationToken);

            var imageCount = await dbContext.Images
                .CountAsync(i => i.AlbumId == albumId, cancellationToken);

            var response = new AlbumResponse(
                album.Id,
                album.Name,
                album.Slug,
                album.Cover,
                album.Description,
                album.CreatedAt,
                album.UpdatedAt,
                imageCount
            );

            return OkEnvelope(response);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to update album {AlbumId}", albumId);
            return Problem(
                StatusCodes.Status500InternalServerError,
                "Failed to update album",
                "An unexpected error occurred while updating the album.");
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
        var album = await dbContext.Albums
            .Include(a => a.Images)
            .FirstOrDefaultAsync(a => a.Id == albumId, cancellationToken);

        if (album is null)
        {
            return NotFoundProblem("Album not found", $"No album found with ID '{albumId}'.");
        }

        try
        {
            // 1. Delete Cover Image Blob if exists
            var coverBlobName = ExtractBlobNameFromUrl(album.Cover);
            if (!string.IsNullOrEmpty(coverBlobName))
            {
                await blobStorageService.DeleteBlobAsync(coverBlobName, cancellationToken);
            }

            // 2. Delete All Image Blobs
            foreach (var image in album.Images)
            {
                var imageBlobName = ExtractBlobNameFromUrl(image.Url);
                if (!string.IsNullOrEmpty(imageBlobName))
                {
                    await blobStorageService.DeleteBlobAsync(imageBlobName, cancellationToken);
                }
            }

            // 3. Delete DB Records
            // Cascade delete should handle Images if configured, but let's be explicit with the context
            dbContext.Images.RemoveRange(album.Images); // Remove images first
            
            // Remove Content entry if exists (polymorphic relation manual cleanup usually)
            var content = await dbContext.Contents
                .FirstOrDefaultAsync(c => c.ContentRefId == albumId && c.ContentType == ContentType.Album, cancellationToken);
            if (content != null)
            {
                 dbContext.Contents.Remove(content);
            }

            dbContext.Albums.Remove(album);
            
            await dbContext.SaveChangesAsync(cancellationToken);

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
        var image = await dbContext.Images
            .FirstOrDefaultAsync(i => i.Id == imageId, cancellationToken);

        if (image is null)
        {
            return NotFoundProblem("Image not found", $"No image found with ID '{imageId}'.");
        }

        try
        {
            if (title != null) image.Title = title;
            if (description != null) image.Description = description;
            if (order.HasValue) image.Order = order.Value;

            await dbContext.SaveChangesAsync(cancellationToken);

            var response = new ImageResponse(
                image.Id,
                image.AlbumId,
                image.Url,
                image.Title,
                image.Description,
                image.Order,
                image.CreatedAt
            );

            return OkEnvelope(response);
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
        var image = await dbContext.Images
            .FirstOrDefaultAsync(i => i.Id == imageId, cancellationToken);

        if (image is null)
        {
            return NotFoundProblem("Image not found", $"No image found with ID '{imageId}'.");
        }

        try
        {
            // 1. Delete Blob
            var blobName = ExtractBlobNameFromUrl(image.Url);
            if (!string.IsNullOrEmpty(blobName))
            {
                await blobStorageService.DeleteBlobAsync(blobName, cancellationToken);
            }

            // 2. Delete DB Record
            dbContext.Images.Remove(image);
            await dbContext.SaveChangesAsync(cancellationToken);

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

    private string? ExtractBlobNameFromUrl(string? url)
    {
        if (string.IsNullOrEmpty(url)) return null;
        var marker = "/media/";
        var index = url.IndexOf(marker, StringComparison.OrdinalIgnoreCase);
        if (index == -1) return null;
        
        return url.Substring(index + marker.Length);
    }

    /// <summary>
    /// Generates a URL-friendly slug from a title
    /// </summary>
    private static string GenerateSlug(string title)
    {
        var slug = title.ToLowerInvariant();
        slug = Regex.Replace(slug, @"[^a-z0-9\s-]", "");
        slug = Regex.Replace(slug, @"\s+", "-");
        slug = Regex.Replace(slug, @"-+", "-");
        slug = slug.Trim('-');
        return slug;
    }
}
