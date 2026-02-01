using System.ComponentModel.DataAnnotations;

namespace JassSpace.Entities;

public class Role
{
    [Key]
    public int Id { get; set; }

    [Required]
    public string Name { get; set; } = null!;

    public string? Description { get; set; }

    // Navigation properties
    public ICollection<UserRole> UserRoles { get; set; } = new List<UserRole>();
}