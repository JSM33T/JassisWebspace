using JassSpace.Entities.Enums;
using NpgsqlTypes;

namespace JassSpace.Entities;

public class Content
{
    public Guid Id { get; set; }
    public ContentType ContentType { get; set; }
    public Guid ContentRefId { get; set; }
    public required string Title { get; set; }
    public required string Slug { get; set; }
    public string? Description { get; set; }
    public bool IsPublished { get; set; }
    public DateTimeOffset? PublishedAt { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset? UpdatedAt { get; set; }

    // Populated by domain services (excerpt, description, tags) to enrich full-text search.
    public string? SearchBody { get; set; }

    // Stored generated column: to_tsvector('english', title || ' ' || coalesce(search_body,''))
    // Maintained automatically by Postgres on every INSERT/UPDATE.
    public NpgsqlTsVector SearchVector { get; set; } = null!;
}
