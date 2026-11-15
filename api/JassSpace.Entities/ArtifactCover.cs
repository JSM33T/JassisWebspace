namespace JassSpace.Entities;

public sealed class ArtifactCover
{
    public Guid ArtifactId { get; set; }
    public required byte[] Image { get; set; }
}
