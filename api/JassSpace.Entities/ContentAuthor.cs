namespace JassSpace.Entities;

public class ContentAuthor
{
    public Guid Id { get; set; }
    public Guid ContentId { get; set; }
    public Guid UserId { get; set; }
    public string? Role { get; set; }
    public int Order { get; set; } = 0;
    public DateTimeOffset CreatedAt { get; set; }

    public Content Content { get; set; } = null!;
    public User User { get; set; } = null!;
}
