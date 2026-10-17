using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using JassSpace.Contracts.Interfaces;
using JassSpace.Contracts.Requests;
using JassSpace.Contracts.Responses;
using JassSpace.Data;
using JassSpace.Entities;
using JassSpace.Entities.Enums;
using JassSpace.Infra;
using JassSpace.Infra.Configuration;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace JassSpace.Services;

public sealed class ArtifactService(
    JassSpaceDbContext db,
    IArtifactStorageService storage,
    IArtifactAccessContext actor,
    IArtifactTokenProtector protector,
    IOptions<ArtifactSettings> options,
    ILogger<ArtifactService> logger) : IArtifactService
{
    private readonly ArtifactSettings settings = options.Value;

    private void RequireManager()
    {
        if (!actor.CanManage || actor.UserId is null) throw new ArtifactException(403, "Artifact management requires an admin or moderator account.");
    }

    private IQueryable<Artifact> ManagedQuery()
    {
        RequireManager();
        return db.Artifacts.Where(a => a.State == "Ready" && (actor.IsAdmin || a.OwnerUserId == actor.UserId));
    }

    public async Task<ArtifactPageResponse> ListAsync(string? search, Guid? owner, int page, int pageSize, CancellationToken ct)
    {
        var query = ManagedQuery().AsNoTracking();
        if (actor.IsAdmin && owner.HasValue) query = query.Where(a => a.OwnerUserId == owner);
        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim().ToLowerInvariant();
            query = query.Where(a => a.Title.ToLower().Contains(term) || a.OriginalFileName.ToLower().Contains(term));
        }
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 100);
        var total = await query.CountAsync(ct);
        page = Math.Min(page, Math.Max(1, (int)Math.Ceiling(total / (double)pageSize)));
        var rows = await query.Include(a => a.OwnerUser).Include(a => a.Links)
            .OrderByDescending(a => a.CreatedAt).Skip((page - 1) * pageSize).Take(pageSize).ToListAsync(ct);
        var owners = actor.IsAdmin
            ? await db.Artifacts.Where(a => a.State == "Ready" && a.OwnerUserId != null)
                .Select(a => new { Id = a.OwnerUserId!.Value, Name = a.OwnerUser!.DisplayName ?? a.OwnerUser.Username })
                .Distinct().OrderBy(o => o.Name).Select(o => new ArtifactOwnerResponse(o.Id, o.Name)).ToListAsync(ct)
            : new List<ArtifactOwnerResponse>();
        return new(rows.Select(a => Map(a, DateTimeOffset.UtcNow)).ToList(), total, page, pageSize, settings.MaxUploadBytes, settings.OwnerQuotaBytes, owners);
    }

    public async Task<ArtifactDetailResponse> GetByContentAsync(Guid contentId, CancellationToken ct)
    {
        var id = await ManagedQuery().Where(a => a.ContentId == contentId).Select(a => (Guid?)a.Id).SingleOrDefaultAsync(ct) ?? throw NotFound();
        return await GetAsync(id, ct);
    }

    public async Task<ArtifactDetailResponse> GetAsync(Guid id, CancellationToken ct)
    {
        var artifact = await ManagedQuery().AsNoTracking().Include(a => a.OwnerUser).Include(a => a.Links)
            .SingleOrDefaultAsync(a => a.Id == id, ct) ?? throw NotFound();
        var now = DateTimeOffset.UtcNow;
        return new(Map(artifact, now), artifact.PrivateNote,
            artifact.Links.OrderByDescending(l => l.CreatedAt).Select(l => MapLink(l, now)).ToList(), settings.MaxUploadBytes);
    }

    public async Task<ArtifactDetailResponse> UploadAsync(Stream stream, string filename, string mediaType, long length, string? title, string? note, CancellationToken ct)
    {
        RequireManager();
        var id = await UploadNewAsync(stream, filename, mediaType, length, title, note, actor.UserId!.Value, "Ready", ct);
        return await GetAsync(id, ct);
    }

    private async Task<Guid> UploadNewAsync(Stream stream, string filename, string mediaType, long length,
        string? title, string? note, Guid quotaOwner, string completedState, CancellationToken ct)
    {
        RequireManager();
        if (length <= 0) throw new ArtifactException(400, "Choose a non-empty file.");
        if (length > settings.MaxUploadBytes) throw new ArtifactException(413, "The file exceeds the configured upload limit.");
        filename = SafeFileName(filename);
        title = string.IsNullOrWhiteSpace(title) ? filename : title.Trim();
        ValidateText(title, note);
        mediaType = mediaType.Length <= 128 && !mediaType.Any(char.IsControl) ? mediaType : "application/octet-stream";
        var id = Guid.NewGuid();
        var contentId = Guid.NewGuid();
        var key = $"artifacts/{id:N}";
        await TransactionAsync(async () =>
        {
            // Serialize quota reservations for this owner, including simultaneous uploads.
            var quotaLock = BitConverter.ToInt64(quotaOwner.ToByteArray(), 0);
            await db.Database.ExecuteSqlInterpolatedAsync($"SELECT pg_advisory_xact_lock({quotaLock})", ct);
            if (await db.Artifacts.AnyAsync(a => a.Id == id, ct)) return true; // A committed reservation retried after a lost acknowledgement.
            var used = await db.Artifacts.Where(a => a.OwnerUserId == quotaOwner && a.State != "Deleted")
                .SumAsync(a => (long?)a.SizeBytes, ct) ?? 0;
            if (length > settings.OwnerQuotaBytes - used) throw new ArtifactException(409, "Your artifact storage quota would be exceeded.");
            var now = await DatabaseNowAsync(ct);
            db.Contents.Add(new Content
            {
                Id = contentId, ContentType = ContentType.Artifact, ContentRefId = id,
                Title = title, Slug = $"artifact-{id:N}", IsPublished = false, CreatedAt = now,
                Description = "Private shared artifact", SearchBody = title
            });
            db.Artifacts.Add(new Artifact
            {
                Id = id, ContentId = contentId, OwnerUserId = quotaOwner, Title = title,
                PrivateNote = NormalizeNote(note), OriginalFileName = filename, StorageKey = key,
                MediaType = mediaType, SizeBytes = length, State = "Uploading", CreatedAt = now
            });
            db.ContentAuthors.Add(new ContentAuthor { Id = Guid.NewGuid(), ContentId = contentId, UserId = actor.UserId!.Value, Order = 0, CreatedAt = now });
            return true;
        }, ct);
        try
        {
            await storage.UploadAsync(key, stream, ct);
            await TransactionAsync(async () =>
            {
                var a = await LockArtifactAsync(id, false, ct);
                if (a.State == completedState) return true; // Transition may already have committed on a retry.
                if (a.State != "Uploading") throw NotFound();
                a.State = completedState;
                a.UpdatedAt = await DatabaseNowAsync(ct);
                if (completedState == "Ready") Audit("ArtifactUploaded", id);
                return true;
            }, ct);
        }
        catch
        {
            // Keep a durable deletion marker even if the client disconnected.
            try { await MarkFailedUploadAsync(id); }
            catch (Exception ex) { logger.LogWarning(ex, "Artifact upload cleanup queued for {ArtifactId}", id); }
            throw;
        }
        return id;
    }

    public async Task<ArtifactDetailResponse> ReplaceAsync(Guid id, Stream stream, string filename, string mediaType, long length, CancellationToken ct)
    {
        var original = await ManagedQuery().AsNoTracking().SingleOrDefaultAsync(a => a.Id == id, ct) ?? throw NotFound();
        // Hidden staging records reuse upload reservation and durable deletion recovery. The live
        // artifact keeps serving its original file until the entire replacement has uploaded.
        var stagedId = await UploadNewAsync(stream, filename, mediaType, length, original.Title, null,
            original.OwnerUserId ?? actor.UserId!.Value, "ReplacementReady", ct);
        try
        {
            var replacementKey = await db.Artifacts.AsNoTracking().Where(a => a.Id == stagedId)
                .Select(a => a.StorageKey).SingleAsync(ct);
            await TransactionAsync(async () =>
            {
                var current = await LockArtifactAsync(id, true, ct);
                if (current.StorageKey == replacementKey)
                    return true; // The atomic swap already committed before a lost acknowledgement.
                var staged = await LockArtifactAsync(stagedId, false, ct);
                if (staged.State != "ReplacementReady" || current.StorageKey != original.StorageKey)
                    throw new ArtifactException(409, "This artifact changed during the upload. Refresh and try again.");

                var now = await DatabaseNowAsync(ct);
                // StorageKey is unique. Move the staging row aside before assigning its key to
                // the live artifact, then let staging own the old blob. All three updates commit
                // together, and no reader can see the temporary key outside this transaction.
                var temporaryKey = $"artifacts/swap/{Guid.NewGuid():N}";
                await db.Artifacts.Where(a => a.Id == stagedId)
                    .ExecuteUpdateAsync(s => s.SetProperty(a => a.StorageKey, temporaryKey), ct);
                await db.Artifacts.Where(a => a.Id == id).ExecuteUpdateAsync(s => s
                    .SetProperty(a => a.StorageKey, replacementKey)
                    .SetProperty(a => a.OriginalFileName, staged.OriginalFileName)
                    .SetProperty(a => a.MediaType, staged.MediaType)
                    .SetProperty(a => a.SizeBytes, staged.SizeBytes)
                    .SetProperty(a => a.UpdatedAt, now), ct);
                await db.Artifacts.Where(a => a.Id == stagedId).ExecuteUpdateAsync(s => s
                    .SetProperty(a => a.StorageKey, current.StorageKey)
                    .SetProperty(a => a.OriginalFileName, current.OriginalFileName)
                    .SetProperty(a => a.MediaType, current.MediaType)
                    .SetProperty(a => a.SizeBytes, current.SizeBytes)
                    .SetProperty(a => a.State, "DeletionPending")
                    .SetProperty(a => a.DeletedAt, now)
                    .SetProperty(a => a.UpdatedAt, now), ct);

                // A resumed range request must never combine bytes from two different files.
                // Links and their counters remain intact; existing sessions must restart.
                await db.ArtifactDownloadGrants.Where(g => g.Link.ArtifactId == id).ExecuteDeleteAsync(ct);
                await TouchContentAsync(current.ContentId, now, ct);
                Audit("ArtifactReplaced", id);
                return true;
            }, ct);
        }
        catch
        {
            // Before a swap this disposes of the failed new file; after a committed swap the
            // staging record owns only the old file, so recovery cannot delete the live file.
            try
            {
                await MarkFailedUploadAsync(stagedId);
                await DeleteStoredArtifactAsync(stagedId, CancellationToken.None);
            }
            catch (Exception ex) { logger.LogWarning(ex, "Artifact replacement cleanup queued for {ArtifactId}", id); }
            throw;
        }
        try { await DeleteStoredArtifactAsync(stagedId, CancellationToken.None); }
        catch (Exception ex) { logger.LogWarning(ex, "Old artifact file cleanup pending for {ArtifactId}", id); }
        return await GetAsync(id, ct);
    }

    public async Task<ArtifactManagerDownload> OpenManagerDownloadAsync(Guid id, CancellationToken ct)
    {
        var artifact = await ManagedQuery().AsNoTracking().SingleOrDefaultAsync(a => a.Id == id, ct) ?? throw NotFound();
        if (!await storage.ExistsAsync(artifact.StorageKey, ct)) throw NotFound();
        var stream = await storage.OpenReadAsync(artifact.StorageKey, ct);
        try
        {
            if (!await ManagedQuery().AnyAsync(a => a.Id == id && a.StorageKey == artifact.StorageKey, ct))
                throw new ArtifactException(409, "This artifact changed. Please try the download again.");
            Audit("ArtifactManagerDownloaded", id);
            await db.SaveChangesAsync(ct);
            return new(stream, artifact.OriginalFileName);
        }
        catch { await stream.DisposeAsync(); throw; }
    }

    public async Task<ArtifactDetailResponse> UpdateAsync(Guid id, ArtifactUpdateRequest request, CancellationToken ct)
    {
        RequireManager();
        ValidateText(request.Title, request.PrivateNote);
        await TransactionAsync(async () =>
        {
            var a = await LockArtifactAsync(id, true, ct);
            a.Title = request.Title.Trim();
            a.PrivateNote = NormalizeNote(request.PrivateNote);
            a.UpdatedAt = await DatabaseNowAsync(ct);
            var content = await db.Contents.SingleAsync(c => c.Id == a.ContentId, ct);
            content.Title = a.Title;
            content.SearchBody = a.Title;
            content.IsPublished = false;
            content.UpdatedAt = a.UpdatedAt;
            Audit("ArtifactUpdated", id);
            return true;
        }, ct);
        return await GetAsync(id, ct);
    }

    public async Task DeleteAsync(Guid id, CancellationToken ct)
    {
        RequireManager();
        await TransactionAsync(async () =>
        {
            var a = await LockArtifactAsync(id, true, ct);
            a.State = "DeletionPending";
            a.DeletedAt = a.UpdatedAt = await DatabaseNowAsync(ct);
            var content = await db.Contents.SingleAsync(c => c.Id == a.ContentId, ct);
            content.IsPublished = false;
            content.UpdatedAt = a.UpdatedAt;
            Audit("ArtifactDeleted", id);
            return true;
        }, ct);
        // The recurring cleanup job retries failed physical deletions.
        try { await DeleteStoredArtifactAsync(id, CancellationToken.None); }
        catch (Exception ex) { logger.LogWarning(ex, "Artifact storage deletion pending for {ArtifactId}", id); }
    }

    public async Task<ArtifactCreatedLinkResponse> CreateLinkAsync(Guid id, ArtifactLinkSettingsRequest request, CancellationToken ct)
    {
        RequireManager();
        var token = NewToken();
        var linkId = Guid.NewGuid();
        var result = await TransactionAsync(async () =>
        {
            var a = await LockArtifactAsync(id, true, ct);
            var now = await DatabaseNowAsync(ct);
            ValidateSettings(request, now);
            var previous = await db.ArtifactShareLinks.SingleOrDefaultAsync(l => l.Id == linkId, ct);
            if (previous is not null) return MapLink(previous, now);
            var link = new ArtifactShareLink
            {
                Id = linkId, ArtifactId = id, CreatedByUserId = actor.UserId, TokenHash = Hash(token),
                ExpiresAt = request.ExpiresAt?.ToUniversalTime(), MaxDownloads = request.MaxDownloads, CreatedAt = now
            };
            db.ArtifactShareLinks.Add(link);
            a.UpdatedAt = now;
            await TouchContentAsync(a.ContentId, now, ct);
            Audit("ArtifactLinkCreated", id, linkId);
            return MapLink(link, now);
        }, ct);
        return new(result, token);
    }

    public async Task UpdateLinkAsync(Guid id, Guid linkId, ArtifactLinkSettingsRequest request, CancellationToken ct)
    {
        RequireManager();
        await TransactionAsync(async () =>
        {
            var a = await LockArtifactAsync(id, true, ct);
            var link = await LockLinkAsync(linkId, id, ct);
            var now = await DatabaseNowAsync(ct);
            ValidateSettings(request, now);
            if (link.RevokedAt.HasValue) throw new ArtifactException(409, "Revoked links cannot be reactivated. Create a new link.");
            link.ExpiresAt = request.ExpiresAt?.ToUniversalTime();
            link.MaxDownloads = request.MaxDownloads;
            link.UpdatedAt = a.UpdatedAt = now;
            await TouchContentAsync(a.ContentId, now, ct);
            Audit("ArtifactLinkUpdated", id, linkId);
            return true;
        }, ct);
    }

    public async Task RevokeLinkAsync(Guid id, Guid linkId, CancellationToken ct)
    {
        RequireManager();
        await TransactionAsync(async () =>
        {
            var a = await LockArtifactAsync(id, true, ct);
            var link = await LockLinkAsync(linkId, id, ct);
            var now = await DatabaseNowAsync(ct);
            link.RevokedAt ??= now;
            link.UpdatedAt = a.UpdatedAt = now;
            await TouchContentAsync(a.ContentId, now, ct);
            Audit("ArtifactLinkRevoked", id, linkId);
            return true;
        }, ct);
    }

    public async Task DeleteLinkAsync(Guid id, Guid linkId, CancellationToken ct)
    {
        RequireManager();
        await TransactionAsync(async () =>
        {
            var a = await LockArtifactAsync(id, true, ct);
            var link = await LockLinkAsync(linkId, id, ct);
            if (!link.RevokedAt.HasValue)
                throw new ArtifactException(409, "Revoke the share link before permanently deleting it.");

            // The database cascades this deletion to every grant, including encrypted retry tokens.
            db.ArtifactShareLinks.Remove(link);
            a.UpdatedAt = await DatabaseNowAsync(ct);
            await TouchContentAsync(a.ContentId, a.UpdatedAt.Value, ct);
            Audit("ArtifactLinkDeleted", id, linkId);
            return true;
        }, ct);
    }

    public async Task<ArtifactPublicResponse> GetShareAsync(string token, CancellationToken ct)
    {
        var hash = HashValidToken(token);
        var link = await db.ArtifactShareLinks.AsNoTracking().Include(l => l.Artifact)
            .SingleOrDefaultAsync(l => l.TokenHash == hash, ct) ?? throw NotFound();
        CheckAvailable(link, await DatabaseNowAsync(ct), true);
        return new(link.Artifact.Title, link.Artifact.OriginalFileName, link.Artifact.SizeBytes, link.ExpiresAt,
            link.MaxDownloads.HasValue ? Math.Max(0, link.MaxDownloads.Value - link.DownloadCount) : null);
    }

    public async Task<ArtifactRedeemResponse> RedeemAsync(string token, Guid idempotencyKey, CancellationToken ct)
    {
        if (idempotencyKey == Guid.Empty) throw new ArtifactException(400, "A download request ID is required.");
        var hash = HashValidToken(token);
        var reference = await db.ArtifactShareLinks.AsNoTracking().Where(l => l.TokenHash == hash)
            .Select(l => new { l.Id, l.ArtifactId, l.Artifact.StorageKey }).SingleOrDefaultAsync(ct) ?? throw NotFound();
        if (!await storage.ExistsAsync(reference.StorageKey, ct)) throw NotFound();
        return await TransactionAsync(async () =>
        {
            var a = await LockArtifactAsync(reference.ArtifactId, false, ct);
            var link = await LockLinkAsync(reference.Id, a.Id, ct);
            link.Artifact = a;
            var now = await DatabaseNowAsync(ct);
            CheckAvailable(link, now, false);
            var existing = await db.ArtifactDownloadGrants.SingleOrDefaultAsync(g => g.ArtifactShareLinkId == link.Id && g.IdempotencyKey == idempotencyKey, ct);
            if (existing is not null)
            {
                if (existing.ExpiresAt <= now) throw new ArtifactException(410, "This download session has expired. Start a new download.");
                return new ArtifactRedeemResponse(protector.Unprotect(existing.ProtectedToken), Min(existing.ExpiresAt, link.ExpiresAt));
            }
            CheckAvailable(link, now, true);
            var grantToken = NewToken();
            var expires = Min(now.AddMinutes(settings.GrantLifetimeMinutes), link.ExpiresAt);
            db.ArtifactDownloadGrants.Add(new ArtifactDownloadGrant
            {
                Id = Guid.NewGuid(), ArtifactShareLinkId = link.Id, TokenHash = Hash(grantToken),
                ProtectedToken = protector.Protect(grantToken), IdempotencyKey = idempotencyKey,
                CreatedAt = now, ExpiresAt = expires
            });
            link.DownloadCount++;
            link.UpdatedAt = a.UpdatedAt = now;
            var content = await db.Contents.SingleAsync(c => c.Id == a.ContentId, ct);
            content.UpdatedAt = now;
            Audit("ArtifactDownloadRedeemed", a.Id, link.Id, anonymous: true);
            return new ArtifactRedeemResponse(grantToken, expires);
        }, ct);
    }

    public async Task<ArtifactDownload> OpenDownloadAsync(string token, CancellationToken ct)
    {
        var hash = HashValidToken(token);
        var reference = await db.ArtifactDownloadGrants.AsNoTracking().Where(g => g.TokenHash == hash)
            .Select(g => new { g.Id, g.ArtifactShareLinkId, g.Link.ArtifactId }).SingleOrDefaultAsync(ct) ?? throw NotFound();
        // Open before reserving a stream; failures do not leave an active-stream lease.
        var storageKey = await db.Artifacts.Where(a => a.Id == reference.ArtifactId).Select(a => a.StorageKey).SingleOrDefaultAsync(ct)
            ?? throw NotFound();
        if (!await storage.ExistsAsync(storageKey, ct)) throw NotFound();
        var stream = await storage.OpenReadAsync(storageKey, ct);
        try
        {
            return await TransactionAsync(async () =>
            {
                var a = await LockArtifactAsync(reference.ArtifactId, false, ct);
                var link = await LockLinkAsync(reference.ArtifactShareLinkId, a.Id, ct);
                link.Artifact = a;
                var now = await DatabaseNowAsync(ct);
                CheckAvailable(link, now, false);
                var grant = (await db.ArtifactDownloadGrants.FromSqlInterpolated($"SELECT * FROM \"ArtifactDownloadGrants\" WHERE \"Id\" = {reference.Id} FOR UPDATE")
                    .ToListAsync(ct)).SingleOrDefault() ?? throw NotFound();
                if (grant.ExpiresAt <= now) throw Gone();
                if (grant.ActiveStreams >= 2) throw new ArtifactException(429, "This download already has active transfers. Try again shortly.");
                grant.ActiveStreams++;
                return new ArtifactDownload(grant.Id, stream, a.OriginalFileName, a.SizeBytes);
            }, ct);
        }
        catch { await stream.DisposeAsync(); throw; }
    }

    public Task ReleaseDownloadAsync(Guid grantId) => db.ArtifactDownloadGrants
        .Where(g => g.Id == grantId && g.ActiveStreams > 0)
        .ExecuteUpdateAsync(s => s.SetProperty(g => g.ActiveStreams, g => g.ActiveStreams - 1));

    public async Task CleanupAsync(CancellationToken ct)
    {
        var now = await DatabaseNowAsync(ct);
        await db.ArtifactDownloadGrants.Where(g => g.ExpiresAt < now.AddDays(-1)).ExecuteDeleteAsync(ct);
        await db.AuditLogs.Where(a => a.Action.StartsWith("Artifact") && a.At < now.AddDays(-90)).ExecuteDeleteAsync(ct);
        var stale = await db.Artifacts.AsNoTracking().Where(a => (a.State == "Uploading" || a.State == "ReplacementReady") && a.CreatedAt < now.AddHours(-2))
            .OrderBy(a => a.CreatedAt).Select(a => a.Id).Take(100).ToListAsync(ct);
        foreach (var id in stale) await MarkFailedUploadAsync(id);
        // Include legacy tombstones left by the earlier soft-deletion implementation.
        var pending = await db.Artifacts.AsNoTracking().Where(a => a.State == "DeletionPending" || a.State == "Deleted")
            .OrderBy(a => a.CreatedAt).Select(a => a.Id).Take(100).ToListAsync(ct);
        foreach (var id in pending)
        {
            try { await DeleteStoredArtifactAsync(id, ct); }
            catch (Exception ex) when (!ct.IsCancellationRequested) { logger.LogWarning(ex, "Retrying artifact deletion for {ArtifactId}", id); }
        }
    }

    private async Task MarkFailedUploadAsync(Guid id)
    {
        await TransactionAsync(async () =>
        {
            var a = (await db.Artifacts.FromSqlInterpolated($"SELECT * FROM \"Artifacts\" WHERE \"Id\" = {id} FOR UPDATE")
                .ToListAsync(CancellationToken.None)).SingleOrDefault();
            if (a is null) return true;
            if (a.State != "Ready") { a.State = "DeletionPending"; a.DeletedAt = DateTimeOffset.UtcNow; }
            return true;
        }, CancellationToken.None);
    }

    private async Task DeleteStoredArtifactAsync(Guid id, CancellationToken ct)
    {
        var key = await db.Artifacts.AsNoTracking().Where(a => a.Id == id && (a.State == "DeletionPending" || a.State == "Deleted"))
            .Select(a => a.StorageKey).SingleOrDefaultAsync(ct);
        if (key is null) return;
        // Keep the storage key durably available until the blob has actually been removed.
        await storage.DeleteAsync(key, ct);
        await TransactionAsync(async () =>
        {
            var artifact = (await db.Artifacts.FromSqlInterpolated($"SELECT * FROM \"Artifacts\" WHERE \"Id\" = {id} FOR UPDATE")
                .ToListAsync(ct)).SingleOrDefault();
            if (artifact is null) return true; // Another cleanup worker already completed the deletion.
            if (artifact.State is not ("DeletionPending" or "Deleted"))
                throw new InvalidOperationException("Only deleted artifacts may be purged.");

            // Artifact -> links -> grants is a database cascade. Content is the principal of
            // the restrictive Artifact FK, so remove the Artifact before deleting its Content.
            await db.Artifacts.Where(a => a.Id == id).ExecuteDeleteAsync(ct);
            await db.Contents.Where(c => c.Id == artifact.ContentId).ExecuteDeleteAsync(ct);
            // Content -> authors, comments/replies, likes and views cascade in the same transaction.
            return true;
        }, ct);
    }

    private async Task<T> TransactionAsync<T>(Func<Task<T>> action, CancellationToken ct)
    {
        return await db.Database.CreateExecutionStrategy().ExecuteAsync(async () =>
        {
            db.ChangeTracker.Clear();
            await using var transaction = await db.Database.BeginTransactionAsync(ct);
            var result = await action();
            await db.SaveChangesAsync(ct);
            await transaction.CommitAsync(ct);
            return result;
        });
    }

    private async Task<Artifact> LockArtifactAsync(Guid id, bool management, CancellationToken ct)
    {
        var a = (await db.Artifacts.FromSqlInterpolated($"SELECT * FROM \"Artifacts\" WHERE \"Id\" = {id} FOR UPDATE")
            .ToListAsync(ct)).SingleOrDefault() ?? throw NotFound();
        if (management && (a.State != "Ready" || (!actor.IsAdmin && a.OwnerUserId != actor.UserId))) throw NotFound();
        return a;
    }

    private async Task<ArtifactShareLink> LockLinkAsync(Guid id, Guid artifactId, CancellationToken ct) =>
        (await db.ArtifactShareLinks.FromSqlInterpolated($"SELECT * FROM \"ArtifactShareLinks\" WHERE \"Id\" = {id} AND \"ArtifactId\" = {artifactId} FOR UPDATE")
            .ToListAsync(ct)).SingleOrDefault() ?? throw NotFound();

    private async Task<DateTimeOffset> DatabaseNowAsync(CancellationToken ct) =>
        await db.Database.SqlQuery<DateTimeOffset>($"SELECT clock_timestamp() AS \"Value\"").SingleAsync(ct);

    private async Task TouchContentAsync(Guid id, DateTimeOffset now, CancellationToken ct)
    {
        var content = await db.Contents.SingleAsync(c => c.Id == id, ct);
        content.UpdatedAt = now;
    }

    private void Audit(string action, Guid artifactId, Guid? linkId = null, bool anonymous = false) => db.AuditLogs.Add(new AuditLog
    {
        Id = Guid.NewGuid(), UserId = anonymous ? null : actor.UserId, Action = action, At = DateTimeOffset.UtcNow,
        Metadata = JsonSerializer.Serialize(new { artifactId, linkId })
    });

    private static ArtifactListItemResponse Map(Artifact a, DateTimeOffset now) => new(a.Id, a.ContentId, a.Title,
        a.OriginalFileName, a.MediaType, a.SizeBytes, a.OwnerUserId, a.OwnerUser?.DisplayName ?? a.OwnerUser?.Username,
        a.CreatedAt, a.UpdatedAt, a.Links.Count(l => Status(l, now) == "Active"), a.Links.Sum(l => l.DownloadCount));
    private static ArtifactLinkResponse MapLink(ArtifactShareLink l, DateTimeOffset now) => new(l.Id, l.ExpiresAt,
        l.MaxDownloads, l.DownloadCount, l.RevokedAt, l.CreatedAt, Status(l, now));
    private static string Status(ArtifactShareLink l, DateTimeOffset now) => l.RevokedAt.HasValue ? "Revoked" :
        l.ExpiresAt <= now ? "Expired" : l.MaxDownloads.HasValue && l.DownloadCount >= l.MaxDownloads ? "Limit reached" : "Active";
    private static void CheckAvailable(ArtifactShareLink l, DateTimeOffset now, bool checkCount)
    {
        if (l.Artifact.State != "Ready" || l.RevokedAt.HasValue || l.ExpiresAt <= now ||
            (checkCount && l.MaxDownloads.HasValue && l.DownloadCount >= l.MaxDownloads)) throw Gone();
    }
    private static void ValidateSettings(ArtifactLinkSettingsRequest r, DateTimeOffset now)
    {
        if (r.MaxDownloads is <= 0) throw new ArtifactException(400, "Allowed downloads must be a positive integer or unlimited.");
        if (r.ExpiresAt <= now) throw new ArtifactException(400, "Choose a future expiry or no expiry.");
    }
    private static void ValidateText(string title, string? note)
    {
        if (string.IsNullOrWhiteSpace(title) || title.Trim().Length > 200 || note?.Length > 4000)
            throw new ArtifactException(400, "Use a title of 1–200 characters and a note of at most 4000 characters.");
    }
    private static string? NormalizeNote(string? note) => string.IsNullOrWhiteSpace(note) ? null : note.Trim();
    private static string SafeFileName(string name)
    {
        name = name.Replace('\\', '/').Split('/').Last();
        name = new string(name.Where(c => !char.IsControl(c)).ToArray()).Trim();
        if (string.IsNullOrWhiteSpace(name) || name is "." or "..") name = "artifact.bin";
        return name.Length > 180 ? name[..180] : name;
    }
    private static string NewToken() => Convert.ToBase64String(RandomNumberGenerator.GetBytes(32)).TrimEnd('=').Replace('+', '-').Replace('/', '_');
    private static string Hash(string token) => Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(token)));
    private static string HashValidToken(string token)
    {
        if (token.Length != 43 || token.Any(c => !char.IsAsciiLetterOrDigit(c) && c != '-' && c != '_')) throw NotFound();
        return Hash(token);
    }
    private static DateTimeOffset Min(DateTimeOffset a, DateTimeOffset? b) => b.HasValue && b.Value < a ? b.Value : a;
    private static ArtifactException NotFound() => new(404, "Artifact not found.");
    private static ArtifactException Gone() => new(410, "This link is no longer available.");
}
