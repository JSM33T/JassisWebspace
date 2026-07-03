using System.ComponentModel.DataAnnotations;

namespace JassSpace.Entities;

public class DevelopmentNote
{
    public Guid Id { get; set; }

    [Required]
    [MaxLength(180)]
    public required string Title { get; set; }

    [Required]
    [MaxLength(8000)]
    public required string Body { get; set; }

    [MaxLength(80)]
    public string? Version { get; set; }

    [Required]
    [MaxLength(64)]
    public string Category { get; set; } = "update";

    public bool IsPublished { get; set; }
    public DateTimeOffset? PublishedAt { get; set; }
    public Guid CreatedByUserId { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset? UpdatedAt { get; set; }

    public User CreatedByUser { get; set; } = null!;
}
