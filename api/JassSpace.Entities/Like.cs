namespace JassSpace.Entities;

public class Like
{
    public Guid ContentId { get; set; }
    public Guid UserId { get; set; }
    public DateTimeOffset CreatedAt { get; set; }

    // Navigation properties
    public Content Content { get; set; } = null!;
    public User User { get; set; } = null!;
}
