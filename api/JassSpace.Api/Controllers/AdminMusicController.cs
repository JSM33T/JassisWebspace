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
using JassSpace.Api.Extensions;
using JassSpace.Api.Configuration;
using JassSpace.Api.Services;
using Microsoft.Extensions.Options;

namespace JassSpace.Api.Controllers;

[Route("admin/music")]
[Authorize(Roles = "admin,mod")]
public sealed class AdminMusicController(
    JassSpaceDbContext dbContext,
    ILogger<AdminMusicController> logger,
    IAzureBlobStorageService blobStorageService,
    IImageProcessingService imageProcessingService,
    IBootlegTokenService tokenService,
    IOptions<BootlegStreamingSettings> streamingSettings,
    IHttpResponseCacheStore responseCacheStore)
    : BaseApiController
{
    private readonly BootlegStreamingSettings _streamingSettings = streamingSettings.Value;
    private const string TrackCoverBlobPrefix = "tracks/covers/";
    private const string TrackAudioBlobPrefix = "bootleg/audio/tracks/";

    [HttpGet("authors")]
    [ProducesResponseType(typeof(ApiResponse<List<TrackAuthorResponse>>), StatusCodes.Status200OK)]
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

        return OkEnvelope(authors);
    }

    [HttpGet("tracks")]
    [ProducesResponseType(typeof(ApiResponse<IReadOnlyCollection<TrackListItemResponse>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetTracks(
        [FromQuery] string? search,
        [FromQuery] string? category,
        [FromQuery] string? artist,
        [FromQuery] string? genre,
        [FromQuery] DateTimeOffset? dateFrom,
        [FromQuery] DateTimeOffset? dateTo,
        [FromQuery] string? sortBy = "releaseDate",
        [FromQuery] string? sortDir = "desc",
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50,
        CancellationToken cancellationToken = default)
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 200);

        var query = dbContext.Tracks
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
                return BadRequestProblem("Invalid category", $"Category '{category}' is not supported.");
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

        var normalizedSortBy = NormalizeSortBy(sortBy);
        var normalizedSortDir = NormalizeSortDirection(sortDir);

        query = ApplySort(query, normalizedSortBy, normalizedSortDir);

        var total = await query.CountAsync(cancellationToken);
        var tracks = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(cancellationToken);

        var trackIds = tracks.Select(t => t.Id).ToList();
        var contentByRefId = await dbContext.Contents
            .AsNoTracking()
            .Where(c => c.ContentType == ContentType.Music && trackIds.Contains(c.ContentRefId))
            .ToDictionaryAsync(c => c.ContentRefId, c => c.Id, cancellationToken);

        var response = tracks
            .Select(t => MapTrackListItem(t, contentByRefId.TryGetValue(t.Id, out var contentId) ? contentId : null))
            .ToList();

        return PagedOk(response, page, pageSize, total);
    }

    [HttpGet("tracks/{id:guid}")]
    [ProducesResponseType(typeof(ApiResponse<TrackDetailResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetTrack(Guid id, CancellationToken cancellationToken = default)
    {
        var track = await GetTrackWithRelations(id, cancellationToken);
        if (track is null)
        {
            return NotFoundProblem("Track not found", $"No track found with ID '{id}'.");
        }

        var contentId = await dbContext.Contents
            .AsNoTracking()
            .Where(c => c.ContentType == ContentType.Music && c.ContentRefId == id)
            .Select(c => (Guid?)c.Id)
            .FirstOrDefaultAsync(cancellationToken);

        return OkEnvelope(MapTrackDetail(track, contentId, 0, false, 0));
    }

    [HttpPost("tracks/{id:guid}/cover")]
    [ProducesResponseType(typeof(ApiResponse<MediaUploadResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> UploadTrackCover(
        Guid id,
        [FromForm] IFormFile? file,
        CancellationToken cancellationToken = default)
    {
        if (file is null || file.Length == 0)
        {
            return BadRequestProblem("No file uploaded", "Provide a non-empty image file.");
        }

        if (!file.ContentType.StartsWith("image/", StringComparison.OrdinalIgnoreCase))
        {
            return BadRequestProblem("Invalid file type", "Only image files are accepted for track cover upload.");
        }

        try
        {
            var blobName = $"{TrackCoverBlobPrefix}{id:N}";
            var upload = await UploadTrackCoverFileAsync(file, blobName, cancellationToken);
            var mediaUrl = MediaUrlHelper.BuildMediaUrl(Request, upload.BlobName);

            var track = await dbContext.Tracks.FirstOrDefaultAsync(t => t.Id == id, cancellationToken);
            var previousCover = track?.Cover;

            if (track is not null)
            {
                track.Cover = mediaUrl;
                track.UpdatedAt = DateTimeOffset.UtcNow;
                await dbContext.SaveChangesAsync(cancellationToken);
                await responseCacheStore.InvalidateByBaseKeyAsync(RedisCacheKeys.MusicSeo, cancellationToken);
            }

            if (!string.IsNullOrWhiteSpace(previousCover) &&
                !string.Equals(previousCover.Trim(), mediaUrl, StringComparison.OrdinalIgnoreCase))
            {
                await DeleteTrackCoverIfOwnedAsync(previousCover, cancellationToken);
            }

            return OkEnvelope(new MediaUploadResponse(upload.BlobName, mediaUrl));
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to upload cover for track {TrackId}", id);
            return Problem(
                StatusCodes.Status500InternalServerError,
                "Failed to upload cover",
                "An unexpected error occurred while uploading the track cover.");
        }
    }

    [HttpPost("tracks/{id:guid}/audio")]
    [ProducesResponseType(typeof(ApiResponse<BootlegUploadResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> UploadTrackAudio(
        Guid id,
        [FromForm] IFormFile? file,
        CancellationToken cancellationToken = default)
    {
        if (file is null || file.Length == 0)
        {
            return BadRequestProblem("No file uploaded", "Provide a non-empty audio file.");
        }

        var normalizedContentType = NormalizeAudioContentType(file.ContentType, file.FileName);
        if (!normalizedContentType.StartsWith("audio/", StringComparison.OrdinalIgnoreCase))
        {
            return BadRequestProblem("Invalid file type", "Only audio files are accepted.");
        }

        var uploadedBy = Guid.TryParse(UserId, out var userGuid) ? userGuid : (Guid?)null;
        var blobName = $"{TrackAudioBlobPrefix}{id:N}";
        var folder = $"tracks/{id:N}";

        try
        {
            BlobUploadResult upload;
            await using (var stream = file.OpenReadStream())
            {
                upload = await blobStorageService.UploadImageAsync(
                    stream,
                    file.FileName,
                    normalizedContentType,
                    blobName,
                    cancellationToken);
            }

            var asset = await dbContext.BootlegAssets
                .FirstOrDefaultAsync(a => a.BlobName == upload.BlobName, cancellationToken);

            var now = DateTimeOffset.UtcNow;
            if (asset is null)
            {
                asset = new BootlegAsset
                {
                    Id = Guid.NewGuid(),
                    Folder = folder,
                    BlobName = upload.BlobName,
                    OriginalFileName = file.FileName,
                    ContentType = normalizedContentType,
                    SizeBytes = file.Length,
                    UploadedByUserId = uploadedBy,
                    CreatedAt = now
                };
                dbContext.BootlegAssets.Add(asset);
            }
            else
            {
                asset.Folder = folder;
                asset.OriginalFileName = file.FileName;
                asset.ContentType = normalizedContentType;
                asset.SizeBytes = file.Length;
                asset.UploadedByUserId = uploadedBy;
            }

            var track = await dbContext.Tracks
                .FirstOrDefaultAsync(t => t.Id == id, cancellationToken);

            var previousAssetId = track?.BootlegAssetId;
            if (track is not null)
            {
                track.BootlegAssetId = asset.Id;
                track.UpdatedAt = now;
            }

            await dbContext.SaveChangesAsync(cancellationToken);

            if (previousAssetId.HasValue && previousAssetId.Value != asset.Id)
            {
                var removed = await CleanupTrackBootlegAssetAsync(previousAssetId.Value, cancellationToken);
                if (removed)
                {
                    await dbContext.SaveChangesAsync(cancellationToken);
                }
            }

            var ttl = TimeSpan.FromMinutes(Math.Max(1, _streamingSettings.TokenTtlMinutes));
            var token = tokenService.CreateToken(upload.BlobName, ttl);
            var expiresAt = DateTimeOffset.UtcNow.Add(ttl);
            var streamUrl = $"{Request.Scheme}://{Request.Host}/bootleg/stream/{upload.BlobName}?token={Uri.EscapeDataString(token)}";

            return OkEnvelope(new BootlegUploadResponse(
                asset.Id,
                asset.Folder,
                asset.OriginalFileName,
                asset.BlobName,
                asset.SizeBytes,
                streamUrl,
                token,
                expiresAt));
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to upload audio for track {TrackId}", id);
            return Problem(
                StatusCodes.Status500InternalServerError,
                "Failed to upload audio",
                "An unexpected error occurred while uploading track audio.");
        }
    }

    [HttpPost("tracks")]
    [ProducesResponseType(typeof(ApiResponse<TrackDetailResponse>), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> CreateTrack([FromBody] CreateTrackRequest request, CancellationToken cancellationToken = default)
    {
        var validation = await ValidateTrackRequest(
            request.Title,
            request.Description,
            request.Category,
            request.BootlegAssetId,
            null,
            request.Authors,
            request.Links,
            cancellationToken);

        if (validation.ErrorResult is not null)
        {
            return validation.ErrorResult;
        }

        var now = DateTimeOffset.UtcNow;
        var trackId = request.Id ?? Guid.NewGuid();
        var slug = await GenerateUniqueTrackSlug(request.Slug ?? request.Title, null, cancellationToken);

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

        dbContext.Tracks.Add(track);

        AddTrackAuthors(track.Id, request.Authors, now);
        AddTrackLinks(track.Id, request.Links, now);

        var contentSlug = await GenerateUniqueContentSlug(slug, null, cancellationToken);
        dbContext.Contents.Add(new Content
        {
            Id = Guid.NewGuid(),
            ContentType = ContentType.Music,
            ContentRefId = track.Id,
            Title = track.Title,
            Slug = contentSlug,
            IsPublished = track.IsPublished,
            PublishedAt = track.PublishedAt,
            CreatedAt = now,
            UpdatedAt = now
        });

        await dbContext.SaveChangesAsync(cancellationToken);
        await responseCacheStore.InvalidateByBaseKeyAsync(RedisCacheKeys.MusicSeo, cancellationToken);

        var created = await GetTrackWithRelations(track.Id, cancellationToken);
        if (created is null)
        {
            return Problem(
                StatusCodes.Status500InternalServerError,
                "Track creation failed",
                "The track was created but could not be loaded.");
        }

        var createdContentId = await dbContext.Contents
            .AsNoTracking()
            .Where(c => c.ContentType == ContentType.Music && c.ContentRefId == created.Id)
            .Select(c => (Guid?)c.Id)
            .FirstOrDefaultAsync(cancellationToken);

        var response = MapTrackDetail(created, createdContentId, 0, false, 0);
        return Created($"/admin/music/tracks/{created.Id}", new ApiResponse<TrackDetailResponse>(response));
    }

    [HttpPut("tracks/{id:guid}")]
    [ProducesResponseType(typeof(ApiResponse<TrackDetailResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> UpdateTrack(Guid id, [FromBody] UpdateTrackRequest request, CancellationToken cancellationToken = default)
    {
        var track = await dbContext.Tracks
            .AsSplitQuery()
            .Include(t => t.Authors)
            .Include(t => t.Links)
            .FirstOrDefaultAsync(t => t.Id == id, cancellationToken);

        if (track is null)
        {
            return NotFoundProblem("Track not found", $"No track found with ID '{id}'.");
        }

        var validation = await ValidateTrackRequest(
            request.Title,
            request.Description,
            request.Category,
            request.BootlegAssetId,
            id,
            request.Authors,
            request.Links,
            cancellationToken);

        if (validation.ErrorResult is not null)
        {
            return validation.ErrorResult;
        }

        var now = DateTimeOffset.UtcNow;
        var previousCover = track.Cover;
        var previousBootlegAssetId = track.BootlegAssetId;

        var targetSlugSeed = !string.IsNullOrWhiteSpace(request.Slug)
            ? request.Slug
            : (request.Title != track.Title ? request.Title : track.Slug);
        track.Slug = await GenerateUniqueTrackSlug(targetSlugSeed!, track.Id, cancellationToken);
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

        dbContext.TrackAuthors.RemoveRange(track.Authors);
        dbContext.TrackLinks.RemoveRange(track.Links);
        AddTrackAuthors(track.Id, request.Authors, now);
        AddTrackLinks(track.Id, request.Links, now);

        var content = await dbContext.Contents
            .FirstOrDefaultAsync(c => c.ContentType == ContentType.Music && c.ContentRefId == id, cancellationToken);

        if (content is null)
        {
            var contentSlug = await GenerateUniqueContentSlug(track.Slug, null, cancellationToken);
            dbContext.Contents.Add(new Content
            {
                Id = Guid.NewGuid(),
                ContentType = ContentType.Music,
                ContentRefId = track.Id,
                Title = track.Title,
                Slug = contentSlug,
                IsPublished = track.IsPublished,
                PublishedAt = track.PublishedAt,
                CreatedAt = now,
                UpdatedAt = now
            });
        }
        else
        {
            content.Title = track.Title;
            content.Slug = await GenerateUniqueContentSlug(track.Slug, content.Id, cancellationToken);
            content.IsPublished = track.IsPublished;
            content.PublishedAt = track.PublishedAt;
            content.UpdatedAt = now;
        }

        await dbContext.SaveChangesAsync(cancellationToken);
        await responseCacheStore.InvalidateByBaseKeyAsync(RedisCacheKeys.MusicSeo, cancellationToken);

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
                await dbContext.SaveChangesAsync(cancellationToken);
            }
        }

        var updated = await GetTrackWithRelations(id, cancellationToken);
        if (updated is null)
        {
            return Problem(
                StatusCodes.Status500InternalServerError,
                "Track update failed",
                "The track was updated but could not be loaded.");
        }

        var updatedContentId = await dbContext.Contents
            .AsNoTracking()
            .Where(c => c.ContentType == ContentType.Music && c.ContentRefId == id)
            .Select(c => (Guid?)c.Id)
            .FirstOrDefaultAsync(cancellationToken);

        return OkEnvelope(MapTrackDetail(updated, updatedContentId, 0, false, 0));
    }

    [HttpDelete("tracks/{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DeleteTrack(Guid id, CancellationToken cancellationToken = default)
    {
        var track = await dbContext.Tracks
            .FirstOrDefaultAsync(t => t.Id == id, cancellationToken);

        if (track is null)
        {
            return NotFoundProblem("Track not found", $"No track found with ID '{id}'.");
        }

        try
        {
            var cover = track.Cover;
            var bootlegAssetId = track.BootlegAssetId;

            var content = await dbContext.Contents
                .FirstOrDefaultAsync(c => c.ContentType == ContentType.Music && c.ContentRefId == id, cancellationToken);
            if (content is not null)
            {
                dbContext.Contents.Remove(content);
            }

            dbContext.Tracks.Remove(track);
            await dbContext.SaveChangesAsync(cancellationToken);
            await responseCacheStore.InvalidateByBaseKeyAsync(RedisCacheKeys.MusicSeo, cancellationToken);

            await DeleteTrackCoverIfOwnedAsync(cover, cancellationToken);

            if (bootlegAssetId.HasValue)
            {
                var removed = await CleanupTrackBootlegAssetAsync(bootlegAssetId.Value, cancellationToken);
                if (removed)
                {
                    await dbContext.SaveChangesAsync(cancellationToken);
                }
            }

            return NoContent();
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to delete track {TrackId}", id);
            return Problem(
                StatusCodes.Status500InternalServerError,
                "Failed to delete track",
                "An unexpected error occurred while deleting the track.");
        }
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
            dbContext.TrackAuthors.Add(new TrackAuthor
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
            dbContext.TrackLinks.Add(new TrackLink
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

    private async Task<(IActionResult? ErrorResult, string? NormalizedCategory)> ValidateTrackRequest(
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
            return (BadRequestProblem("Invalid title", "Track title cannot be empty."), null);
        }

        if (string.IsNullOrWhiteSpace(description))
        {
            return (BadRequestProblem("Invalid description", "Track description cannot be empty."), null);
        }

        if (!TryNormalizeCategory(category, out var normalizedCategory))
        {
            return (BadRequestProblem("Invalid category", "Provide one of the supported music categories."), null);
        }

        if (bootlegAssetId.HasValue)
        {
            var exists = await dbContext.BootlegAssets
                .AsNoTracking()
                .AnyAsync(a => a.Id == bootlegAssetId.Value, cancellationToken);
            if (!exists)
            {
                return (BadRequestProblem("Invalid bootleg asset", $"No bootleg asset found with ID '{bootlegAssetId.Value}'."), null);
            }

            var usedByAnotherTrack = await dbContext.Tracks
                .AsNoTracking()
                .AnyAsync(t =>
                    t.BootlegAssetId == bootlegAssetId.Value &&
                    (!trackId.HasValue || t.Id != trackId.Value),
                    cancellationToken);

            if (usedByAnotherTrack)
            {
                return (BadRequestProblem("Bootleg asset already attached", "This audio source is already attached to another track."), null);
            }
        }

        if (authors is not null && authors.Count > 0)
        {
            var authorIds = authors
                .Where(a => a.UserId != Guid.Empty)
                .Select(a => a.UserId)
                .Distinct()
                .ToList();

            var validAuthorCount = await dbContext.Users
                .AsNoTracking()
                .CountAsync(u => authorIds.Contains(u.Id), cancellationToken);
            if (validAuthorCount != authorIds.Count)
            {
                return (BadRequestProblem("Invalid authors", "One or more author IDs are invalid."), null);
            }
        }

        if (links is not null && links.Count > 0)
        {
            foreach (var link in links)
            {
                if (string.IsNullOrWhiteSpace(link.Type) || string.IsNullOrWhiteSpace(link.Url) || string.IsNullOrWhiteSpace(link.Label))
                {
                    return (BadRequestProblem("Invalid links", "Each link requires type, url, and label."), null);
                }

                if (!Uri.TryCreate(link.Url.Trim(), UriKind.Absolute, out _))
                {
                    return (BadRequestProblem("Invalid links", $"Invalid absolute URL '{link.Url}'."), null);
                }
            }
        }

        return (null, normalizedCategory);
    }

    private async Task<Track?> GetTrackWithRelations(Guid trackId, CancellationToken cancellationToken)
    {
        return await dbContext.Tracks
            .AsNoTracking()
            .AsSplitQuery()
            .Include(t => t.Authors)
                .ThenInclude(a => a.User)
            .Include(t => t.Links)
            .FirstOrDefaultAsync(t => t.Id == trackId, cancellationToken);
    }

    private async Task<string> GenerateUniqueTrackSlug(string seed, Guid? existingTrackId, CancellationToken cancellationToken)
    {
        var baseSlug = GenerateSlug(seed);
        if (string.IsNullOrWhiteSpace(baseSlug))
        {
            baseSlug = $"track-{Guid.NewGuid():N}".Substring(0, 14);
        }

        var slug = baseSlug;
        var counter = 1;
        while (await dbContext.Tracks.AnyAsync(
                   t => t.Slug == slug && (!existingTrackId.HasValue || t.Id != existingTrackId.Value),
                   cancellationToken))
        {
            slug = $"{baseSlug}-{counter}";
            counter++;
        }

        return slug;
    }

    private async Task<string> GenerateUniqueContentSlug(string baseSlug, Guid? existingContentId, CancellationToken cancellationToken)
    {
        var slug = baseSlug;
        var counter = 1;
        while (await dbContext.Contents.AnyAsync(
                   c => c.Slug == slug && (!existingContentId.HasValue || c.Id != existingContentId.Value),
                   cancellationToken))
        {
            slug = $"{baseSlug}-{counter}";
            counter++;
        }

        return slug;
    }

    private async Task<BlobUploadResult> UploadTrackCoverFileAsync(
        IFormFile file,
        string blobName,
        CancellationToken cancellationToken)
    {
        await using var stream = file.OpenReadStream();
        await using var processedStream = await imageProcessingService.ProcessImageAsync(stream, cancellationToken);

        return await blobStorageService.UploadImageAsync(
            processedStream,
            file.FileName,
            "image/webp",
            blobName,
            cancellationToken);
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
            await blobStorageService.DeleteBlobAsync(blobName, cancellationToken);
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Failed to delete track cover blob {BlobName}", blobName);
        }
    }

    private async Task<bool> CleanupTrackBootlegAssetAsync(Guid assetId, CancellationToken cancellationToken)
    {
        var stillReferenced = await dbContext.Tracks
            .AnyAsync(t => t.BootlegAssetId == assetId, cancellationToken);
        if (stillReferenced)
        {
            return false;
        }

        var asset = await dbContext.BootlegAssets
            .FirstOrDefaultAsync(a => a.Id == assetId, cancellationToken);
        if (asset is null)
        {
            return false;
        }

        try
        {
            await blobStorageService.DeleteBlobAsync(asset.BlobName, cancellationToken);
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Failed to delete bootleg blob {BlobName} for orphaned asset {AssetId}", asset.BlobName, asset.Id);
        }

        dbContext.BootlegAssets.Remove(asset);
        return true;
    }

    private static string? ExtractTrackCoverBlobName(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return null;
        }

        if (MediaUrlHelper.TryExtractMediaBlobName(value.Trim(), out var mediaBlobName))
        {
            var normalizedMediaBlob = NormalizePath(mediaBlobName);
            return normalizedMediaBlob.StartsWith(TrackCoverBlobPrefix, StringComparison.OrdinalIgnoreCase)
                ? normalizedMediaBlob
                : null;
        }

        var normalized = NormalizePath(value);
        return normalized.StartsWith(TrackCoverBlobPrefix, StringComparison.OrdinalIgnoreCase)
            ? normalized
            : null;
    }

    private static string NormalizePath(string input)
    {
        return input.Trim().TrimStart('/').Replace('\\', '/');
    }

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

    private static readonly HashSet<string> AllowedCategories = new(StringComparer.OrdinalIgnoreCase)
    {
        "remixes",
        "originals",
        "snippets",
        "features",
        "collaborations",
        "covers"
    };

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
}
