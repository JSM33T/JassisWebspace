using System.ComponentModel.DataAnnotations;

namespace JassSpace.Entities;

public class DevelopmentSuggestion
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }

    [Required]
    [MaxLength(180)]
    public required string Title { get; set; }

    [Required]
    [MaxLength(5000)]
    public required string Body { get; set; }

    [Required]
    [MaxLength(32)]
    public string Status { get; set; } = "pending";

    public int? GitHubIssueNumber { get; set; }

    [MaxLength(2048)]
    public string? GitHubIssueUrl { get; set; }

    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset? UpdatedAt { get; set; }
    public DateTimeOffset? ReviewedAt { get; set; }
    public Guid? ReviewedByUserId { get; set; }

    public User User { get; set; } = null!;
    public User? ReviewedByUser { get; set; }
}
