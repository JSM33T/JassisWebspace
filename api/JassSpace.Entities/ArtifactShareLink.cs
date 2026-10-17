namespace JassSpace.Entities;

public sealed class ArtifactShareLink
{
    public Guid Id { get; set; }
    public Guid ArtifactId { get; set; }
    public Artifact Artifact { get; set; } = null!;
    public Guid? CreatedByUserId { get; set; }
    public User? CreatedByUser { get; set; }
    public required string TokenHash { get; set; }
    public DateTimeOffset? ExpiresAt { get; set; }
    public int? MaxDownloads { get; set; }
    public int DownloadCount { get; set; }
    public DateTimeOffset? RevokedAt { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset? UpdatedAt { get; set; }
    public ICollection<ArtifactDownloadGrant> Grants { get; set; } = new List<ArtifactDownloadGrant>();
}
