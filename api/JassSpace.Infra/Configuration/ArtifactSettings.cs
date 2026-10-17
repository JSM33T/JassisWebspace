namespace JassSpace.Infra.Configuration;

public sealed class ArtifactSettings
{
    public string ContainerName { get; set; } = "artifacts-private";
    public long MaxUploadBytes { get; set; } = 100 * 1024 * 1024;
    public long OwnerQuotaBytes { get; set; } = 2L * 1024 * 1024 * 1024;
    public int GrantLifetimeMinutes { get; set; } = 15;
    public string DataProtectionKeyDirectory { get; set; } = "/app/cache/artifact-keys";
}
