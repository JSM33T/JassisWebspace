namespace JassSpace.Entities;

public class Blog
{
    public Guid Id { get; set; }
    public required string Title { get; set; }
    public required string Slug { get; set; }
    public string? Excerpt { get; set; }
    public required string Content { get; set; }
    public string? FeaturedImage { get; set; }
    public Guid? CategoryId { get; set; }
    public bool IsPublished { get; set; } = false;
    public DateTimeOffset? PublishedAt { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset? UpdatedAt { get; set; }

    // Navigation properties
    public BlogCategory? Category { get; set; }
}
