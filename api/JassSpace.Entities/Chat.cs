namespace JassSpace.Entities;

public sealed class Chat
{
    public Guid Id { get; set; }
    public required string MessagesJson { get; set; }
    public string? Model { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
}
