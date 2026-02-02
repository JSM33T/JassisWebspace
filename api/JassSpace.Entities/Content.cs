using JassSpace.Entities.Enums;

namespace JassSpace.Entities;

public class Content
{
    public Guid Id { get; set; }
    public ContentType ContentType { get; set; }
    public Guid ContentRefId { get; set; }
    public required string Title { get; set; }
    public required string Slug { get; set; }
    public bool IsPublished { get; set; }
    public DateTimeOffset? PublishedAt { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset? UpdatedAt { get; set; }
}
