using System.Text.RegularExpressions;
using JassSpace.Contracts.Interfaces;
using JassSpace.Contracts.Requests;
using JassSpace.Contracts.Responses;
using JassSpace.Data;
using JassSpace.Entities;
using JassSpace.Entities.Enums;
using JassSpace.Infra;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace JassSpace.Services;

public sealed class AdminMusicService(
    JassSpaceDbContext dbContext,
    IAzureBlobStorageService blobStorageService,
    IImageProcessingService imageProcessingService,
    IBootlegTokenService tokenService,
    ILogger<AdminMusicService> logger) : IAdminMusicService
{
    private readonly JassSpaceDbContext _dbContext = dbContext;
    private readonly IAzureBlobStorageService _blobStorageService = blobStorageService;
    private readonly IImageProcessingService _imageProcessingService = imageProcessingService;
    private readonly IBootlegTokenService _tokenService = tokenService;
    private readonly ILogger<AdminMusicService> _logger = logger;

    private const string TrackCoverBlobPrefix = "tracks/covers/";
    private const string TrackAudioBlobPrefix = "bootleg/audio/tracks/";

    private static readonly HashSet<string> AllowedCategories = new(StringComparer.OrdinalIgnoreCase)
    {
        "remixes",
        "originals",
        "snippets",
        "features",
        "collaborations",
        "covers"
    };

    public Task<List<TrackAuthorResponse>> GetAuthorsAsync(
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
            .Select(u => new TrackAuthorResponse(
                u.Id,
                u.Username,
                u.DisplayName ?? $"{u.FirstName} {u.LastName}".Trim(),
                null,
                0))
            .ToListAsync(cancellationToken);
    }

    public async Task<AdminMusicTracksQueryResult> GetTracksAsync(
        string? search,
        string? category,
        string? artist,
        string? genre,
        DateTimeOffset? dateFrom,
        DateTimeOffset? dateTo,
        string? sortBy = "releaseDate",
        string? sortDir = "desc",
        int page = 1,
        int pageSize = 50,
        CancellationToken cancellationToken = default)
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 200);

        var query = _dbContext.Tracks
            .AsNoTracking()
            .AsSplitQuery()
            .Include(t => t.Authors)
                .ThenInclude(a => a.User)
            .Include(t => t.Links)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
        {
            var pattern = $"%{search.Trim()}%";
            query = query.Where(t =>
                EF.Functions.ILike(t.Title, pattern) ||
                EF.Functions.ILike(t.Description, pattern) ||
                EF.Functions.ILike(t.Genre ?? string.Empty, pattern));
        }

        if (!string.IsNullOrWhiteSpace(category))
        {
            if (!TryNormalizeCategory(category, out var normalizedCategory))
            {
                return new AdminMusicTracksQueryResult(
                    AdminMusicTracksQueryStatus.InvalidCategory,
                    [],
                    page,
                    pageSize,
                    0,
                    $"Category '{category}' is not supported.");
            }

            query = query.Where(t => t.Category == normalizedCategory);
        }

        if (!string.IsNullOrWhiteSpace(artist))
        {
            var pattern = $"%{artist.Trim()}%";
            query = query.Where(t => t.Authors.Any(a =>
                EF.Functions.ILike(a.User.Username, pattern) ||
                EF.Functions.ILike(a.User.DisplayName ?? string.Empty, pattern)));
        }

        if (!string.IsNullOrWhiteSpace(genre))
        {
            var pattern = $"%{genre.Trim()}%";
            query = query.Where(t => EF.Functions.ILike(t.Genre ?? string.Empty, pattern));
        }

        if (dateFrom.HasValue)
        {
            query = query.Where(t => t.ReleaseDate >= dateFrom.Value);
        }

        if (dateTo.HasValue)
        {
            query = query.Where(t => t.ReleaseDate <= dateTo.Value);
        }

        query = ApplySort(query, NormalizeSortBy(sortBy), NormalizeSortDirection(sortDir));

        var total = await query.CountAsync(cancellationToken);
        var tracks = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);

        var trackIds = tracks.Select(t => t.Id).ToList();
        var contentByRefId = trackIds.Count == 0
            ? new Dictionary<Guid, Guid>()
            : await _dbContext.Contents
                .AsNoTracking()
                .Where(c => c.ContentType == ContentType.Music && trackIds.Contains(c.ContentRefId))
                .ToDictionaryAsync(c => c.ContentRefId, c => c.Id, cancellationToken);

        var response = tracks
            .Select(t => MapTrackListItem(t, contentByRefId.TryGetValue(t.Id, out var contentId) ? contentId : null))
            .ToList();

        return new AdminMusicTracksQueryResult(
            AdminMusicTracksQueryStatus.Success,
            response,
            page,
            pageSize,
            total);
    }

    public Task<TrackDetailResponse?> GetTrackAsync(
        Guid id,
        CancellationToken cancellationToken = default)
    {
        return GetTrackAsyncCore(id, cancellationToken);
    }

    public Task<AdminMusicCoverUploadResult> UploadTrackCoverAsync(
        Guid id,
        Stream fileStream,
        string fileName,
        string mediaBaseUrl,
        CancellationToken cancellationToken = default)
    {
        return UploadTrackCoverAsyncCore(id, fileStream, fileName, mediaBaseUrl, cancellationToken);
    }

    public Task<AdminMusicAudioUploadResult> UploadTrackAudioAsync(
        Guid id,
        Stream fileStream,
        string fileName,
        string contentType,
        long sizeBytes,
        Guid? uploadedByUserId,
        string baseUrl,
        int tokenTtlMinutes,
        CancellationToken cancellationToken = default)
    {
        return UploadTrackAudioAsyncCore(
            id,
            fileStream,
            fileName,
            contentType,
            sizeBytes,
            uploadedByUserId,
            baseUrl,
            tokenTtlMinutes,
            cancellationToken);
    }

    private async Task<TrackDetailResponse?> GetTrackAsyncCore(Guid id, CancellationToken cancellationToken)
    {
        var track = await GetTrackWithRelationsAsync(id, cancellationToken);
        if (track is null)
        {
            return null;
        }

        var contentId = await GetContentIdAsync(id, cancellationToken);
        return MapTrackDetail(track, contentId, 0, false, 0);
    }

    private async Task<AdminMusicCoverUploadResult> UploadTrackCoverAsyncCore(
        Guid id,
        Stream fileStream,
        string fileName,
        string mediaBaseUrl,
        CancellationToken cancellationToken)
    {
        var blobName = $"{TrackCoverBlobPrefix}{id:N}";

        await using var processedStream = await _imageProcessingService.ProcessImageAsync(fileStream, cancellationToken);
        var upload = await _blobStorageService.UploadImageAsync(
            processedStream,
            fileName,
            "image/webp",
            blobName,
            cancellationToken);

        var mediaUrl = BuildMediaUrl(mediaBaseUrl, upload.BlobName);
        var track = await _dbContext.Tracks.FirstOrDefaultAsync(t => t.Id == id, cancellationToken);
        var previousCover = track?.Cover;
        var trackUpdated = false;

        if (track is not null)
        {
            track.Cover = mediaUrl;
            track.UpdatedAt = DateTimeOffset.UtcNow;
            await _dbContext.SaveChangesAsync(cancellationToken);
            trackUpdated = true;
        }

        if (!string.IsNullOrWhiteSpace(previousCover) &&
            !string.Equals(previousCover.Trim(), mediaUrl, StringComparison.OrdinalIgnoreCase))
        {
            await DeleteTrackCoverIfOwnedAsync(previousCover, cancellationToken);
        }

        return new AdminMusicCoverUploadResult(
            new MediaUploadResponse(upload.BlobName, mediaUrl),
            trackUpdated);
    }

    private async Task<AdminMusicAudioUploadResult> UploadTrackAudioAsyncCore(
        Guid id,
        Stream fileStream,
        string fileName,
        string contentType,
        long sizeBytes,
        Guid? uploadedByUserId,
        string baseUrl,
        int tokenTtlMinutes,
        CancellationToken cancellationToken)
    {
        var normalizedContentType = NormalizeAudioContentType(contentType, fileName);
        var blobName = $"{TrackAudioBlobPrefix}{id:N}";
        var folder = $"tracks/{id:N}";

        var upload = await _blobStorageService.UploadImageAsync(
            fileStream,
            fileName,
            normalizedContentType,
            blobName,
            cancellationToken);

        var asset = await _dbContext.BootlegAssets
            .FirstOrDefaultAsync(a => a.BlobName == upload.BlobName, cancellationToken);

        var now = DateTimeOffset.UtcNow;
        if (asset is null)
        {
            asset = new BootlegAsset
            {
                Id = Guid.NewGuid(),
                Folder = folder,
                BlobName = upload.BlobName,
                OriginalFileName = fileName,
                ContentType = normalizedContentType,
                SizeBytes = sizeBytes,
                UploadedByUserId = uploadedByUserId,
                CreatedAt = now
            };
            _dbContext.BootlegAssets.Add(asset);
        }
        else
        {
            asset.Folder = folder;
            asset.OriginalFileName = fileName;
            asset.ContentType = normalizedContentType;
            asset.SizeBytes = sizeBytes;
            asset.UploadedByUserId = uploadedByUserId;
        }

        var track = await _dbContext.Tracks
            .FirstOrDefaultAsync(t => t.Id == id, cancellationToken);

        var previousAssetId = track?.BootlegAssetId;
        var trackUpdated = false;
        if (track is not null)
        {
            track.BootlegAssetId = asset.Id;
            track.UpdatedAt = now;
            trackUpdated = true;
        }

        await _dbContext.SaveChangesAsync(cancellationToken);

        if (previousAssetId.HasValue && previousAssetId.Value != asset.Id)
        {
            var removed = await CleanupTrackBootlegAssetAsync(previousAssetId.Value, cancellationToken);
            if (removed)
            {
                await _dbContext.SaveChangesAsync(cancellationToken);
            }
        }

        var ttl = TimeSpan.FromMinutes(Math.Max(1, tokenTtlMinutes));
        var token = _tokenService.CreateToken(upload.BlobName, ttl);
        var expiresAt = DateTimeOffset.UtcNow.Add(ttl);
        var streamUrl = BuildStreamUrl(baseUrl, upload.BlobName, token);

        return new AdminMusicAudioUploadResult(
            new BootlegUploadResponse(
                asset.Id,
                asset.Folder,
                asset.OriginalFileName,
                asset.BlobName,
                asset.SizeBytes,
                streamUrl,
                token,
                expiresAt),
            trackUpdated);
    }

    public Task<AdminMusicMutationResult> CreateTrackAsync(
        CreateTrackRequest request,
        CancellationToken cancellationToken = default)
    {
        return CreateTrackAsyncCore(request, cancellationToken);
    }

    public Task<AdminMusicMutationResult> UpdateTrackAsync(
        Guid id,
        UpdateTrackRequest request,
        CancellationToken cancellationToken = default)
    {
        return UpdateTrackAsyncCore(id, request, cancellationToken);
    }

    public Task<AdminMusicDeleteResult> DeleteTrackAsync(
        Guid id,
        CancellationToken cancellationToken = default)
    {
        return DeleteTrackAsyncCore(id, cancellationToken);
    }

    private async Task<AdminMusicMutationResult> CreateTrackAsyncCore(
        CreateTrackRequest request,
        CancellationToken cancellationToken)
    {
        var validation = await ValidateTrackRequestAsync(
            request.Title,
            request.Description,
            request.Category,
            request.BootlegAssetId,
            null,
            request.Authors,
            request.Links,
            cancellationToken);

        if (validation.Status != AdminMusicMutationStatus.Success)
        {
            return new AdminMusicMutationResult(validation.Status, null, validation.ErrorMessage);
        }

        var now = DateTimeOffset.UtcNow;
        var trackId = request.Id ?? Guid.NewGuid();
        var slug = await GenerateUniqueTrackSlugAsync(request.Slug ?? request.Title, null, cancellationToken);

        var track = new Track
        {
            Id = trackId,
            Title = request.Title.Trim(),
            Slug = slug,
            Description = request.Description.Trim(),
            Category = validation.NormalizedCategory!,
            Duration = NormalizeNullable(request.Duration),
            ReleaseDate = request.ReleaseDate,
            Genre = NormalizeNullable(request.Genre),
            Tags = NormalizeTags(request.Tags),
            Cover = NormalizeNullable(request.Cover),
            Featured = request.Featured,
            IsPublished = request.IsPublished,
            PublishedAt = request.IsPublished ? now : null,
            BootlegAssetId = request.BootlegAssetId,
            CreatedAt = now,
            UpdatedAt = now
        };

        _dbContext.Tracks.Add(track);

        AddTrackAuthors(track.Id, request.Authors, now);
        AddTrackLinks(track.Id, request.Links, now);

        var contentSlug = await GenerateUniqueContentSlugAsync(slug, null, cancellationToken);
        _dbContext.Contents.Add(new Content
        {
            Id = Guid.NewGuid(),
            ContentType = ContentType.Music,
            ContentRefId = track.Id,
            Title = track.Title,
            Slug = contentSlug,
            Description = track.Description,
            IsPublished = track.IsPublished,
            PublishedAt = track.PublishedAt,
            SearchBody = BuildTrackSearchBody(track.Description, track.Tags),
            CreatedAt = now,
            UpdatedAt = now
        });

        await _dbContext.SaveChangesAsync(cancellationToken);

        var created = await GetTrackWithRelationsAsync(track.Id, cancellationToken)
            ?? throw new InvalidOperationException("The track was created but could not be loaded.");

        var createdContentId = await GetContentIdAsync(created.Id, cancellationToken);
        return new AdminMusicMutationResult(
            AdminMusicMutationStatus.Success,
            MapTrackDetail(created, createdContentId, 0, false, 0));
    }

    private async Task<AdminMusicMutationResult> UpdateTrackAsyncCore(
        Guid id,
        UpdateTrackRequest request,
        CancellationToken cancellationToken)
    {
        var track = await _dbContext.Tracks
            .AsSplitQuery()
            .Include(t => t.Authors)
            .Include(t => t.Links)
            .FirstOrDefaultAsync(t => t.Id == id, cancellationToken);

        if (track is null)
        {
            return new AdminMusicMutationResult(
                AdminMusicMutationStatus.TrackNotFound,
                null,
                $"No track found with ID '{id}'.");
        }

        var validation = await ValidateTrackRequestAsync(
            request.Title,
            request.Description,
            request.Category,
            request.BootlegAssetId,
            id,
            request.Authors,
            request.Links,
            cancellationToken);

        if (validation.Status != AdminMusicMutationStatus.Success)
        {
            return new AdminMusicMutationResult(validation.Status, null, validation.ErrorMessage);
        }

        var now = DateTimeOffset.UtcNow;
        var previousCover = track.Cover;
        var previousBootlegAssetId = track.BootlegAssetId;

        var targetSlugSeed = !string.IsNullOrWhiteSpace(request.Slug)
            ? request.Slug
            : (request.Title != track.Title ? request.Title : track.Slug);

        track.Slug = await GenerateUniqueTrackSlugAsync(targetSlugSeed!, track.Id, cancellationToken);
        track.Title = request.Title.Trim();
        track.Description = request.Description.Trim();
        track.Category = validation.NormalizedCategory!;
        track.Duration = NormalizeNullable(request.Duration);
        track.ReleaseDate = request.ReleaseDate;
        track.Genre = NormalizeNullable(request.Genre);
        track.Tags = NormalizeTags(request.Tags);
        track.Cover = NormalizeNullable(request.Cover);
        track.Featured = request.Featured;
        track.BootlegAssetId = request.BootlegAssetId;

        if (request.IsPublished && !track.IsPublished)
        {
            track.PublishedAt = now;
        }
        else if (!request.IsPublished)
        {
            track.PublishedAt = null;
        }

        track.IsPublished = request.IsPublished;
        track.UpdatedAt = now;

        _dbContext.TrackAuthors.RemoveRange(track.Authors);
        _dbContext.TrackLinks.RemoveRange(track.Links);
        AddTrackAuthors(track.Id, request.Authors, now);
        AddTrackLinks(track.Id, request.Links, now);

        var content = await _dbContext.Contents
            .FirstOrDefaultAsync(c => c.ContentType == ContentType.Music && c.ContentRefId == id, cancellationToken);

        if (content is null)
        {
            var contentSlug = await GenerateUniqueContentSlugAsync(track.Slug, null, cancellationToken);
            _dbContext.Contents.Add(new Content
            {
                Id = Guid.NewGuid(),
                ContentType = ContentType.Music,
                ContentRefId = track.Id,
                Title = track.Title,
                Slug = contentSlug,
                Description = track.Description,
                IsPublished = track.IsPublished,
                PublishedAt = track.PublishedAt,
                SearchBody = BuildTrackSearchBody(track.Description, track.Tags),
                CreatedAt = now,
                UpdatedAt = now
            });
        }
        else
        {
            content.Title = track.Title;
            content.Slug = await GenerateUniqueContentSlugAsync(track.Slug, content.Id, cancellationToken);
            content.Description = track.Description;
            content.IsPublished = track.IsPublished;
            content.PublishedAt = track.PublishedAt;
            content.SearchBody = BuildTrackSearchBody(track.Description, track.Tags);
            content.UpdatedAt = now;
        }

        await _dbContext.SaveChangesAsync(cancellationToken);

        if (!string.Equals(previousCover, track.Cover, StringComparison.OrdinalIgnoreCase))
        {
            await DeleteTrackCoverIfOwnedAsync(previousCover, cancellationToken);
        }

        if (previousBootlegAssetId.HasValue &&
            previousBootlegAssetId.Value != track.BootlegAssetId)
        {
            var removed = await CleanupTrackBootlegAssetAsync(previousBootlegAssetId.Value, cancellationToken);
            if (removed)
            {
                await _dbContext.SaveChangesAsync(cancellationToken);
            }
        }

        var updated = await GetTrackWithRelationsAsync(id, cancellationToken)
            ?? throw new InvalidOperationException("The track was updated but could not be loaded.");

        var updatedContentId = await GetContentIdAsync(id, cancellationToken);
        return new AdminMusicMutationResult(
            AdminMusicMutationStatus.Success,
            MapTrackDetail(updated, updatedContentId, 0, false, 0));
    }

    private async Task<AdminMusicDeleteResult> DeleteTrackAsyncCore(Guid id, CancellationToken cancellationToken)
    {
        var track = await _dbContext.Tracks
            .FirstOrDefaultAsync(t => t.Id == id, cancellationToken);

        if (track is null)
        {
            return new AdminMusicDeleteResult(
                AdminMusicDeleteStatus.TrackNotFound,
                $"No track found with ID '{id}'.");
        }

        var cover = track.Cover;
        var bootlegAssetId = track.BootlegAssetId;

        var content = await _dbContext.Contents
            .FirstOrDefaultAsync(c => c.ContentType == ContentType.Music && c.ContentRefId == id, cancellationToken);
        if (content is not null)
        {
            _dbContext.Contents.Remove(content);
        }

        _dbContext.Tracks.Remove(track);
        await _dbContext.SaveChangesAsync(cancellationToken);

        await DeleteTrackCoverIfOwnedAsync(cover, cancellationToken);

        if (bootlegAssetId.HasValue)
        {
            var removed = await CleanupTrackBootlegAssetAsync(bootlegAssetId.Value, cancellationToken);
            if (removed)
            {
                await _dbContext.SaveChangesAsync(cancellationToken);
            }
        }

        return new AdminMusicDeleteResult(AdminMusicDeleteStatus.Success);
    }

    private void AddTrackAuthors(Guid trackId, List<TrackAuthorInputRequest>? authors, DateTimeOffset now)
    {
        if (authors is null || authors.Count == 0)
        {
            return;
        }

        var distinctAuthors = authors
            .Where(a => a.UserId != Guid.Empty)
            .DistinctBy(a => a.UserId)
            .ToList();

        for (var i = 0; i < distinctAuthors.Count; i++)
        {
            var author = distinctAuthors[i];
            _dbContext.TrackAuthors.Add(new TrackAuthor
            {
                Id = Guid.NewGuid(),
                TrackId = trackId,
                UserId = author.UserId,
                Role = NormalizeNullable(author.Role),
                Order = i,
                CreatedAt = now
            });
        }
    }

    private void AddTrackLinks(Guid trackId, List<TrackLinkInputRequest>? links, DateTimeOffset now)
    {
        if (links is null || links.Count == 0)
        {
            return;
        }

        var validLinks = links
            .Where(l => !string.IsNullOrWhiteSpace(l.Type) && !string.IsNullOrWhiteSpace(l.Url) && !string.IsNullOrWhiteSpace(l.Label))
            .Select((l, index) => new { Link = l, Index = index })
            .ToList();

        foreach (var item in validLinks)
        {
            _dbContext.TrackLinks.Add(new TrackLink
            {
                Id = Guid.NewGuid(),
                TrackId = trackId,
                Type = NormalizeLinkType(item.Link.Type),
                Url = item.Link.Url.Trim(),
                Label = item.Link.Label.Trim(),
                Order = item.Link.Order ?? item.Index,
                CreatedAt = now
            });
        }
    }

    private Task<TrackRequestValidationResult> ValidateTrackRequestAsync(
        string? title,
        string? description,
        string? category,
        Guid? bootlegAssetId,
        Guid? trackId,
        List<TrackAuthorInputRequest>? authors,
        List<TrackLinkInputRequest>? links,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(title))
        {
            return Task.FromResult(new TrackRequestValidationResult(
                AdminMusicMutationStatus.InvalidTitle,
                null,
                "Track title cannot be empty."));
        }

        if (string.IsNullOrWhiteSpace(description))
        {
            return Task.FromResult(new TrackRequestValidationResult(
                AdminMusicMutationStatus.InvalidDescription,
                null,
                "Track description cannot be empty."));
        }

        if (!TryNormalizeCategory(category, out var normalizedCategory))
        {
            return Task.FromResult(new TrackRequestValidationResult(
                AdminMusicMutationStatus.InvalidCategory,
                null,
                "Provide one of the supported music categories."));
        }

        return ValidateTrackRelationsAsync(
            normalizedCategory,
            bootlegAssetId,
            trackId,
            authors,
            links,
            cancellationToken);
    }

    private Task<Track?> GetTrackWithRelationsAsync(Guid trackId, CancellationToken cancellationToken)
    {
        return _dbContext.Tracks
            .AsNoTracking()
            .AsSplitQuery()
            .Include(t => t.Authors)
                .ThenInclude(a => a.User)
            .Include(t => t.Links)
            .FirstOrDefaultAsync(t => t.Id == trackId, cancellationToken);
    }

    private Task<Guid?> GetContentIdAsync(Guid trackId, CancellationToken cancellationToken)
    {
        return _dbContext.Contents
            .AsNoTracking()
            .Where(c => c.ContentType == ContentType.Music && c.ContentRefId == trackId)
            .Select(c => (Guid?)c.Id)
            .FirstOrDefaultAsync(cancellationToken);
    }

    private async Task<string> GenerateUniqueTrackSlugAsync(string seed, Guid? existingTrackId, CancellationToken cancellationToken)
    {
        var baseSlug = GenerateSlug(seed);
        if (string.IsNullOrWhiteSpace(baseSlug))
        {
            baseSlug = $"track-{Guid.NewGuid():N}".Substring(0, 14);
        }

        var slug = baseSlug;
        var counter = 1;
        while (await _dbContext.Tracks.AnyAsync(
                   t => t.Slug == slug && (!existingTrackId.HasValue || t.Id != existingTrackId.Value),
                   cancellationToken))
        {
            slug = $"{baseSlug}-{counter}";
            counter++;
        }

        return slug;
    }

    private async Task<string> GenerateUniqueContentSlugAsync(string baseSlug, Guid? existingContentId, CancellationToken cancellationToken)
    {
        var slug = baseSlug;
        var counter = 1;
        while (await _dbContext.Contents.AnyAsync(
                   c => c.Slug == slug && (!existingContentId.HasValue || c.Id != existingContentId.Value),
                   cancellationToken))
        {
            slug = $"{baseSlug}-{counter}";
            counter++;
        }

        return slug;
    }

    private async Task DeleteTrackCoverIfOwnedAsync(string? coverUrl, CancellationToken cancellationToken)
    {
        var blobName = ExtractTrackCoverBlobName(coverUrl);
        if (string.IsNullOrWhiteSpace(blobName))
        {
            return;
        }

        try
        {
            await _blobStorageService.DeleteBlobAsync(blobName, cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to delete track cover blob {BlobName}", blobName);
        }
    }

    private async Task<bool> CleanupTrackBootlegAssetAsync(Guid assetId, CancellationToken cancellationToken)
    {
        var stillReferenced = await _dbContext.Tracks
            .AnyAsync(t => t.BootlegAssetId == assetId, cancellationToken);
        if (stillReferenced)
        {
            return false;
        }

        var asset = await _dbContext.BootlegAssets
            .FirstOrDefaultAsync(a => a.Id == assetId, cancellationToken);
        if (asset is null)
        {
            return false;
        }

        try
        {
            await _blobStorageService.DeleteBlobAsync(asset.BlobName, cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to delete bootleg blob {BlobName} for orphaned asset {AssetId}", asset.BlobName, asset.Id);
        }

        _dbContext.BootlegAssets.Remove(asset);
        return true;
    }

    private static string? ExtractTrackCoverBlobName(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return null;
        }

        var trimmed = value.Trim();
        var marker = "/media/";

        if (Uri.TryCreate(trimmed, UriKind.Absolute, out var absolute))
        {
            var path = absolute.AbsolutePath;
            var index = path.IndexOf(marker, StringComparison.OrdinalIgnoreCase);
            if (index >= 0)
            {
                var candidate = NormalizePath(path[(index + marker.Length)..]);
                return candidate.StartsWith(TrackCoverBlobPrefix, StringComparison.OrdinalIgnoreCase)
                    ? candidate
                    : null;
            }
        }

        var relIndex = trimmed.IndexOf(marker, StringComparison.OrdinalIgnoreCase);
        if (relIndex >= 0)
        {
            var candidate = NormalizePath(trimmed[(relIndex + marker.Length)..]);
            return candidate.StartsWith(TrackCoverBlobPrefix, StringComparison.OrdinalIgnoreCase)
                ? candidate
                : null;
        }

        var normalized = NormalizePath(trimmed);
        return normalized.StartsWith(TrackCoverBlobPrefix, StringComparison.OrdinalIgnoreCase)
            ? normalized
            : null;
    }

    private static string BuildMediaUrl(string baseUrl, string blobName)
        => $"{baseUrl.TrimEnd('/')}/media/{blobName.TrimStart('/')}";

    private static string BuildStreamUrl(string baseUrl, string blobName, string token)
        => $"{baseUrl.TrimEnd('/')}/bootleg/stream/{blobName}?token={Uri.EscapeDataString(token)}";

    private static string NormalizePath(string input)
        => input.Trim().TrimStart('/').Replace('\\', '/');

    private static string[] NormalizeTags(List<string>? tags)
    {
        if (tags is null || tags.Count == 0)
        {
            return [];
        }

        return tags
            .Select(t => t?.Trim())
            .Where(t => !string.IsNullOrWhiteSpace(t))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .Select(t => t!)
            .ToArray();
    }

    private static string? NormalizeNullable(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return null;
        }

        return value.Trim();
    }

    private static string GenerateSlug(string input)
    {
        var slug = input.Trim().ToLowerInvariant();
        slug = Regex.Replace(slug, @"[^a-z0-9\s-]", "");
        slug = Regex.Replace(slug, @"\s+", "-");
        slug = Regex.Replace(slug, @"-+", "-");
        return slug.Trim('-');
    }

    private static TrackListItemResponse MapTrackListItem(Track track, Guid? contentId)
    {
        return new TrackListItemResponse(
            track.Id,
            contentId,
            track.Title,
            track.Slug,
            track.Description,
            track.Authors
                .OrderBy(a => a.Order)
                .Select(a => new TrackAuthorResponse(
                    a.UserId,
                    a.User.Username,
                    a.User.DisplayName,
                    a.Role,
                    a.Order))
                .ToList(),
            track.Category,
            track.Duration,
            track.ReleaseDate,
            track.Genre,
            track.Tags.Where(t => !string.IsNullOrWhiteSpace(t)).ToList(),
            track.Cover,
            track.Links
                .OrderBy(l => l.Order)
                .Select(l => new TrackLinkResponse(l.Type, l.Url, l.Label, l.Order))
                .ToList(),
            track.Featured,
            track.IsPublished,
            track.PublishedAt,
            track.CreatedAt,
            track.UpdatedAt,
            track.BootlegAssetId.HasValue,
            track.BootlegAssetId);
    }

    private static TrackDetailResponse MapTrackDetail(Track track, Guid? contentId, int likeCount, bool isLiked, int commentCount)
    {
        return new TrackDetailResponse(
            track.Id,
            contentId,
            track.Title,
            track.Slug,
            track.Description,
            track.Authors
                .OrderBy(a => a.Order)
                .Select(a => new TrackAuthorResponse(
                    a.UserId,
                    a.User.Username,
                    a.User.DisplayName,
                    a.Role,
                    a.Order))
                .ToList(),
            track.Category,
            track.Duration,
            track.ReleaseDate,
            track.Genre,
            track.Tags.Where(t => !string.IsNullOrWhiteSpace(t)).ToList(),
            track.Cover,
            track.Links
                .OrderBy(l => l.Order)
                .Select(l => new TrackLinkResponse(l.Type, l.Url, l.Label, l.Order))
                .ToList(),
            track.Featured,
            track.IsPublished,
            track.PublishedAt,
            track.CreatedAt,
            track.UpdatedAt,
            track.BootlegAssetId.HasValue,
            track.BootlegAssetId,
            likeCount,
            isLiked,
            commentCount);
    }

    private static bool TryNormalizeCategory(string? value, out string normalized)
    {
        normalized = string.Empty;
        if (string.IsNullOrWhiteSpace(value))
        {
            return false;
        }

        var candidate = value.Trim().ToLowerInvariant();
        if (!AllowedCategories.Contains(candidate))
        {
            return false;
        }

        normalized = candidate;
        return true;
    }

    private static string NormalizeLinkType(string value) => value.Trim().ToLowerInvariant();

    private static string NormalizeAudioContentType(string? contentType, string fileName)
    {
        if (!string.IsNullOrWhiteSpace(contentType) &&
            contentType.StartsWith("audio/", StringComparison.OrdinalIgnoreCase))
        {
            return contentType;
        }

        var extension = Path.GetExtension(fileName).ToLowerInvariant();
        return extension switch
        {
            ".mp3" => "audio/mpeg",
            ".m4a" => "audio/mp4",
            ".aac" => "audio/aac",
            ".wav" => "audio/wav",
            ".ogg" => "audio/ogg",
            ".webm" => "audio/webm",
            ".flac" => "audio/flac",
            _ => "application/octet-stream"
        };
    }

    private static string NormalizeSortBy(string? value)
    {
        return value?.Trim().ToLowerInvariant() switch
        {
            "artist" => "artist",
            "genre" => "genre",
            "title" => "title",
            "created" => "created",
            "createdat" => "created",
            "releasedate" => "releaseDate",
            "release" => "releaseDate",
            _ => "releaseDate",
        };
    }

    private static string NormalizeSortDirection(string? value)
    {
        return string.Equals(value?.Trim(), "asc", StringComparison.OrdinalIgnoreCase)
            ? "asc"
            : "desc";
    }

    private static IQueryable<Track> ApplySort(IQueryable<Track> query, string sortBy, string sortDir)
    {
        var ascending = sortDir == "asc";

        return sortBy switch
        {
            "artist" => ascending
                ? query
                    .OrderBy(t => t.Authors
                        .OrderBy(a => a.Order)
                        .Select(a => a.User.DisplayName ?? a.User.Username)
                        .FirstOrDefault())
                    .ThenBy(t => t.Title)
                : query
                    .OrderByDescending(t => t.Authors
                        .OrderBy(a => a.Order)
                        .Select(a => a.User.DisplayName ?? a.User.Username)
                        .FirstOrDefault())
                    .ThenByDescending(t => t.Title),
            "genre" => ascending
                ? query.OrderBy(t => t.Genre ?? string.Empty).ThenBy(t => t.Title)
                : query.OrderByDescending(t => t.Genre ?? string.Empty).ThenByDescending(t => t.Title),
            "title" => ascending
                ? query.OrderBy(t => t.Title)
                : query.OrderByDescending(t => t.Title),
            "created" => ascending
                ? query.OrderBy(t => t.CreatedAt).ThenBy(t => t.Title)
                : query.OrderByDescending(t => t.CreatedAt).ThenByDescending(t => t.Title),
            _ => ascending
                ? query.OrderBy(t => t.ReleaseDate).ThenBy(t => t.Title)
                : query.OrderByDescending(t => t.ReleaseDate).ThenByDescending(t => t.Title),
        };
    }

    private async Task<TrackRequestValidationResult> ValidateTrackRelationsAsync(
        string normalizedCategory,
        Guid? bootlegAssetId,
        Guid? trackId,
        List<TrackAuthorInputRequest>? authors,
        List<TrackLinkInputRequest>? links,
        CancellationToken cancellationToken)
    {
        if (bootlegAssetId.HasValue)
        {
            var exists = await _dbContext.BootlegAssets
                .AsNoTracking()
                .AnyAsync(a => a.Id == bootlegAssetId.Value, cancellationToken);
            if (!exists)
            {
                return new TrackRequestValidationResult(
                    AdminMusicMutationStatus.InvalidBootlegAsset,
                    null,
                    $"No bootleg asset found with ID '{bootlegAssetId.Value}'.");
            }

            var usedByAnotherTrack = await _dbContext.Tracks
                .AsNoTracking()
                .AnyAsync(t =>
                    t.BootlegAssetId == bootlegAssetId.Value &&
                    (!trackId.HasValue || t.Id != trackId.Value),
                    cancellationToken);

            if (usedByAnotherTrack)
            {
                return new TrackRequestValidationResult(
                    AdminMusicMutationStatus.BootlegAssetAlreadyAttached,
                    null,
                    "This audio source is already attached to another track.");
            }
        }

        if (authors is not null && authors.Count > 0)
        {
            var authorIds = authors
                .Where(a => a.UserId != Guid.Empty)
                .Select(a => a.UserId)
                .Distinct()
                .ToList();

            var validAuthorCount = await _dbContext.Users
                .AsNoTracking()
                .CountAsync(u => authorIds.Contains(u.Id), cancellationToken);
            if (validAuthorCount != authorIds.Count)
            {
                return new TrackRequestValidationResult(
                    AdminMusicMutationStatus.InvalidAuthors,
                    null,
                    "One or more author IDs are invalid.");
            }
        }

        if (links is not null && links.Count > 0)
        {
            foreach (var link in links)
            {
                if (string.IsNullOrWhiteSpace(link.Type) ||
                    string.IsNullOrWhiteSpace(link.Url) ||
                    string.IsNullOrWhiteSpace(link.Label))
                {
                    return new TrackRequestValidationResult(
                        AdminMusicMutationStatus.InvalidLinks,
                        null,
                        "Each link requires type, url, and label.");
                }

                if (!Uri.TryCreate(link.Url.Trim(), UriKind.Absolute, out _))
                {
                    return new TrackRequestValidationResult(
                        AdminMusicMutationStatus.InvalidLinks,
                        null,
                        $"Invalid absolute URL '{link.Url}'.");
                }
            }
        }

        return new TrackRequestValidationResult(
            AdminMusicMutationStatus.Success,
            normalizedCategory,
            null);
    }

    private static string? BuildTrackSearchBody(string? description, string[]? tags)
    {
        var parts = new List<string>();
        if (!string.IsNullOrWhiteSpace(description))
            parts.Add(description.Trim());
        if (tags is { Length: > 0 })
            parts.Add(string.Join(" ", tags.Where(t => !string.IsNullOrWhiteSpace(t))));
        return parts.Count > 0 ? string.Join(" ", parts) : null;
    }

    private sealed record TrackRequestValidationResult(
        AdminMusicMutationStatus Status,
        string? NormalizedCategory,
        string? ErrorMessage);
}
