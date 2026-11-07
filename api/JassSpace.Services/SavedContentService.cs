using JassSpace.Contracts.Interfaces;
using JassSpace.Contracts.Responses;
using JassSpace.Data;
using JassSpace.Entities;
using JassSpace.Entities.Enums;
using Microsoft.EntityFrameworkCore;

namespace JassSpace.Services;

public sealed class SavedContentService(JassSpaceDbContext db) : ISavedContentService
{
    private IQueryable<Content> VisibleContents() => db.Contents.AsNoTracking().Where(c =>
        c.IsPublished && (
            c.ContentType == ContentType.Blog && db.Blogs.Any(b => b.Id == c.ContentRefId && b.IsPublished) ||
            c.ContentType == ContentType.Album && db.Albums.Any(a => a.Id == c.ContentRefId && a.IsActive) ||
            c.ContentType == ContentType.Music && db.Tracks.Any(t => t.Id == c.ContentRefId && t.IsPublished)));

    public async Task<SavedContentStatusResponse?> SaveAsync(Guid userId, Guid contentId, CancellationToken cancellationToken)
    {
        if (!await VisibleContents().AnyAsync(c => c.Id == contentId, cancellationToken)) return null;

        var now = DateTimeOffset.UtcNow;
        if (db.Database.IsRelational())
        {
            await db.Database.ExecuteSqlInterpolatedAsync($"""
                INSERT INTO "SavedContents" ("UserId", "ContentId", "CreatedAt")
                VALUES ({userId}, {contentId}, {now})
                ON CONFLICT ("UserId", "ContentId") DO NOTHING
                """, cancellationToken);
        }
        else if (!await db.SavedContents.AnyAsync(s => s.UserId == userId && s.ContentId == contentId, cancellationToken))
        {
            db.SavedContents.Add(new SavedContent { UserId = userId, ContentId = contentId, CreatedAt = now });
            await db.SaveChangesAsync(cancellationToken);
        }

        return await GetStatusAsync(userId, contentId, cancellationToken);
    }

    public async Task<SavedContentStatusResponse> RemoveAsync(Guid userId, Guid contentId, CancellationToken cancellationToken)
    {
        var query = db.SavedContents.Where(s => s.UserId == userId && s.ContentId == contentId);
        if (db.Database.IsRelational()) await query.ExecuteDeleteAsync(cancellationToken);
        else
        {
            var saved = await query.FirstOrDefaultAsync(cancellationToken);
            if (saved is not null) { db.SavedContents.Remove(saved); await db.SaveChangesAsync(cancellationToken); }
        }
        return new SavedContentStatusResponse(contentId, false, null);
    }

    public async Task<SavedContentStatusResponse?> GetStatusAsync(Guid userId, Guid contentId, CancellationToken cancellationToken)
    {
        if (!await VisibleContents().AnyAsync(c => c.Id == contentId, cancellationToken)) return null;
        var saved = await db.SavedContents.AsNoTracking()
            .Where(s => s.UserId == userId && s.ContentId == contentId)
            .Select(s => new { s.CreatedAt })
            .FirstOrDefaultAsync(cancellationToken);
        return new SavedContentStatusResponse(contentId, saved is not null, saved?.CreatedAt);
    }

    public async Task<IReadOnlyList<SavedContentStatusResponse>> GetStatusesAsync(Guid userId, IReadOnlyList<Guid> contentIds, CancellationToken cancellationToken)
    {
        var ids = contentIds.Distinct().ToArray();
        var visible = (await VisibleContents().Where(c => ids.Contains(c.Id))
            .Select(c => c.Id).ToArrayAsync(cancellationToken)).ToHashSet();
        var saved = await db.SavedContents.AsNoTracking().Where(s => s.UserId == userId && ids.Contains(s.ContentId))
            .Select(s => new { s.ContentId, s.CreatedAt })
            .ToDictionaryAsync(s => s.ContentId, cancellationToken);
        return ids.Select(id => visible.Contains(id) && saved.TryGetValue(id, out var row)
            ? new SavedContentStatusResponse(id, true, row.CreatedAt)
            : new SavedContentStatusResponse(id, false, null)).ToArray();
    }

    public async Task<SavedContentPageResponse> GetPageAsync(Guid userId, ContentType? type, int page, int pageSize, CancellationToken cancellationToken)
    {
        var visibleIds = VisibleContents().Select(c => c.Id);
        var query = db.SavedContents.AsNoTracking().Where(s => s.UserId == userId && visibleIds.Contains(s.ContentId));
        if (type.HasValue) query = query.Where(s => s.Content.ContentType == type.Value);
        var total = await query.CountAsync(cancellationToken);
        var rows = await query.OrderByDescending(s => s.CreatedAt).ThenByDescending(s => s.ContentId)
            .Skip((page - 1) * pageSize).Take(pageSize)
            .Select(s => new { s.ContentId, s.Content.ContentType, s.Content.ContentRefId, s.Content.Title,
                s.Content.Description, s.Content.Cover, s.CreatedAt })
            .ToListAsync(cancellationToken);

        var blogIds = rows.Where(r => r.ContentType == ContentType.Blog).Select(r => r.ContentRefId).ToArray();
        var albumIds = rows.Where(r => r.ContentType == ContentType.Album).Select(r => r.ContentRefId).ToArray();
        var trackIds = rows.Where(r => r.ContentType == ContentType.Music).Select(r => r.ContentRefId).ToArray();
        var blogs = await db.Blogs.AsNoTracking().Where(b => blogIds.Contains(b.Id)).Select(b => new { b.Id, b.Slug, b.FeaturedImage }).ToDictionaryAsync(b => b.Id, cancellationToken);
        var albums = await db.Albums.AsNoTracking().Where(a => albumIds.Contains(a.Id)).Select(a => new { a.Id, a.Slug, a.Cover }).ToDictionaryAsync(a => a.Id, cancellationToken);
        var tracks = await db.Tracks.AsNoTracking().Where(t => trackIds.Contains(t.Id)).Select(t => new { t.Id, t.Slug, t.Cover }).ToDictionaryAsync(t => t.Id, cancellationToken);

        var items = new List<SavedContentItemResponse>();
        foreach (var row in rows)
        {
            string href;
            string? cover;
            switch (row.ContentType)
            {
                case ContentType.Blog when blogs.TryGetValue(row.ContentRefId, out var blog):
                    href = $"/blog/{Uri.EscapeDataString(blog.Slug)}";
                    cover = blog.FeaturedImage;
                    break;
                case ContentType.Album when albums.TryGetValue(row.ContentRefId, out var album):
                    href = $"/gallery/{Uri.EscapeDataString(album.Slug)}";
                    cover = album.Cover;
                    break;
                case ContentType.Music when tracks.TryGetValue(row.ContentRefId, out var track):
                    href = $"/music/{Uri.EscapeDataString(track.Slug)}";
                    cover = track.Cover;
                    break;
                default: continue;
            }
            items.Add(new SavedContentItemResponse(row.ContentId, row.ContentType.ToString(), row.Title,
                row.Description, cover ?? row.Cover, href, row.CreatedAt));
        }
        return new SavedContentPageResponse(items, page, pageSize, total);
    }
}
