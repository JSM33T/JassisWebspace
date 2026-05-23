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

    public Task<List<ContentAuthorResponse>> GetAuthorsAsync(
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
            .Select(u => new ContentAuthorResponse(
                u.Id,
                u.Username,
                u.DisplayName ?? $"{u.FirstName} {u.LastName}".Trim(),
                null,
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

        var albumRows = await query
            .OrderBy(a => a.SortOrder)
            .ThenByDescending(a => a.UpdatedAt ?? a.CreatedAt)
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
        var authorsByAlbumId = await LoadAuthorsByAlbumIdsAsync(albumIds, cancellationToken);
        var contentByAlbumId = albumIds.Count == 0
            ? new Dictionary<Guid, Guid>()
            : await _dbContext.Contents
                .AsNoTracking()
                .Where(c => c.ContentType == ContentType.Album && albumIds.Contains(c.ContentRefId))
                .ToDictionaryAsync(c => c.ContentRefId, c => c.Id, cancellationToken);

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

        var contentSlug = targetSlug;
        var existingContentSlug = await _dbContext.Contents
            .AnyAsync(c => c.Slug == contentSlug, cancellationToken);

        if (existingContentSlug)
        {
            contentSlug = $"{targetSlug}-{album.Id.ToString()[..8]}";
        }

        var contentId = Guid.NewGuid();
        var content = new Content
        {
            Id = contentId,
            ContentType = ContentType.Album,
            ContentRefId = album.Id,
            Title = request.Name,
            Slug = contentSlug,
            IsPublished = true,
            PublishedAt = now,
            SearchBody = string.IsNullOrWhiteSpace(request.Description) ? null : request.Description.Trim(),
            CreatedAt = now,
            UpdatedAt = now
        };

        _dbContext.Contents.Add(content);

        var authorResponses = await AddAlbumAuthorsAsync(contentId, request.AuthorIds, cancellationToken);

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

        await UpsertAlbumContentAsync(album, albumId, cancellationToken);

        var albumContentId = await _dbContext.Contents
            .Where(c => c.ContentType == ContentType.Album && c.ContentRefId == albumId)
            .Select(c => c.Id)
            .FirstOrDefaultAsync(cancellationToken);

        await UpdateAlbumAuthorsAsync(albumContentId, request.AuthorIds, cancellationToken);
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

    public async Task<GalleryAuditResponse> AuditBlobConsistencyAsync(CancellationToken cancellationToken = default)
    {
        var azureBlobs = (await _blobStorageService.ListBlobsByPrefixAsync("gallery/", cancellationToken))
            .ToHashSet(StringComparer.OrdinalIgnoreCase);

        var albums = await _dbContext.Albums
            .AsNoTracking()
            .Select(a => new { a.Id, a.Name, a.Cover })
            .ToListAsync(cancellationToken);

        var images = await _dbContext.Images
            .AsNoTracking()
            .Select(i => new { i.Id, i.Title, i.Url })
            .ToListAsync(cancellationToken);

        var missing = new List<GalleryAuditMissingEntry>();
        var referencedBlobs = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        foreach (var album in albums)
        {
            if (string.IsNullOrEmpty(album.Cover)) continue;
            var blobName = ExtractBlobNameFromUrl(album.Cover);
            if (string.IsNullOrEmpty(blobName)) continue;
            referencedBlobs.Add(blobName);
            if (!azureBlobs.Contains(blobName))
                missing.Add(new GalleryAuditMissingEntry("cover", album.Id, album.Name, album.Cover, blobName));
        }

        foreach (var image in images)
        {
            var blobName = ExtractBlobNameFromUrl(image.Url);
            if (string.IsNullOrEmpty(blobName)) continue;
            referencedBlobs.Add(blobName);
            if (!azureBlobs.Contains(blobName))
                missing.Add(new GalleryAuditMissingEntry("image", image.Id, image.Title, image.Url, blobName));
        }

        var orphaned = azureBlobs
            .Where(b => !referencedBlobs.Contains(b))
            .OrderBy(b => b)
            .ToList();

        return new GalleryAuditResponse(albums.Count, images.Count, azureBlobs.Count, missing, orphaned);
    }

    public async Task<AdminGalleryDeleteResult> DeleteOrphanedBlobAsync(
        string blobName,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(blobName) ||
            !blobName.StartsWith(GalleryBlobPrefix, StringComparison.OrdinalIgnoreCase))
        {
            return new AdminGalleryDeleteResult(
                AdminGalleryOperationStatus.ImageNotFound,
                "Blob name must start with 'gallery/'.");
        }

        var publicPath = StripGalleryPrefix(blobName);
        var isReferenced =
            await _dbContext.Albums.AnyAsync(a => a.Cover != null && a.Cover.Contains(publicPath), cancellationToken) ||
            await _dbContext.Images.AnyAsync(i => i.Url.Contains(publicPath), cancellationToken);

        if (isReferenced)
        {
            return new AdminGalleryDeleteResult(
                AdminGalleryOperationStatus.ImageNotFound,
                "Blob is still referenced in the database and cannot be deleted as an orphan.");
        }

        await _blobStorageService.DeleteBlobAsync(blobName, cancellationToken);
        return new AdminGalleryDeleteResult(AdminGalleryOperationStatus.Success);
    }

    private async Task<List<ContentAuthorResponse>> AddAlbumAuthorsAsync(
        Guid contentId,
        List<Guid>? authorIds,
        CancellationToken cancellationToken)
    {
        if (authorIds is not { Count: > 0 })
        {
            return [];
        }

        var validAuthors = await _dbContext.Users
            .Where(u => authorIds.Contains(u.Id))
            .Select(u => new { u.Id, u.Username, u.DisplayName })
            .ToListAsync(cancellationToken);

        var now = DateTimeOffset.UtcNow;
        var responses = new List<ContentAuthorResponse>();

        for (var i = 0; i < authorIds.Count; i++)
        {
            var authorId = authorIds[i];
            var matched = validAuthors.FirstOrDefault(u => u.Id == authorId);
            if (matched is null)
            {
                continue;
            }

            _dbContext.ContentAuthors.Add(new ContentAuthor
            {
                Id = Guid.NewGuid(),
                ContentId = contentId,
                UserId = authorId,
                Order = i,
                CreatedAt = now
            });

            responses.Add(new ContentAuthorResponse(matched.Id, matched.Username, matched.DisplayName, null, i));
        }

        return responses;
    }

    private async Task UpdateAlbumAuthorsAsync(
        Guid contentId,
        List<Guid>? authorIds,
        CancellationToken cancellationToken)
    {
        var requestAuthorIds = authorIds ?? [];

        await _dbContext.ContentAuthors
            .Where(ca => ca.ContentId == contentId && !requestAuthorIds.Contains(ca.UserId))
            .ExecuteDeleteAsync(cancellationToken);

        var existingAuthorUserIds = await _dbContext.ContentAuthors
            .Where(ca => ca.ContentId == contentId)
            .Select(ca => ca.UserId)
            .ToListAsync(cancellationToken);

        var newAuthorUserIds = requestAuthorIds.Where(uid => !existingAuthorUserIds.Contains(uid)).ToList();
        if (newAuthorUserIds.Count == 0)
        {
            return;
        }

        var validUserIds = await _dbContext.Users
            .Where(u => newAuthorUserIds.Contains(u.Id))
            .Select(u => u.Id)
            .ToListAsync(cancellationToken);

        var orderByUserId = requestAuthorIds
            .Select((id, index) => new { id, index })
            .ToDictionary(x => x.id, x => x.index);

        var now = DateTimeOffset.UtcNow;
        foreach (var userId in newAuthorUserIds.Where(validUserIds.Contains))
        {
            _dbContext.ContentAuthors.Add(new ContentAuthor
            {
                Id = Guid.NewGuid(),
                ContentId = contentId,
                UserId = userId,
                Order = orderByUserId[userId],
                CreatedAt = now
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

        var contentId = await _dbContext.Contents
            .Where(c => c.ContentType == ContentType.Album && c.ContentRefId == albumId)
            .Select(c => (Guid?)c.Id)
            .FirstOrDefaultAsync(cancellationToken);

        var authors = contentId.HasValue
            ? await _dbContext.ContentAuthors
                .Where(ca => ca.ContentId == contentId.Value)
                .OrderBy(ca => ca.Order)
                .Select(ca => new ContentAuthorResponse(
                    ca.UserId,
                    ca.User.Username,
                    ca.User.DisplayName,
                    ca.Role,
                    ca.Order))
                .ToListAsync(cancellationToken)
            : new List<ContentAuthorResponse>();

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

        var authors = contentId.HasValue
            ? await _dbContext.ContentAuthors
                .AsNoTracking()
                .Where(ca => ca.ContentId == contentId.Value)
                .OrderBy(ca => ca.Order)
                .Select(ca => new ContentAuthorResponse(
                    ca.UserId,
                    ca.User.Username,
                    ca.User.DisplayName,
                    ca.Role,
                    ca.Order))
                .ToListAsync(cancellationToken)
            : new List<ContentAuthorResponse>();

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
            authors,
            contentId,
            likeCount,
            isLiked,
            commentCount,
            albumData.IsActive,
            albumData.SortOrder);
    }

    private async Task<Dictionary<Guid, List<ContentAuthorResponse>>> LoadAuthorsByAlbumIdsAsync(
        List<Guid> albumIds,
        CancellationToken cancellationToken)
    {
        if (albumIds.Count == 0)
        {
            return new Dictionary<Guid, List<ContentAuthorResponse>>();
        }

        var contentMap = await _dbContext.Contents
            .AsNoTracking()
            .Where(c => c.ContentType == ContentType.Album && albumIds.Contains(c.ContentRefId))
            .Select(c => new { c.Id, c.ContentRefId })
            .ToListAsync(cancellationToken);

        var contentIds = contentMap.Select(c => c.Id).ToList();
        var refIdByContentId = contentMap.ToDictionary(c => c.Id, c => c.ContentRefId);

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

        var result = new Dictionary<Guid, List<ContentAuthorResponse>>();
        foreach (var row in authorRows)
        {
            var albumId = refIdByContentId[row.ContentId];
            if (!result.TryGetValue(albumId, out var list))
            {
                list = [];
                result[albumId] = list;
            }
            list.Add(row.Response);
        }
        return result;
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

    private async Task UpsertAlbumContentAsync(Album album, Guid albumId, CancellationToken cancellationToken)
    {
        var content = await _dbContext.Contents
            .FirstOrDefaultAsync(c => c.ContentType == ContentType.Album && c.ContentRefId == albumId, cancellationToken);

        var searchBody = string.IsNullOrWhiteSpace(album.Description) ? null : album.Description.Trim();
        var now = DateTimeOffset.UtcNow;

        if (content is not null)
        {
            content.Title = album.Name;

            if (content.Slug != album.Slug)
            {
                var newSlugTaken = await _dbContext.Contents
                    .AnyAsync(c => c.Slug == album.Slug && c.Id != content.Id, cancellationToken);

                content.Slug = newSlugTaken
                    ? $"{album.Slug}-{content.Id.ToString()[..8]}"
                    : album.Slug;
            }

            content.Description = album.Description;
            content.Cover = album.Cover;
            content.IsPublished = album.IsActive;
            content.SearchBody = searchBody;
            content.UpdatedAt = now;
            return;
        }

        var slug = album.Slug;
        var slugExists = await _dbContext.Contents
            .AnyAsync(c => c.Slug == slug, cancellationToken);

        if (slugExists)
            slug = $"{album.Slug}-{album.Id.ToString()[..8]}";

        _dbContext.Contents.Add(new Content
        {
            Id = Guid.NewGuid(),
            ContentType = ContentType.Album,
            ContentRefId = album.Id,
            Title = album.Name,
            Slug = slug,
            Description = album.Description,
            Cover = album.Cover,
            IsPublished = album.IsActive,
            PublishedAt = album.CreatedAt,
            SearchBody = searchBody,
            CreatedAt = now,
            UpdatedAt = now
        });
    }
}
