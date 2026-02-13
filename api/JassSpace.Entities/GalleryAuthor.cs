namespace JassSpace.Entities;

public class GalleryAuthor
{
    public Guid Id { get; set; }
    public Guid AlbumId { get; set; }
    public Guid UserId { get; set; }
    public int Order { get; set; } = 0;
    public DateTimeOffset CreatedAt { get; set; }

    // Navigation properties
    public Album Album { get; set; } = null!;
    public User User { get; set; } = null!;
}
