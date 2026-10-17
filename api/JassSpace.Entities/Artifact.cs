namespace JassSpace.Entities;

public sealed class Artifact
{
    public Guid Id { get; set; }
    public Guid ContentId { get; set; }
    public Content Content { get; set; } = null!;
    public Guid? OwnerUserId { get; set; }
    public User? OwnerUser { get; set; }
    public required string Title { get; set; }
    public string? PrivateNote { get; set; }
    public required string OriginalFileName { get; set; }
    public required string StorageKey { get; set; }
    public required string MediaType { get; set; }
    public long SizeBytes { get; set; }
    public required string State { get; set; } // Uploading, ReplacementReady (hidden), Ready, DeletionPending; legacy Deleted is purged
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset? UpdatedAt { get; set; }
    public DateTimeOffset? DeletedAt { get; set; }
    public ICollection<ArtifactShareLink> Links { get; set; } = new List<ArtifactShareLink>();
}
