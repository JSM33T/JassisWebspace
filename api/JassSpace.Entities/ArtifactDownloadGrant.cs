namespace JassSpace.Entities;

public sealed class ArtifactDownloadGrant
{
    public Guid Id { get; set; }
    public Guid ArtifactShareLinkId { get; set; }
    public ArtifactShareLink Link { get; set; } = null!;
    public required string TokenHash { get; set; }
    public required string ProtectedToken { get; set; } // Encrypted, for idempotent redemption retries only.
    public Guid IdempotencyKey { get; set; }
    public int ActiveStreams { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset ExpiresAt { get; set; }
}
