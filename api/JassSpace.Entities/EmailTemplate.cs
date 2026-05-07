namespace JassSpace.Entities;

public class EmailTemplate
{
    public Guid Id { get; set; }
    public required string Name { get; set; }
    public required string Subject { get; set; }
    public required string HtmlBody { get; set; }
    public string? TextBody { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
}
