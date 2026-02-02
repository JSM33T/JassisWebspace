namespace JassSpace.Entities;

public class Image
{
    public Guid Id { get; set; }
    public Guid AlbumId { get; set; }
    public required string Url { get; set; }
    public string? Title { get; set; }
    public string? Description { get; set; }
    public int Order { get; set; }
    public DateTimeOffset CreatedAt { get; set; }

    // Navigation properties
    public Album Album { get; set; } = null!;
}
