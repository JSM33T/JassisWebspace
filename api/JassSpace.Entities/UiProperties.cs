using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace JassSpace.Entities;

public class UiProperties
{
    [Key]
    public Guid Id { get; set; }

    [Required]
    public string Key { get; set; } = null!;

    [Required]
    public string Value { get; set; } = string.Empty;

    [Column(TypeName = "timestamptz")]
    public DateTimeOffset UpdatedAt { get; set; }
}
