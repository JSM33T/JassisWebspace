using System.Text.RegularExpressions;
using JassSpace.Contracts.Interfaces;
using JassSpace.Contracts.Requests;
using JassSpace.Contracts.Responses;
using JassSpace.Data;
using JassSpace.Entities;
using JassSpace.Entities.Enums;
using Microsoft.EntityFrameworkCore;

namespace JassSpace.Services;

public sealed class GalleryService(JassSpaceDbContext dbContext) : IGalleryService
{
    private const string GalleryBlobPrefix = "gallery/";
    private const string MediaPathPrefix = "/media/";

    private readonly JassSpaceDbContext _dbContext = dbContext;

    public async Task<List<AlbumResponse>> GetAllAlbumsAsync(CancellationToken cancellationToken = default)
    {
        var albums = await _dbContext.Albums
            .Where(a => a.IsActive)
            .OrderBy(a => a.SortOrder)
            .ThenByDescending(a => a.CreatedAt)
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
                        ga.Order))
                    .ToList(),
                _dbContext.Contents
                    .Where(c => c.ContentType == ContentType.Album && c.ContentRefId == a.Id)
                    .Select(c => (Guid?)c.Id)
                    .FirstOrDefault(),
                a.IsActive,
                a.SortOrder))
            .ToListAsync(cancellationToken);

        return albums
            .Select(a => a with { Cover = NormalizeGalleryMediaUrl(a.Cover) })
            .ToList();
    }

    public async Task<GalleryAlbumQueryResult> GetAlbumByIdAsync(
        Guid albumId,
        Guid? currentUserId = null,
        CancellationToken cancellationToken = default)
    {
        var albumData = await _dbContext.Albums
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
                a.IsActive,
                a.SortOrder,
                Authors = a.Authors
                    .OrderBy(ga => ga.Order)
                    .Select(ga => new GalleryAuthorResponse(
                        ga.UserId,
                        ga.User.Username,
                        ga.User.DisplayName,
                        ga.Order))
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
                        i.CreatedAt))
                    .ToList()
            })
            .FirstOrDefaultAsync(cancellationToken);

        if (albumData is null)
        {
            return new GalleryAlbumQueryResult(
                GalleryQueryStatus.AlbumNotFound,
                ErrorMessage: $"No album found with ID '{albumId}'.");
        }

        var contentId = await _dbContext.Contents
            .Where(c => c.ContentType == ContentType.Album && c.ContentRefId == albumId)
            .Select(c => (Guid?)c.Id)
            .FirstOrDefaultAsync(cancellationToken);

        var likeCount = 0;
        var commentCount = 0;
        var isLiked = false;

        if (contentId.HasValue)
        {
            likeCount = await _dbContext.Likes
                .CountAsync(l => l.ContentId == contentId.Value, cancellationToken);

            commentCount = await _dbContext.Comments
                .CountAsync(c => c.ContentId == contentId.Value && !c.IsDeleted, cancellationToken);

            if (currentUserId.HasValue)
            {
                isLiked = await _dbContext.Likes
                    .AnyAsync(l => l.ContentId == contentId.Value && l.UserId == currentUserId.Value, cancellationToken);
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
            commentCount,
            albumData.IsActive,
            albumData.SortOrder);

        return new GalleryAlbumQueryResult(GalleryQueryStatus.Success, response);
    }

    public async Task<GalleryImagesQueryResult> GetImagesByAlbumAsync(
        Guid albumId,
        CancellationToken cancellationToken = default)
    {
        var albumExists = await _dbContext.Albums
            .AnyAsync(a => a.Id == albumId, cancellationToken);

        if (!albumExists)
        {
            return new GalleryImagesQueryResult(
                GalleryQueryStatus.AlbumNotFound,
                [],
                $"No album found with ID '{albumId}'.");
        }

        var images = await _dbContext.Images
            .Where(i => i.AlbumId == albumId)
            .OrderBy(i => i.Order)
            .Select(i => new ImageResponse(
                i.Id,
                i.AlbumId,
                i.Url,
                i.Title,
                i.Description,
                i.Order,
                i.CreatedAt))
            .ToListAsync(cancellationToken);

        var normalizedImages = images
            .Select(i => i with { Url = NormalizeGalleryMediaUrl(i.Url) ?? i.Url })
            .ToList();

        return new GalleryImagesQueryResult(GalleryQueryStatus.Success, normalizedImages);
    }

    public async Task<GalleryCreateAlbumResult> CreateAlbumAsync(
        CreateAlbumRequest request,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
        {
            return new GalleryCreateAlbumResult(
                GalleryCreateAlbumStatus.InvalidName,
                ErrorMessage: "Album name cannot be empty.");
        }

        var slug = GenerateSlug(request.Name);
        var now = DateTimeOffset.UtcNow;

        var album = new Album
        {
            Id = Guid.NewGuid(),
            Name = request.Name,
            Slug = slug,
            Description = request.Description,
            IsActive = request.IsActive ?? true,
            SortOrder = request.SortOrder ?? await GetNextAlbumSortOrder(cancellationToken),
            CreatedAt = now,
            UpdatedAt = now
        };

        _dbContext.Albums.Add(album);

        if (request.AuthorIds is { Count: > 0 })
        {
            var validAuthorIds = await _dbContext.Users
                .Where(u => request.AuthorIds.Contains(u.Id))
                .Select(u => u.Id)
                .ToListAsync(cancellationToken);

            for (var i = 0; i < request.AuthorIds.Count; i++)
            {
                var authorId = request.AuthorIds[i];
                if (!validAuthorIds.Contains(authorId))
                {
                    continue;
                }

                _dbContext.GalleryAuthors.Add(new GalleryAuthor
                {
                    Id = Guid.NewGuid(),
                    AlbumId = album.Id,
                    UserId = authorId,
                    Order = i,
                    CreatedAt = now
                });
            }
        }

        var contentSlug = slug;
        var existingSlug = await _dbContext.Contents
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
            PublishedAt = now,
            CreatedAt = now,
            UpdatedAt = now
        };

        _dbContext.Contents.Add(content);
        await _dbContext.SaveChangesAsync(cancellationToken);

        var authors = await _dbContext.GalleryAuthors
            .Where(ga => ga.AlbumId == album.Id)
            .OrderBy(ga => ga.Order)
            .Select(ga => new GalleryAuthorResponse(
                ga.UserId,
                ga.User.Username,
                ga.User.DisplayName,
                ga.Order))
            .ToListAsync(cancellationToken);

        var response = new AlbumResponse(
            album.Id,
            album.Name,
            album.Slug,
            album.Cover,
            album.Description,
            album.CreatedAt,
            album.UpdatedAt,
            0,
            authors,
            content.Id,
            album.IsActive,
            album.SortOrder);

        return new GalleryCreateAlbumResult(GalleryCreateAlbumStatus.Success, response);
    }

    public async Task<GalleryAddImageResult> AddImageToAlbumAsync(
        Guid albumId,
        AddImageToAlbumRequest request,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.Url))
        {
            return new GalleryAddImageResult(
                GalleryAddImageStatus.InvalidImageUrl,
                ErrorMessage: "Image URL cannot be empty.");
        }

        var albumExists = await _dbContext.Albums
            .AnyAsync(a => a.Id == albumId, cancellationToken);

        if (!albumExists)
        {
            return new GalleryAddImageResult(
                GalleryAddImageStatus.AlbumNotFound,
                ErrorMessage: $"No album found with ID '{albumId}'.");
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

        _dbContext.Images.Add(image);
        await _dbContext.SaveChangesAsync(cancellationToken);

        var response = new ImageResponse(
            image.Id,
            image.AlbumId,
            image.Url,
            image.Title,
            image.Description,
            image.Order,
            image.CreatedAt);

        return new GalleryAddImageResult(GalleryAddImageStatus.Success, response);
    }

    private static string GenerateSlug(string title)
    {
        var slug = title.ToLowerInvariant();
        slug = Regex.Replace(slug, @"[^a-z0-9\s-]", "");
        slug = Regex.Replace(slug, @"\s+", "-");
        slug = Regex.Replace(slug, @"-+", "-");
        return slug.Trim('-');
    }

    private async Task<int> GetNextAlbumSortOrder(CancellationToken cancellationToken)
    {
        var maxSortOrder = await _dbContext.Albums
            .Select(a => (int?)a.SortOrder)
            .MaxAsync(cancellationToken);

        return (maxSortOrder ?? -1) + 1;
    }

    private static string? NormalizeGalleryMediaUrl(string? mediaUrl)
    {
        if (string.IsNullOrWhiteSpace(mediaUrl))
        {
            return mediaUrl;
        }

        var trimmed = mediaUrl.Trim();
        if (!TryExtractMediaBlobName(trimmed, out var blobName))
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

    private static bool TryExtractMediaBlobName(string urlOrPath, out string blobName)
    {
        blobName = string.Empty;
        if (string.IsNullOrWhiteSpace(urlOrPath))
        {
            return false;
        }

        const string marker = "/media/";
        if (Uri.TryCreate(urlOrPath, UriKind.Absolute, out var absolute))
        {
            var path = absolute.AbsolutePath;
            var index = path.IndexOf(marker, StringComparison.OrdinalIgnoreCase);
            if (index == -1)
            {
                return false;
            }

            var candidate = path[(index + marker.Length)..];
            if (string.IsNullOrWhiteSpace(candidate))
            {
                return false;
            }

            blobName = candidate;
            return true;
        }

        var relativeIndex = urlOrPath.IndexOf(marker, StringComparison.OrdinalIgnoreCase);
        if (relativeIndex == -1)
        {
            return false;
        }

        var relativeCandidate = urlOrPath[(relativeIndex + marker.Length)..];
        if (string.IsNullOrWhiteSpace(relativeCandidate))
        {
            return false;
        }

        blobName = relativeCandidate;
        return true;
    }
}
