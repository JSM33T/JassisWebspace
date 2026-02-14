namespace JassSpace.Entities;

public class TrackLink
{
    public Guid Id { get; set; }
    public Guid TrackId { get; set; }
    public required string Type { get; set; }
    public required string Url { get; set; }
    public required string Label { get; set; }
    public int Order { get; set; } = 0;
    public DateTimeOffset CreatedAt { get; set; }

    // Navigation properties
    public Track Track { get; set; } = null!;
}
