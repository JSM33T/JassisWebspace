using System.Text.RegularExpressions;
using JassSpace.Contracts.Interfaces;
using JassSpace.Contracts.Requests;
using JassSpace.Contracts.Responses;
using JassSpace.Data;
using JassSpace.Entities;
using JassSpace.Entities.Enums;
using JassSpace.Infra;
using Microsoft.EntityFrameworkCore;

namespace JassSpace.Services;

public sealed class AdminGalleryService(
    JassSpaceDbContext dbContext,
    IAzureBlobStorageService blobStorageService,
    IImageProcessingService imageProcessingService) : IAdminGalleryService
{
    private const string GalleryBlobPrefix = "gallery/";
    private static readonly TimeSpan RegexTimeout = TimeSpan.FromSeconds(1);

    private readonly JassSpaceDbContext _dbContext = dbContext;
    private readonly IAzureBlobStorageService _blobStorageService = blobStorageService;
    private readonly IImageProcessingService _imageProcessingService = imageProcessingService;

    public Task<List<GalleryAuthorResponse>> GetAuthorsAsync(
        string? search = null,
        int take = 100,
        CancellationToken cancellationToken = default)
    {
        take = Math.Clamp(take, 1, 200);

        var query = _dbContext.Users
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

        return query
            .OrderBy(u => u.FirstName)
            .ThenBy(u => u.LastName)
            .Take(take)
            .Select(u => new GalleryAuthorResponse(
                u.Id,
                u.Username,
                u.DisplayName ?? $"{u.FirstName} {u.LastName}".Trim(),
                0))
            .ToListAsync(cancellationToken);
    }

    public async Task<List<AlbumResponse>> GetAlbumsAsync(
        bool? isActive = null,
        CancellationToken cancellationToken = default)
    {
        var query = _dbContext.Albums
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

    public async Task<AdminGalleryAlbumWithImagesMutationResult> GetAlbumAsync(
        Guid albumId,
        Guid? currentUserId,
        CancellationToken cancellationToken = default)
    {
        var album = await GetAlbumWithDetailsAsync(albumId, currentUserId, cancellationToken);
        return album is null
            ? new AdminGalleryAlbumWithImagesMutationResult(
                AdminGalleryOperationStatus.AlbumNotFound,
                ErrorMessage: $"No album found with ID '{albumId}'.")
            : new AdminGalleryAlbumWithImagesMutationResult(AdminGalleryOperationStatus.Success, album);
    }

    public async Task<MediaUploadResponse> UploadGalleryImageAsync(
        AdminMediaUploadInput file,
        string mediaBaseUrl,
        CancellationToken cancellationToken = default)
    {
        var baseName = !string.IsNullOrWhiteSpace(file.RequestedFileName)
            ? file.RequestedFileName
            : Guid.NewGuid().ToString();

        var uploadResult = await UploadFileAsync(
            file.Content,
            file.FileName,
            baseName,
            cancellationToken);

        return new MediaUploadResponse(
            uploadResult.BlobName,
            GetFullMediaUrl(mediaBaseUrl, uploadResult.BlobName));
    }

    public async Task<AdminGalleryAlbumWithImagesMutationResult> CreateAlbumWithImagesAsync(
        AdminGalleryCreateAlbumWithImagesRequest request,
        AdminMediaUploadInput? coverImage,
        IReadOnlyCollection<AdminGalleryImageUploadInput> imageFiles,
        string mediaBaseUrl,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
        {
            return new AdminGalleryAlbumWithImagesMutationResult(
                AdminGalleryOperationStatus.InvalidName,
                ErrorMessage: "Album name cannot be empty.");
        }

        var targetSlug = !string.IsNullOrWhiteSpace(request.Slug)
            ? GenerateSlug(request.Slug)
            : GenerateSlug(request.Name);

        var slugExists = await _dbContext.Albums
            .AnyAsync(a => a.Slug == targetSlug, cancellationToken);

        if (slugExists)
        {
            targetSlug = $"{targetSlug}-{Guid.NewGuid().ToString()[..8]}";
        }

        var albumId = Guid.NewGuid();
        var now = DateTimeOffset.UtcNow;

        string? coverUrl = null;
        if (coverImage is not null)
        {
            var coverUpload = await UploadFileAsync(
                coverImage.Content,
                coverImage.FileName,
                $"gallery/covers/{albumId}",
                cancellationToken);

            coverUrl = GetFullMediaUrl(mediaBaseUrl, coverUpload.BlobName);
        }

        var album = new Album
        {
            Id = albumId,
            Name = request.Name,
            Slug = targetSlug,
            Cover = coverUrl,
            Description = request.Description,
            IsActive = request.IsActive ?? true,
            SortOrder = request.SortOrder ?? await GetNextAlbumSortOrderAsync(cancellationToken),
            CreatedAt = now,
            UpdatedAt = now
        };

        _dbContext.Albums.Add(album);

        var authorResponses = await AddAlbumAuthorsAsync(album.Id, request.AuthorIds, cancellationToken);

        var contentSlug = targetSlug;
        var existingContentSlug = await _dbContext.Contents
            .AnyAsync(c => c.Slug == contentSlug, cancellationToken);

        if (existingContentSlug)
        {
            contentSlug = $"{targetSlug}-{album.Id.ToString()[..8]}";
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

        var images = new List<Image>();
        var index = 0;
        foreach (var imageFile in imageFiles)
        {
            index++;
            var image = await CreateAlbumImageAsync(
                album.Id,
                imageFile,
                imageFile.Order ?? index,
                mediaBaseUrl,
                cancellationToken);

            images.Add(image);
        }

        await _dbContext.SaveChangesAsync(cancellationToken);

        var response = new AlbumWithImagesResponse(
            album.Id,
            album.Name,
            album.Slug,
            album.Cover,
            album.Description,
            album.CreatedAt,
            album.UpdatedAt,
            images.Select(MapImage).ToList(),
            authorResponses,
            content.Id,
            0,
            false,
            0,
            album.IsActive,
            album.SortOrder);

        return new AdminGalleryAlbumWithImagesMutationResult(
            AdminGalleryOperationStatus.Success,
            response);
    }

    public async Task<AdminGalleryImageMutationResult> AddImageToAlbumAsync(
        Guid albumId,
        AdminGalleryImageUploadInput imageFile,
        string mediaBaseUrl,
        CancellationToken cancellationToken = default)
    {
        var albumExists = await _dbContext.Albums
            .AnyAsync(a => a.Id == albumId, cancellationToken);

        if (!albumExists)
        {
            return new AdminGalleryImageMutationResult(
                AdminGalleryOperationStatus.AlbumNotFound,
                ErrorMessage: $"No album found with ID '{albumId}'.");
        }

        var resolvedOrder = imageFile.Order ?? await GetNextImageOrderAsync(albumId, cancellationToken);
        var image = await CreateAlbumImageAsync(
            albumId,
            imageFile,
            resolvedOrder,
            mediaBaseUrl,
            cancellationToken);

        await _dbContext.SaveChangesAsync(cancellationToken);

        return new AdminGalleryImageMutationResult(
            AdminGalleryOperationStatus.Success,
            MapImage(image));
    }

    public async Task<AdminGalleryImagesMutationResult> AddImagesToAlbumAsync(
        Guid albumId,
        IReadOnlyCollection<AdminGalleryImageUploadInput> imageFiles,
        string mediaBaseUrl,
        CancellationToken cancellationToken = default)
    {
        var albumExists = await _dbContext.Albums
            .AnyAsync(a => a.Id == albumId, cancellationToken);

        if (!albumExists)
        {
            return new AdminGalleryImagesMutationResult(
                AdminGalleryOperationStatus.AlbumNotFound,
                [],
                $"No album found with ID '{albumId}'.");
        }

        var images = new List<Image>();
        var index = 0;
        foreach (var imageFile in imageFiles)
        {
            index++;
            var image = await CreateAlbumImageAsync(
                albumId,
                imageFile,
                imageFile.Order ?? index,
                mediaBaseUrl,
                cancellationToken);

            images.Add(image);
        }

        await _dbContext.SaveChangesAsync(cancellationToken);

        return new AdminGalleryImagesMutationResult(
            AdminGalleryOperationStatus.Success,
            images.Select(MapImage).ToList());
    }

    public async Task<AdminGalleryAlbumMutationResult> UpdateAlbumAsync(
        Guid albumId,
        AdminGalleryUpdateAlbumRequest request,
        AdminMediaUploadInput? coverImage,
        string mediaBaseUrl,
        CancellationToken cancellationToken = default)
    {
        var album = await _dbContext.Albums
            .Include(a => a.Authors)
            .FirstOrDefaultAsync(a => a.Id == albumId, cancellationToken);

        if (album is null)
        {
            return new AdminGalleryAlbumMutationResult(
                AdminGalleryOperationStatus.AlbumNotFound,
                ErrorMessage: $"No album found with ID '{albumId}'.");
        }

        var originalName = album.Name;

        if (!string.IsNullOrWhiteSpace(request.Name) && request.Name != album.Name)
        {
            album.Name = request.Name;
        }

        var targetSlug = !string.IsNullOrWhiteSpace(request.Slug)
            ? GenerateSlug(request.Slug)
            : (!string.IsNullOrWhiteSpace(request.Name) && request.Name != originalName
                ? GenerateSlug(request.Name)
                : album.Slug);

        if (targetSlug != album.Slug)
        {
            var slugExists = await _dbContext.Albums
                .AnyAsync(a => a.Slug == targetSlug && a.Id != albumId, cancellationToken);

            album.Slug = slugExists
                ? $"{targetSlug}-{Guid.NewGuid().ToString()[..8]}"
                : targetSlug;
        }

        if (request.Description is not null)
        {
            album.Description = request.Description;
        }

        if (request.CreatedAt.HasValue)
        {
            album.CreatedAt = request.CreatedAt.Value.ToUniversalTime();
        }

        if (coverImage is not null)
        {
            var coverUpload = await UploadFileAsync(
                coverImage.Content,
                coverImage.FileName,
                $"gallery/covers/{albumId}",
                cancellationToken);

            album.Cover = GetFullMediaUrl(mediaBaseUrl, coverUpload.BlobName);
        }

        if (request.IsActive.HasValue)
        {
            album.IsActive = request.IsActive.Value;
        }

        if (request.SortOrder.HasValue)
        {
            album.SortOrder = request.SortOrder.Value;
        }

        album.UpdatedAt = DateTimeOffset.UtcNow;

        await UpdateAlbumAuthorsAsync(album, request.AuthorIds, albumId, cancellationToken);
        await _dbContext.SaveChangesAsync(cancellationToken);

        var response = await BuildAlbumResponseAsync(album, albumId, cancellationToken);
        return new AdminGalleryAlbumMutationResult(
            AdminGalleryOperationStatus.Success,
            response with { Cover = NormalizeGalleryMediaUrl(response.Cover) });
    }

    public async Task<AdminGalleryDeleteResult> DeleteAlbumAsync(
        Guid albumId,
        CancellationToken cancellationToken = default)
    {
        var album = await _dbContext.Albums
            .Include(a => a.Images)
            .FirstOrDefaultAsync(a => a.Id == albumId, cancellationToken);

        if (album is null)
        {
            return new AdminGalleryDeleteResult(
                AdminGalleryOperationStatus.AlbumNotFound,
                $"No album found with ID '{albumId}'.");
        }

        var coverBlobName = ExtractBlobNameFromUrl(album.Cover);
        if (!string.IsNullOrEmpty(coverBlobName))
        {
            await _blobStorageService.DeleteBlobAsync(coverBlobName, cancellationToken);
        }

        foreach (var image in album.Images)
        {
            var imageBlobName = ExtractBlobNameFromUrl(image.Url);
            if (!string.IsNullOrEmpty(imageBlobName))
            {
                await _blobStorageService.DeleteBlobAsync(imageBlobName, cancellationToken);
            }
        }

        _dbContext.Images.RemoveRange(album.Images);

        var content = await _dbContext.Contents
            .FirstOrDefaultAsync(c => c.ContentRefId == albumId && c.ContentType == ContentType.Album, cancellationToken);

        if (content is not null)
        {
            _dbContext.Contents.Remove(content);
        }

        _dbContext.Albums.Remove(album);
        await _dbContext.SaveChangesAsync(cancellationToken);

        return new AdminGalleryDeleteResult(AdminGalleryOperationStatus.Success);
    }

    public async Task<AdminGalleryImageMutationResult> UpdateImageAsync(
        Guid imageId,
        string? title,
        string? description,
        int? order,
        CancellationToken cancellationToken = default)
    {
        var image = await _dbContext.Images
            .FirstOrDefaultAsync(i => i.Id == imageId, cancellationToken);

        if (image is null)
        {
            return new AdminGalleryImageMutationResult(
                AdminGalleryOperationStatus.ImageNotFound,
                ErrorMessage: $"No image found with ID '{imageId}'.");
        }

        if (title is not null)
        {
            image.Title = title;
        }

        if (description is not null)
        {
            image.Description = description;
        }

        if (order.HasValue)
        {
            image.Order = order.Value;
        }

        await _dbContext.SaveChangesAsync(cancellationToken);

        return new AdminGalleryImageMutationResult(
            AdminGalleryOperationStatus.Success,
            MapImage(image));
    }

    public async Task<AdminGalleryDeleteResult> DeleteImageAsync(
        Guid imageId,
        CancellationToken cancellationToken = default)
    {
        var image = await _dbContext.Images
            .FirstOrDefaultAsync(i => i.Id == imageId, cancellationToken);

        if (image is null)
        {
            return new AdminGalleryDeleteResult(
                AdminGalleryOperationStatus.ImageNotFound,
                $"No image found with ID '{imageId}'.");
        }

        var blobName = ExtractBlobNameFromUrl(image.Url);
        if (!string.IsNullOrEmpty(blobName))
        {
            await _blobStorageService.DeleteBlobAsync(blobName, cancellationToken);
        }

        _dbContext.Images.Remove(image);
        await _dbContext.SaveChangesAsync(cancellationToken);

        return new AdminGalleryDeleteResult(AdminGalleryOperationStatus.Success);
    }

    private async Task<List<GalleryAuthorResponse>> AddAlbumAuthorsAsync(
        Guid albumId,
        List<Guid>? authorIds,
        CancellationToken cancellationToken)
    {
        var authorResponses = new List<GalleryAuthorResponse>();
        if (authorIds is not { Count: > 0 })
        {
            return authorResponses;
        }

        var validAuthors = await _dbContext.Users
            .Where(u => authorIds.Contains(u.Id))
            .Select(u => new
            {
                u.Id,
                u.Username,
                u.DisplayName
            })
            .ToListAsync(cancellationToken);

        for (var i = 0; i < authorIds.Count; i++)
        {
            var authorId = authorIds[i];
            var matched = validAuthors.FirstOrDefault(u => u.Id == authorId);
            if (matched is null)
            {
                continue;
            }

            _dbContext.GalleryAuthors.Add(new GalleryAuthor
            {
                Id = Guid.NewGuid(),
                AlbumId = albumId,
                UserId = authorId,
                Order = i,
                CreatedAt = DateTimeOffset.UtcNow
            });

            authorResponses.Add(new GalleryAuthorResponse(
                matched.Id,
                matched.Username,
                matched.DisplayName,
                i));
        }

        return authorResponses;
    }

    private async Task UpdateAlbumAuthorsAsync(
        Album album,
        List<Guid>? authorIds,
        Guid albumId,
        CancellationToken cancellationToken)
    {
        var requestAuthorIds = authorIds ?? [];
        var authorsToRemove = album.Authors.Where(a => !requestAuthorIds.Contains(a.UserId)).ToList();
        _dbContext.GalleryAuthors.RemoveRange(authorsToRemove);

        var existingAuthorUserIds = album.Authors.Select(a => a.UserId).ToList();
        var newAuthorUserIds = requestAuthorIds.Where(uid => !existingAuthorUserIds.Contains(uid)).ToList();
        if (newAuthorUserIds.Count == 0)
        {
            return;
        }

        var existingUsers = await _dbContext.Users
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

            _dbContext.GalleryAuthors.Add(new GalleryAuthor
            {
                Id = Guid.NewGuid(),
                AlbumId = albumId,
                UserId = userId,
                Order = orderByUserId[userId],
                CreatedAt = DateTimeOffset.UtcNow
            });
        }
    }

    private async Task<Image> CreateAlbumImageAsync(
        Guid albumId,
        AdminGalleryImageUploadInput imageFile,
        int order,
        string mediaBaseUrl,
        CancellationToken cancellationToken)
    {
        var imageUpload = await UploadFileAsync(
            imageFile.Content,
            imageFile.FileName,
            $"gallery/images/{albumId}-{Guid.NewGuid()}",
            cancellationToken);

        var image = new Image
        {
            Id = Guid.NewGuid(),
            AlbumId = albumId,
            Url = GetFullMediaUrl(mediaBaseUrl, imageUpload.BlobName),
            Title = imageFile.Title,
            Description = imageFile.Description,
            Order = order,
            CreatedAt = DateTimeOffset.UtcNow
        };

        _dbContext.Images.Add(image);
        return image;
    }

    private async Task<BlobUploadResult> UploadFileAsync(
        Stream fileStream,
        string fileName,
        string? blobName,
        CancellationToken cancellationToken)
    {
        await using var processedStream = await _imageProcessingService.ProcessImageAsync(fileStream, cancellationToken);

        return await _blobStorageService.UploadImageAsync(
            processedStream,
            fileName,
            "image/webp",
            string.IsNullOrWhiteSpace(blobName) ? null : EnsureGalleryBlobName(blobName),
            cancellationToken);
    }

    private async Task<int> GetNextImageOrderAsync(Guid albumId, CancellationToken cancellationToken)
    {
        var maxOrder = await _dbContext.Images
            .Where(i => i.AlbumId == albumId)
            .Select(i => (int?)i.Order)
            .MaxAsync(cancellationToken);

        return (maxOrder ?? 0) + 1;
    }

    private async Task<int> GetNextAlbumSortOrderAsync(CancellationToken cancellationToken)
    {
        var maxSortOrder = await _dbContext.Albums
            .Select(a => (int?)a.SortOrder)
            .MaxAsync(cancellationToken);

        return (maxSortOrder ?? -1) + 1;
    }

    private async Task<AlbumResponse> BuildAlbumResponseAsync(
        Album album,
        Guid albumId,
        CancellationToken cancellationToken)
    {
        var imageCount = await _dbContext.Images
            .CountAsync(i => i.AlbumId == albumId, cancellationToken);

        var authors = await _dbContext.GalleryAuthors
            .Where(ga => ga.AlbumId == albumId)
            .OrderBy(ga => ga.Order)
            .Select(ga => new GalleryAuthorResponse(
                ga.UserId,
                ga.User.Username,
                ga.User.DisplayName,
                ga.Order))
            .ToListAsync(cancellationToken);

        var contentId = await _dbContext.Contents
            .Where(c => c.ContentType == ContentType.Album && c.ContentRefId == albumId)
            .Select(c => (Guid?)c.Id)
            .FirstOrDefaultAsync(cancellationToken);

        return new AlbumResponse(
            album.Id,
            album.Name,
            album.Slug,
            album.Cover,
            album.Description,
            album.CreatedAt,
            album.UpdatedAt,
            imageCount,
            authors,
            contentId,
            album.IsActive,
            album.SortOrder);
    }

    private async Task<AlbumWithImagesResponse?> GetAlbumWithDetailsAsync(
        Guid albumId,
        Guid? currentUserId,
        CancellationToken cancellationToken)
    {
        var albumData = await _dbContext.Albums
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
            return null;
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
                .CountAsync(cm => cm.ContentId == contentId.Value && !cm.IsDeleted, cancellationToken);

            if (currentUserId.HasValue)
            {
                isLiked = await _dbContext.Likes
                    .AnyAsync(l => l.ContentId == contentId.Value && l.UserId == currentUserId.Value, cancellationToken);
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
            albumData.SortOrder);
    }

    private static ImageResponse MapImage(Image image)
    {
        return new ImageResponse(
            image.Id,
            image.AlbumId,
            image.Url,
            image.Title,
            image.Description,
            image.Order,
            image.CreatedAt);
    }

    private static string GetFullMediaUrl(string mediaBaseUrl, string blobName)
    {
        var publicBlobName = StripGalleryPrefix(blobName);
        return $"{mediaBaseUrl.TrimEnd('/')}/media/{publicBlobName}";
    }

    private static string? ExtractBlobNameFromUrl(string? url)
    {
        if (string.IsNullOrEmpty(url))
        {
            return null;
        }

        return TryExtractMediaBlobName(url, out var blobName)
            ? EnsureGalleryBlobName(blobName)
            : null;
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
        var normalized = blobName.Trim().TrimStart('/').Replace('\\', '/');
        return normalized.StartsWith(GalleryBlobPrefix, StringComparison.OrdinalIgnoreCase)
            ? normalized[GalleryBlobPrefix.Length..]
            : normalized;
    }

    private static string GenerateSlug(string title)
    {
        var slug = title.ToLowerInvariant();
        slug = Regex.Replace(slug, @"[^a-z0-9\s-]", "", RegexOptions.None, RegexTimeout);
        slug = Regex.Replace(slug, @"\s+", "-", RegexOptions.None, RegexTimeout);
        slug = Regex.Replace(slug, @"-+", "-", RegexOptions.None, RegexTimeout);
        return slug.Trim('-');
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
            return $"{absolute.Scheme}://{absolute.Authority}/media/{publicBlobName}";
        }

        return $"/media/{publicBlobName}";
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
            var index = absolute.AbsolutePath.IndexOf(marker, StringComparison.OrdinalIgnoreCase);
            if (index == -1)
            {
                return false;
            }

            var candidate = absolute.AbsolutePath[(index + marker.Length)..];
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
