namespace JassSpace.Entities;

public class BlogCategory
{
    public Guid Id { get; set; }
    public required string Name { get; set; }
    public required string Slug { get; set; }
    public string? Description { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset? UpdatedAt { get; set; }

    // Navigation properties
    public ICollection<Blog> Blogs { get; set; } = new List<Blog>();
}
