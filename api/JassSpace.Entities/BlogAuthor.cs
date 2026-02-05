namespace JassSpace.Entities;

public class BlogAuthor
{
    public Guid Id { get; set; }
    public Guid BlogId { get; set; }
    public Guid UserId { get; set; }
    public int Order { get; set; } = 0;
    public DateTimeOffset CreatedAt { get; set; }

    // Navigation properties
    public Blog Blog { get; set; } = null!;
    public User User { get; set; } = null!;
}
