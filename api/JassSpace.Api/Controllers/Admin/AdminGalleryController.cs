using JassSpace.Api.Configuration;
using JassSpace.Api.Extensions;
using JassSpace.Api.Services;
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
    IHttpContextAccessor httpContextAccessor,
    IHttpResponseCacheStore responseCacheStore)
    : BaseApiController
{
    private const string GalleryBlobPrefix = "gallery/";

    [HttpGet("authors")]
    [ProducesResponseType(typeof(ApiResponse<List<GalleryAuthorResponse>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAuthors(
        [FromQuery] string? search = null,
        [FromQuery] int take = 100,
        CancellationToken cancellationToken = default)
    {
        take = Math.Clamp(take, 1, 200);
        var query = dbContext.Users
            .AsNoTracking()
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
        {
            var pattern = $"%{search.Trim()}%";
            query = query.Where(u =>
                EF.Functions.ILike(u.Username, pattern) ||
                EF.Functions.ILike(u.DisplayName ?? string.Empty, pattern) ||
                EF.Functions.ILike(u.FirstName ?? string.Empty, pattern) ||
                EF.Functions.ILike(u.LastName ?? string.Empty, pattern));
        }

        var authors = await query
            .OrderBy(u => u.FirstName).ThenBy(u => u.LastName)
            .Take(take)
            .Select(u => new GalleryAuthorResponse(
                u.Id,
                u.Username,
                u.DisplayName ?? $"{u.FirstName} {u.LastName}".Trim(),
                0
            ))
            .ToListAsync(cancellationToken);

        return OkEnvelope(authors);
    }

    [HttpGet("albums")]
    [ProducesResponseType(typeof(ApiResponse<List<AlbumResponse>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAlbums(
        [FromQuery] bool? isActive = null,
        CancellationToken cancellationToken = default)
    {
        var query = dbContext.Albums
            .AsNoTracking()
            .AsQueryable();

        if (isActive.HasValue)
        {
            query = query.Where(a => a.IsActive == isActive.Value);
        }

        var albums = await query
            .OrderBy(a => a.SortOrder)
            .ThenByDescending(a => a.UpdatedAt ?? a.CreatedAt)
            .Select(a => new AlbumResponse(
                a.Id,
                a.Name,
                a.Slug,
                a.Cover,
                a.Description,
                a.CreatedAt,
                a.UpdatedAt,
                a.Images.Count,
                a.Authors
                    .OrderBy(ga => ga.Order)
                    .Select(ga => new GalleryAuthorResponse(
                        ga.UserId,
                        ga.User.Username,
                        ga.User.DisplayName,
                        ga.Order
                    ))
                    .ToList(),
                dbContext.Contents
                    .Where(c => c.ContentType == ContentType.Album && c.ContentRefId == a.Id)
                    .Select(c => (Guid?)c.Id)
                    .FirstOrDefault(),
                a.IsActive,
                a.SortOrder
            ))
            .ToListAsync(cancellationToken);

        var normalized = albums
            .Select(a => a with { Cover = NormalizeGalleryMediaUrl(a.Cover) })
            .ToList();

        return OkEnvelope(normalized);
    }

    [HttpGet("albums/{albumId:guid}")]
    [ProducesResponseType(typeof(ApiResponse<AlbumWithImagesResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetAlbum(Guid albumId, CancellationToken cancellationToken = default)
    {
        var album = await GetAlbumWithDetails(albumId, cancellationToken);

        if (album is null)
        {
            return NotFoundProblem("Album not found", $"No album found with ID '{albumId}'.");
        }

        return OkEnvelope(album);
    }

    private string GetBaseUrl()
    {
        var request = httpContextAccessor.HttpContext?.Request;
        if (request == null) return "http://localhost:5283";
        return $"{request.Scheme}://{request.Host}";
    }

    private string GetFullMediaUrl(string blobName)
    {
        var publicBlobName = StripGalleryPrefix(blobName);
        return $"{GetBaseUrl()}/media/{publicBlobName}";
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
            string.IsNullOrWhiteSpace(blobName) ? null : EnsureGalleryBlobName(blobName),
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
        [FromForm] string? fileName,
        CancellationToken cancellationToken = default)
    {
        if (file is null || file.Length == 0)
        {
            return BadRequestProblem("No file uploaded", "Provide a non-empty file in the request body.");
        }

        try
        {
            // Use custom fileName if provided (e.g. Blog ID), otherwise random
            // Note: UploadFileAsync forces WebP, so actual blob name will effectively be {fileName/guid} (no extension in blob name, but MIME type correct)
            // or we can append it here if we want extension in blob name.
            // AzureBlobStorageService doesn't append extension unless name is null.
            // But browsers might need extension for some behavior? 
            // The previous logic used just GUID string. Let's stick to consistent logic.
            // If fileName is "123-abc", blob name is "123-abc".
            
            var baseName = !string.IsNullOrWhiteSpace(fileName) ? fileName : Guid.NewGuid().ToString();
            
            // Revert back: using just the base name.
            // If the user wants to ensure overwrite by ID, they pass the ID.
            
            var uploadResult = await UploadFileAsync(file, baseName, cancellationToken);
            
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
        if (string.IsNullOrWhiteSpace(name))
        {
            return BadRequestProblem("Invalid album name", "Album name cannot be empty.");
        }

        try
        {
            // Generate slug
            var targetSlug = !string.IsNullOrWhiteSpace(slug) 
                ? GenerateSlug(slug) 
                : GenerateSlug(name);
            
            // Check if slug already exists
            var slugExists = await dbContext.Albums
                .AnyAsync(a => a.Slug == targetSlug, cancellationToken);
            
            if (slugExists)
            {
                targetSlug = $"{targetSlug}-{Guid.NewGuid().ToString().Substring(0, 8)}";
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
                Slug = targetSlug,
                Cover = coverUrl,
                Description = description,
                IsActive = isActive ?? true,
                SortOrder = sortOrder ?? await GetNextAlbumSortOrder(cancellationToken),
                CreatedAt = DateTimeOffset.UtcNow,
                UpdatedAt = DateTimeOffset.UtcNow
            };

            dbContext.Albums.Add(album);

            var authorResponses = new List<GalleryAuthorResponse>();
            if (authorIds is { Count: > 0 })
            {
                var validAuthors = await dbContext.Users
                    .Where(u => authorIds.Contains(u.Id))
                    .Select(u => new
                    {
                        u.Id,
                        u.Username,
                        u.DisplayName
                    })
                    .ToListAsync(cancellationToken);

                for (int i = 0; i < authorIds.Count; i++)
                {
                    var authorId = authorIds[i];
                    var matched = validAuthors.FirstOrDefault(u => u.Id == authorId);
                    if (matched is null)
                    {
                        continue;
                    }

                    dbContext.GalleryAuthors.Add(new GalleryAuthor
                    {
                        Id = Guid.NewGuid(),
                        AlbumId = album.Id,
                        UserId = authorId,
                        Order = i,
                        CreatedAt = DateTimeOffset.UtcNow
                    });

                    authorResponses.Add(new GalleryAuthorResponse(
                        matched.Id,
                        matched.Username,
                        matched.DisplayName,
                        i
                    ));
                }
            }

            // Create Content entry
            var contentSlug = targetSlug;
            var existingContentSlug = await dbContext.Contents
                .AnyAsync(c => c.Slug == contentSlug, cancellationToken);
            
            if (existingContentSlug)
            {
                contentSlug = $"{targetSlug}-{album.Id.ToString().Substring(0, 8)}";
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
            await responseCacheStore.InvalidateByBaseKeyAsync(RedisCacheKeys.GallerySeo, cancellationToken);

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
                )).ToList(),
                authorResponses,
                content.Id,
                0,
                false,
                0,
                album.IsActive,
                album.SortOrder
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
            await responseCacheStore.InvalidateByBaseKeyAsync(RedisCacheKeys.GallerySeo, cancellationToken);

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
        var album = await dbContext.Albums
            .Include(a => a.Authors)
            .FirstOrDefaultAsync(a => a.Id == albumId, cancellationToken);

        if (album is null)
        {
            return NotFoundProblem("Album not found", $"No album found with ID '{albumId}'.");
        }

        try
        {
            var originalName = album.Name;

            // Update name and slug
            if (!string.IsNullOrWhiteSpace(name))
            {
                if (name != album.Name)
                {
                    album.Name = name;
                }
            }

            // Handle Slug Update
            var targetSlug = !string.IsNullOrWhiteSpace(slug)
                ? GenerateSlug(slug)
                : (!string.IsNullOrWhiteSpace(name) && name != originalName ? GenerateSlug(name) : album.Slug);

            if (targetSlug != album.Slug)
            {
                 var slugExists = await dbContext.Albums
                    .AnyAsync(a => a.Slug == targetSlug && a.Id != albumId, cancellationToken);
                
                if (!slugExists)
                {
                    album.Slug = targetSlug;
                }
                else 
                {
                     // If slug taken by another album, append random
                     album.Slug = $"{targetSlug}-{Guid.NewGuid().ToString().Substring(0, 8)}";
                }
            }

            // Update description
            if (description is not null)
            {
                album.Description = description;
            }

            if (createdAt.HasValue)
            {
                album.CreatedAt = createdAt.Value.ToUniversalTime();
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

            if (sortOrder.HasValue)
            {
                album.SortOrder = sortOrder.Value;
            }

            album.UpdatedAt = DateTimeOffset.UtcNow;

            var requestAuthorIds = authorIds ?? new List<Guid>();
            var authorsToRemove = album.Authors.Where(a => !requestAuthorIds.Contains(a.UserId)).ToList();
            foreach (var author in authorsToRemove)
            {
                dbContext.GalleryAuthors.Remove(author);
            }

            var existingAuthorUserIds = album.Authors.Select(a => a.UserId).ToList();
            var newAuthorUserIds = requestAuthorIds.Where(uid => !existingAuthorUserIds.Contains(uid)).ToList();
            if (newAuthorUserIds.Count > 0)
            {
                var existingUsers = await dbContext.Users
                    .Where(u => newAuthorUserIds.Contains(u.Id))
                    .Select(u => u.Id)
                    .ToListAsync(cancellationToken);

                var orderByUserId = requestAuthorIds
                    .Select((id, index) => new { id, index })
                    .ToDictionary(x => x.id, x => x.index);

                foreach (var userId in newAuthorUserIds)
                {
                    if (!existingUsers.Contains(userId))
                    {
                        continue;
                    }

                    dbContext.GalleryAuthors.Add(new GalleryAuthor
                    {
                        Id = Guid.NewGuid(),
                        AlbumId = albumId,
                        UserId = userId,
                        Order = orderByUserId[userId],
                        CreatedAt = DateTimeOffset.UtcNow
                    });
                }
            }

            await dbContext.SaveChangesAsync(cancellationToken);
            await responseCacheStore.InvalidateByBaseKeyAsync(RedisCacheKeys.GallerySeo, cancellationToken);

            var imageCount = await dbContext.Images
                .CountAsync(i => i.AlbumId == albumId, cancellationToken);
            var authors = await dbContext.GalleryAuthors
                .Where(ga => ga.AlbumId == albumId)
                .OrderBy(ga => ga.Order)
                .Select(ga => new GalleryAuthorResponse(
                    ga.UserId,
                    ga.User.Username,
                    ga.User.DisplayName,
                    ga.Order
                ))
                .ToListAsync(cancellationToken);

            var response = new AlbumResponse(
                album.Id,
                album.Name,
                album.Slug,
                album.Cover,
                album.Description,
                album.CreatedAt,
                album.UpdatedAt,
                imageCount,
                authors,
                await dbContext.Contents
                    .Where(c => c.ContentType == ContentType.Album && c.ContentRefId == albumId)
                    .Select(c => (Guid?)c.Id)
                    .FirstOrDefaultAsync(cancellationToken),
                album.IsActive,
                album.SortOrder
            );

            return OkEnvelope(response with { Cover = NormalizeGalleryMediaUrl(response.Cover) });
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
            await responseCacheStore.InvalidateByBaseKeyAsync(RedisCacheKeys.GallerySeo, cancellationToken);

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
            await responseCacheStore.InvalidateByBaseKeyAsync(RedisCacheKeys.GallerySeo, cancellationToken);

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
            await responseCacheStore.InvalidateByBaseKeyAsync(RedisCacheKeys.GallerySeo, cancellationToken);

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

        var blobName = url[(index + marker.Length)..].Trim();
        if (string.IsNullOrWhiteSpace(blobName))
        {
            return null;
        }

        return EnsureGalleryBlobName(blobName);
    }

    private static string EnsureGalleryBlobName(string blobName)
    {
        var normalized = blobName.Trim().TrimStart('/').Replace('\\', '/');
        return normalized.StartsWith(GalleryBlobPrefix, StringComparison.OrdinalIgnoreCase)
            ? normalized
            : $"{GalleryBlobPrefix}{normalized}";
    }

    private static string StripGalleryPrefix(string blobName)
    {
        if (blobName.StartsWith(GalleryBlobPrefix, StringComparison.OrdinalIgnoreCase))
        {
            return blobName[GalleryBlobPrefix.Length..];
        }

        return blobName;
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

    private async Task<int> GetNextAlbumSortOrder(CancellationToken cancellationToken)
    {
        var maxSortOrder = await dbContext.Albums
            .Select(a => (int?)a.SortOrder)
            .MaxAsync(cancellationToken);

        return (maxSortOrder ?? -1) + 1;
    }

    private async Task<AlbumWithImagesResponse?> GetAlbumWithDetails(Guid albumId, CancellationToken cancellationToken)
    {
        var albumData = await dbContext.Albums
            .AsNoTracking()
            .Where(a => a.Id == albumId)
            .Select(a => new
            {
                a.Id,
                a.Name,
                a.Slug,
                a.Cover,
                a.Description,
                a.CreatedAt,
                a.UpdatedAt,
                a.IsActive,
                a.SortOrder,
                Authors = a.Authors
                    .OrderBy(ga => ga.Order)
                    .Select(ga => new GalleryAuthorResponse(
                        ga.UserId,
                        ga.User.Username,
                        ga.User.DisplayName,
                        ga.Order
                    ))
                    .ToList(),
                Images = a.Images
                    .OrderBy(i => i.Order)
                    .Select(i => new ImageResponse(
                        i.Id,
                        i.AlbumId,
                        i.Url,
                        i.Title,
                        i.Description,
                        i.Order,
                        i.CreatedAt
                    ))
                    .ToList()
            })
            .FirstOrDefaultAsync(cancellationToken);

        if (albumData is null)
        {
            return null;
        }

        var contentId = await dbContext.Contents
            .Where(c => c.ContentType == ContentType.Album && c.ContentRefId == albumId)
            .Select(c => (Guid?)c.Id)
            .FirstOrDefaultAsync(cancellationToken);

        var likeCount = 0;
        var commentCount = 0;
        var isLiked = false;

        if (contentId.HasValue)
        {
            likeCount = await dbContext.Likes
                .CountAsync(l => l.ContentId == contentId.Value, cancellationToken);

            commentCount = await dbContext.Comments
                .CountAsync(cm => cm.ContentId == contentId.Value && !cm.IsDeleted, cancellationToken);

            if (Guid.TryParse(UserId, out var userGuid))
            {
                isLiked = await dbContext.Likes
                    .AnyAsync(l => l.ContentId == contentId.Value && l.UserId == userGuid, cancellationToken);
            }
        }

        return new AlbumWithImagesResponse(
            albumData.Id,
            albumData.Name,
            albumData.Slug,
            NormalizeGalleryMediaUrl(albumData.Cover),
            albumData.Description,
            albumData.CreatedAt,
            albumData.UpdatedAt,
            albumData.Images
                .Select(i => i with { Url = NormalizeGalleryMediaUrl(i.Url) ?? i.Url })
                .ToList(),
            albumData.Authors,
            contentId,
            likeCount,
            isLiked,
            commentCount,
            albumData.IsActive,
            albumData.SortOrder
        );
    }

    private string? NormalizeGalleryMediaUrl(string? mediaUrl)
    {
        if (string.IsNullOrWhiteSpace(mediaUrl))
        {
            return mediaUrl;
        }

        var trimmed = mediaUrl.Trim();
        if (!MediaUrlHelper.TryExtractMediaBlobName(trimmed, out var blobName))
        {
            return trimmed;
        }

        var publicBlobName = StripGalleryPrefix(blobName);

        if (Uri.TryCreate(trimmed, UriKind.Absolute, out var absolute))
        {
            return $"{absolute.Scheme}://{absolute.Authority}/media/{publicBlobName}";
        }

        return $"/media/{publicBlobName}";
    }
}
