# Global Search — Implementation Plan

PostgreSQL full-text search across `Content` (the existing central hub for Album, Blog, Music).

---

## Why `Content` is the right anchor

`Content` already has `ContentType`, `ContentRefId`, `Title`, `Slug`, `IsPublished`, `PublishedAt`.
Adding a `tsvector` column here gives one indexed table to query regardless of content type.

---

## Phase 1 — Entity & Schema (`JassSpace.Entities` + `JassSpace.Data`)

### 1.1  Add two columns to `Content.cs`

```csharp
// Optional rich body text (blog excerpt, track description, album description).
// Populated by each domain service on create/update.
public string? SearchBody { get; set; }

// Generated tsvector: maintained by a Postgres stored generated column.
public NpgsqlTsVector SearchVector { get; set; } = null!;
```

### 1.2  Configure in `JassSpaceDbContext.ConfigureContentEntity`

```csharp
entity.Property(e => e.SearchVector)
      .HasColumnType("tsvector")
      .HasComputedColumnSql(
          "to_tsvector('english', coalesce(title,'') || ' ' || coalesce(search_body,''))",
          stored: true);

entity.HasIndex(e => e.SearchVector)
      .HasMethod("GIN");
```

The `stored: true` makes Postgres recompute the vector automatically on every INSERT/UPDATE —
no triggers or application-side bookkeeping needed.

### 1.3  Migration

```
dotnet ef migrations add AddContentSearchVector --project JassSpace.Data --startup-project JassSpace.Api
```

Expected diff:
- `search_body text NULL`
- `search_vector tsvector GENERATED ALWAYS AS (...) STORED`
- `CREATE INDEX ix_contents_search_vector ON "Contents" USING GIN (search_vector)`

---

## Phase 2 — Contracts (`JassSpace.Contracts`)

### 2.1  Request — `Requests/SearchRequest.cs`

```csharp
public sealed record SearchRequest(
    string Query,
    ContentType[]? Types,   // null → all types
    int Page = 1,
    int PageSize = 20
);
```

### 2.2  Response — `Responses/SearchResponses.cs`

```csharp
public sealed record SearchResultItem(
    Guid ContentId,
    Guid ContentRefId,
    ContentType ContentType,
    string Title,
    string Slug,
    string? Headline,       // ts_headline snippet
    float Rank,
    DateTimeOffset? PublishedAt
);

public sealed record SearchResponse(
    IReadOnlyList<SearchResultItem> Items,
    long Total,
    int Page,
    int PageSize
);
```

### 2.3  Repository interface — `Interfaces/ISearchRepository.cs`

```csharp
public interface ISearchRepository
{
    Task<(IReadOnlyList<SearchResultItem> Items, long Total)> SearchAsync(
        SearchRequest request,
        CancellationToken cancellationToken = default);
}
```

### 2.4  Service interface — `Interfaces/ISearchService.cs`

```csharp
public interface ISearchService
{
    Task<SearchResponse> SearchAsync(
        SearchRequest request,
        CancellationToken cancellationToken = default);
}
```

---

## Phase 3 — Repository (`JassSpace.Repositories/SearchRepository.cs`)

Use `EF.Functions.WebSearchToTsQuery` (Npgsql maps to `websearch_to_tsquery`) and `EF.Functions.TsRank`.

```csharp
public sealed class SearchRepository(JassSpaceDbContext db) : ISearchRepository
{
    public async Task<(IReadOnlyList<SearchResultItem> Items, long Total)> SearchAsync(
        SearchRequest request, CancellationToken cancellationToken = default)
    {
        var q = EF.Functions.WebSearchToTsQuery("english", request.Query);

        var query = db.Contents
            .AsNoTracking()
            .Where(c => c.IsPublished && c.SearchVector.Matches(q));

        if (request.Types is { Length: > 0 })
            query = query.Where(c => request.Types.Contains(c.ContentType));

        var total = await query.LongCountAsync(cancellationToken);

        var items = await query
            .OrderByDescending(c => EF.Functions.TsRank(c.SearchVector, q))
            .ThenByDescending(c => c.PublishedAt)
            .Skip((request.Page - 1) * request.PageSize)
            .Take(request.PageSize)
            .Select(c => new SearchResultItem(
                c.Id,
                c.ContentRefId,
                c.ContentType,
                c.Title,
                c.Slug,
                EF.Functions.TsHeadline("english", c.Title + " " + (c.SearchBody ?? ""), q,
                    "MaxFragments=1,MaxWords=20,MinWords=5"),
                EF.Functions.TsRank(c.SearchVector, q),
                c.PublishedAt
            ))
            .ToListAsync(cancellationToken);

        return (items, total);
    }
}
```

Key notes:
- `Matches` maps to the `@@` operator.
- `WebSearchToTsQuery` accepts natural language input (e.g. `"jazz guitar"` → `'jazz' & 'guitar'`).
- `TsHeadline` returns a highlighted snippet for the UI.
- `TsRank` scores relevance — used for ordering and surfaced in the response for client-side use.

---

## Phase 4 — Service (`JassSpace.Services/SearchService.cs`)

Thin pass-through (validation + input guard lives here, business logic stays in the repo):

```csharp
public sealed class SearchService(ISearchRepository repo) : ISearchService
{
    public async Task<SearchResponse> SearchAsync(
        SearchRequest request, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.Query))
            return new SearchResponse([], 0, request.Page, request.PageSize);

        var (items, total) = await repo.SearchAsync(request, cancellationToken);
        return new SearchResponse(items, total, request.Page, request.PageSize);
    }
}
```

---

## Phase 5 — Controller (`JassSpace.Api/Controllers/SearchController.cs`)

```
GET /search?q=jazz&types=Music,Blog&page=1&pageSize=20
```

```csharp
[Route("search")]
public sealed class SearchController(
    ILogger<SearchController> logger,
    ISearchService searchService)
    : BaseApiController
{
    [HttpGet]
    [ProducesResponseType(typeof(ApiResponse<SearchResponse>), StatusCodes.Status200OK)]
    public async Task<IActionResult> Search(
        [FromQuery] string q,
        [FromQuery] ContentType[]? types,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var result = await searchService.SearchAsync(
                new SearchRequest(q, types, page, pageSize), cancellationToken);

            return OkEnvelope(result);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Search failed for query {Query}", q);
            return Problem(StatusCodes.Status500InternalServerError,
                "Search failed", "An unexpected error occurred.");
        }
    }
}
```

---

## Phase 6 — DI Registration

In whichever extension method registers repositories/services (e.g. `ServiceExtensions.cs`):

```csharp
services.AddScoped<ISearchRepository, SearchRepository>();
services.AddScoped<ISearchService, SearchService>();
```

---

## Phase 7 — Keeping `SearchBody` populated

Each domain service (`IBlogService`, `IGalleryService`, `IMusicService`) should set
`Content.SearchBody` when creating or updating the linked content row:

| ContentType | SearchBody source |
|---|---|
| Blog | `blog.Excerpt ?? blog.Body[..500]` |
| Album | `album.Description` |
| Music | `track.Description + " " + string.Join(" ", track.Tags)` |
| Video | `video.Description` |

This requires no schema change — the existing `UpdatedAt` + trigger-free generated column handles
re-indexing automatically.

---

## Summary of files to create / modify

| File | Action |
|---|---|
| `JassSpace.Entities/Content.cs` | Add `SearchBody`, `SearchVector` |
| `JassSpace.Data/JassSpaceDbContext.cs` | Configure generated column + GIN index |
| `JassSpace.Data/Migrations/…AddContentSearchVector.cs` | New migration |
| `JassSpace.Contracts/Requests/SearchRequest.cs` | New |
| `JassSpace.Contracts/Responses/SearchResponses.cs` | New |
| `JassSpace.Contracts/Interfaces/ISearchRepository.cs` | New |
| `JassSpace.Contracts/Interfaces/ISearchService.cs` | New |
| `JassSpace.Repositories/SearchRepository.cs` | New |
| `JassSpace.Services/SearchService.cs` | New |
| `JassSpace.Api/Controllers/SearchController.cs` | New |
| DI extension (ServiceExtensions or similar) | Register scoped impls |
| Blog/Gallery/Music services | Set `SearchBody` on content upsert |
