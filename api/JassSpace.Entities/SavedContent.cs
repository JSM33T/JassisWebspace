namespace JassSpace.Entities;

public class SavedContent
{
    public Guid UserId { get; set; }
    public Guid ContentId { get; set; }
    public DateTimeOffset CreatedAt { get; set; }

    public User User { get; set; } = null!;
    public Content Content { get; set; } = null!;
}
