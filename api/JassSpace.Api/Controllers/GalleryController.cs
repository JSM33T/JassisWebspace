using JassSpace.Api.Extensions;
using JassSpace.Contracts;
using JassSpace.Contracts.Requests;
using JassSpace.Contracts.Responses;
using JassSpace.Data;
using JassSpace.Entities;
using JassSpace.Entities.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Text.RegularExpressions;

namespace JassSpace.Api.Controllers;

[Route("gallery")]
public sealed class GalleryController(
    JassSpaceDbContext dbContext,
    ILogger<GalleryController> logger)
    : BaseApiController
{
    private const string GalleryBlobPrefix = "gallery/";
    private const string MediaPathPrefix = "/media/";

    /// <summary>
    /// Gets all albums with their image counts.
    /// </summary>
    [HttpGet("albums")]
    [ProducesResponseType(typeof(ApiResponse<List<AlbumResponse>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAllAlbums(CancellationToken cancellationToken = default)
    {
        try
        {
            var albums = await dbContext.Albums
                .Where(a => a.IsActive)
                .OrderByDescending(a => a.CreatedAt)
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
                        .FirstOrDefault()
                ))
                .ToListAsync(cancellationToken);

            var normalizedAlbums = albums
                .Select(a => a with { Cover = NormalizeGalleryMediaUrl(a.Cover) })
                .ToList();

            return OkEnvelope(normalizedAlbums);
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
            var albumData = await dbContext.Albums
                .Where(a => a.Id == albumId && a.IsActive)
                .Select(a => new
                {
                    a.Id,
                    a.Name,
                    a.Slug,
                    a.Cover,
                    a.Description,
                    a.CreatedAt,
                    a.UpdatedAt,
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
                return NotFoundProblem("Album not found", $"No album found with ID '{albumId}'.");
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

            var response = new AlbumWithImagesResponse(
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
                commentCount);

            return OkEnvelope(response);
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
            // First check if album exists
            var albumExists = await dbContext.Albums
                .AnyAsync(a => a.Id == albumId, cancellationToken);

            if (!albumExists)
            {
                return NotFoundProblem("Album not found", $"No album found with ID '{albumId}'.");
            }

            var images = await dbContext.Images
                .Where(i => i.AlbumId == albumId)
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
                .ToListAsync(cancellationToken);

            var normalizedImages = images
                .Select(i => i with { Url = NormalizeGalleryMediaUrl(i.Url) ?? i.Url })
                .ToList();

            return OkEnvelope(normalizedImages);
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
        if (string.IsNullOrWhiteSpace(request.Name))
        {
            return BadRequestProblem("Invalid album name", "Album name cannot be empty.");
        }

        try
        {
            // Create the album
            var slug = GenerateSlug(request.Name);
            
            var album = new Album
            {
                Id = Guid.NewGuid(),
                Name = request.Name,
                Slug = slug,
                Description = request.Description,
                CreatedAt = DateTimeOffset.UtcNow,
                UpdatedAt = DateTimeOffset.UtcNow
            };

            dbContext.Albums.Add(album);

            if (request.AuthorIds != null && request.AuthorIds.Count > 0)
            {
                var validAuthorIds = await dbContext.Users
                    .Where(u => request.AuthorIds.Contains(u.Id))
                    .Select(u => u.Id)
                    .ToListAsync(cancellationToken);

                for (int i = 0; i < request.AuthorIds.Count; i++)
                {
                    var authorId = request.AuthorIds[i];
                    if (!validAuthorIds.Contains(authorId))
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
                }
            }

            // Automatically create a Content entry for the album
            // Ensure slug is unique in Content table
            var contentSlug = slug;
            var existingSlug = await dbContext.Contents
                .AnyAsync(c => c.Slug == contentSlug, cancellationToken);
            
            if (existingSlug)
            {
                contentSlug = $"{slug}-{album.Id.ToString().Substring(0, 8)}";
            }

            var content = new Content
            {
                Id = Guid.NewGuid(),
                ContentType = ContentType.Album,
                ContentRefId = album.Id,
                Title = request.Name,
                Slug = contentSlug,
                IsPublished = true,
                PublishedAt = DateTimeOffset.UtcNow,
                CreatedAt = DateTimeOffset.UtcNow,
                UpdatedAt = DateTimeOffset.UtcNow
            };

            dbContext.Contents.Add(content);

            await dbContext.SaveChangesAsync(cancellationToken);

            var authors = await dbContext.GalleryAuthors
                .Where(ga => ga.AlbumId == album.Id)
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
                0, // No images yet
                authors,
                content.Id
            );

            return OkEnvelope(response);
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
        if (string.IsNullOrWhiteSpace(request.Url))
        {
            return BadRequestProblem("Invalid image URL", "Image URL cannot be empty.");
        }

        try
        {
            // Check if album exists
            var albumExists = await dbContext.Albums
                .AnyAsync(a => a.Id == albumId, cancellationToken);

            if (!albumExists)
            {
                return NotFoundProblem("Album not found", $"No album found with ID '{albumId}'.");
            }

            var image = new Image
            {
                Id = Guid.NewGuid(),
                AlbumId = albumId,
                Url = NormalizeGalleryMediaUrl(request.Url) ?? request.Url,
                Title = request.Title,
                Description = request.Description,
                Order = request.Order,
                CreatedAt = DateTimeOffset.UtcNow
            };

            dbContext.Images.Add(image);
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
            logger.LogError(ex, "Failed to add image to album {AlbumId}", albumId);
            return Problem(
                StatusCodes.Status500InternalServerError,
                "Failed to add image",
                "An unexpected error occurred while adding the image.");
        }
    }

    /// <summary>
    /// Generates a URL-friendly slug from a title.
    /// </summary>
    private static string GenerateSlug(string title)
    {
        // Convert to lowercase
        var slug = title.ToLowerInvariant();

        // Remove special characters and replace spaces with hyphens
        slug = Regex.Replace(slug, @"[^a-z0-9\s-]", "");
        slug = Regex.Replace(slug, @"\s+", "-");
        slug = Regex.Replace(slug, @"-+", "-");

        // Trim hyphens from start and end
        slug = slug.Trim('-');

        return slug;
    }

    private static string? NormalizeGalleryMediaUrl(string? mediaUrl)
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
            return $"{absolute.Scheme}://{absolute.Authority}{MediaPathPrefix}{publicBlobName}";
        }

        return $"{MediaPathPrefix}{publicBlobName}";
    }

    private static string StripGalleryPrefix(string blobName)
    {
        return blobName.StartsWith(GalleryBlobPrefix, StringComparison.OrdinalIgnoreCase)
            ? blobName[GalleryBlobPrefix.Length..]
            : blobName;
    }
}
