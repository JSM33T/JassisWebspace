namespace JassSpace.Entities;

public class TrackAuthor
{
    public Guid Id { get; set; }
    public Guid TrackId { get; set; }
    public Guid UserId { get; set; }
    public string? Role { get; set; }
    public int Order { get; set; } = 0;
    public DateTimeOffset CreatedAt { get; set; }

    // Navigation properties
    public Track Track { get; set; } = null!;
    public User User { get; set; } = null!;
}
