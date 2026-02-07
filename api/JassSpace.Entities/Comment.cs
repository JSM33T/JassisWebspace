using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace JassSpace.Entities;

public class Comment
{
    public Guid Id { get; set; }
    
    public Guid ContentId { get; set; }
    public Guid UserId { get; set; }
    public Guid? ParentCommentId { get; set; }

    [Required]
    [MaxLength(2000)]
    public required string Text { get; set; }
    
    public bool IsDeleted { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset? UpdatedAt { get; set; }

    // Navigation Properties
    public Content Content { get; set; } = null!;
    public User User { get; set; } = null!;
    public Comment? ParentComment { get; set; }
    public ICollection<Comment> Replies { get; set; } = new List<Comment>();
}
