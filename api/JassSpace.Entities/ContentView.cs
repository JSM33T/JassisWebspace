namespace JassSpace.Entities;

public class ContentView
{
    public Guid Id { get; set; }
    public Guid ContentId { get; set; }
    public DateTimeOffset ViewedAt { get; set; }

    public Content Content { get; set; } = null!;
}
