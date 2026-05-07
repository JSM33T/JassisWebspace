namespace JassSpace.Entities;

public class Track
{
    public Guid Id { get; set; }
    public required string Title { get; set; }
    public required string Slug { get; set; }
    public required string Description { get; set; }
    public required string Category { get; set; }
    public string? Duration { get; set; }
    public DateTimeOffset ReleaseDate { get; set; }
    public string? Genre { get; set; }
    public string[] Tags { get; set; } = [];
    public string? Cover { get; set; }
    public bool Featured { get; set; }
    public bool IsPublished { get; set; }
    public DateTimeOffset? PublishedAt { get; set; }
    public Guid? BootlegAssetId { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset? UpdatedAt { get; set; }

    // Navigation properties
    public BootlegAsset? BootlegAsset { get; set; }
    public ICollection<TrackLink> Links { get; set; } = new List<TrackLink>();
}
