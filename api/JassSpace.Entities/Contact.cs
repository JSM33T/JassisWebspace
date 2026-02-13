namespace JassSpace.Entities;

public class Contact
{
    public Guid Id { get; set; }
    public required string Name { get; set; }
    public required string Email { get; set; }
    public required string Purpose { get; set; }
    public required string Message { get; set; }
    public string? RefUrl { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
}
