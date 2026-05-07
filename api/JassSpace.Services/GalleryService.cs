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
        var albumRows = await _dbContext.Albums
            .Where(a => a.IsActive)
            .OrderBy(a => a.SortOrder)
            .ThenByDescending(a => a.CreatedAt)
            .Select(a => new
            {
                a.Id,
                a.Name,
                a.Slug,
                a.Cover,
                a.Description,
                a.CreatedAt,
                a.UpdatedAt,
                ImageCount = a.Images.Count,
                a.IsActive,
                a.SortOrder
            })
            .ToListAsync(cancellationToken);

        var albumIds = albumRows.Select(a => a.Id).ToList();
        var contentMap = albumIds.Count == 0
            ? new List<(Guid ContentId, Guid AlbumId)>()
            : (await _dbContext.Contents
                .AsNoTracking()
                .Where(c => c.ContentType == ContentType.Album && albumIds.Contains(c.ContentRefId))
                .Select(c => new { c.Id, c.ContentRefId })
                .ToListAsync(cancellationToken))
                .Select(c => (ContentId: c.Id, AlbumId: c.ContentRefId))
                .ToList();

        var contentByAlbumId = contentMap.ToDictionary(c => c.AlbumId, c => c.ContentId);
        var contentIds = contentMap.Select(c => c.ContentId).ToList();
        var authorsByAlbumId = new Dictionary<Guid, List<ContentAuthorResponse>>();

        if (contentIds.Count > 0)
        {
            var refIdByContentId = contentMap.ToDictionary(c => c.ContentId, c => c.AlbumId);
            var authorRows = await _dbContext.ContentAuthors
                .AsNoTracking()
                .Where(ca => contentIds.Contains(ca.ContentId))
                .OrderBy(ca => ca.Order)
                .Select(ca => new
                {
                    ca.ContentId,
                    Response = new ContentAuthorResponse(
                        ca.UserId,
                        ca.User.Username,
                        ca.User.DisplayName,
                        ca.Role,
                        ca.Order)
                })
                .ToListAsync(cancellationToken);

            foreach (var row in authorRows)
            {
                var albumId = refIdByContentId[row.ContentId];
                if (!authorsByAlbumId.TryGetValue(albumId, out var list))
                {
                    list = [];
                    authorsByAlbumId[albumId] = list;
                }
                list.Add(row.Response);
            }
        }

        return albumRows.Select(a => new AlbumResponse(
            a.Id,
            a.Name,
            a.Slug,
            NormalizeGalleryMediaUrl(a.Cover),
            a.Description,
            a.CreatedAt,
            a.UpdatedAt,
            a.ImageCount,
            authorsByAlbumId.TryGetValue(a.Id, out var authors) ? authors : [],
            contentByAlbumId.TryGetValue(a.Id, out var contentId) ? contentId : null,
            a.IsActive,
            a.SortOrder)).ToList();
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
        var authors = new List<ContentAuthorResponse>();

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

            authors = await _dbContext.ContentAuthors
                .AsNoTracking()
                .Where(ca => ca.ContentId == contentId.Value)
                .OrderBy(ca => ca.Order)
                .Select(ca => new ContentAuthorResponse(
                    ca.UserId,
                    ca.User.Username,
                    ca.User.DisplayName,
                    ca.Role,
                    ca.Order))
                .ToListAsync(cancellationToken);
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
            authors,
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

        var contentSlug = slug;
        var existingSlug = await _dbContext.Contents
            .AnyAsync(c => c.Slug == contentSlug, cancellationToken);

        if (existingSlug)
        {
            contentSlug = $"{slug}-{album.Id.ToString()[..8]}";
        }

        var contentId = Guid.NewGuid();
        _dbContext.Contents.Add(new Content
        {
            Id = contentId,
            ContentType = ContentType.Album,
            ContentRefId = album.Id,
            Title = request.Name,
            Slug = contentSlug,
            IsPublished = true,
            PublishedAt = now,
            CreatedAt = now,
            UpdatedAt = now
        });

        var authors = new List<ContentAuthorResponse>();
        if (request.AuthorIds is { Count: > 0 })
        {
            var validAuthorIds = await _dbContext.Users
                .Where(u => request.AuthorIds.Contains(u.Id))
                .Select(u => new { u.Id, u.Username, u.DisplayName })
                .ToListAsync(cancellationToken);

            for (var i = 0; i < request.AuthorIds.Count; i++)
            {
                var authorId = request.AuthorIds[i];
                var matched = validAuthorIds.FirstOrDefault(u => u.Id == authorId);
                if (matched is null) continue;

                _dbContext.ContentAuthors.Add(new ContentAuthor
                {
                    Id = Guid.NewGuid(),
                    ContentId = contentId,
                    UserId = authorId,
                    Order = i,
                    CreatedAt = now
                });

                authors.Add(new ContentAuthorResponse(matched.Id, matched.Username, matched.DisplayName, null, i));
            }
        }

        await _dbContext.SaveChangesAsync(cancellationToken);

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
            contentId,
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
