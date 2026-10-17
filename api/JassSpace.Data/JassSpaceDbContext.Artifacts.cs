using JassSpace.Entities;
using Microsoft.EntityFrameworkCore;

namespace JassSpace.Data;

public partial class JassSpaceDbContext
{
    public DbSet<Artifact> Artifacts => Set<Artifact>();
    public DbSet<ArtifactShareLink> ArtifactShareLinks => Set<ArtifactShareLink>();
    public DbSet<ArtifactDownloadGrant> ArtifactDownloadGrants => Set<ArtifactDownloadGrant>();

    private static void ConfigureArtifacts(ModelBuilder builder)
    {
        var artifact = builder.Entity<Artifact>();
        artifact.ToTable("Artifacts", table => table.HasCheckConstraint("CK_Artifacts_SizeBytes", "\"SizeBytes\" > 0"));
        artifact.HasKey(x => x.Id);
        artifact.Property(x => x.Title).HasMaxLength(200).IsRequired();
        artifact.Property(x => x.PrivateNote).HasMaxLength(4000);
        artifact.Property(x => x.OriginalFileName).HasMaxLength(255).IsRequired();
        artifact.Property(x => x.StorageKey).HasMaxLength(128).IsRequired();
        artifact.Property(x => x.MediaType).HasMaxLength(128).IsRequired();
        artifact.Property(x => x.State).HasMaxLength(32).IsRequired();
        artifact.HasIndex(x => x.StorageKey).IsUnique();
        artifact.HasIndex(x => x.CreatedAt);
        artifact.HasIndex(x => x.State);
        artifact.HasOne(x => x.Content).WithOne().HasForeignKey<Artifact>(x => x.ContentId).OnDelete(DeleteBehavior.Restrict);
        artifact.HasOne(x => x.OwnerUser).WithMany().HasForeignKey(x => x.OwnerUserId).OnDelete(DeleteBehavior.SetNull);

        var link = builder.Entity<ArtifactShareLink>();
        link.ToTable("ArtifactShareLinks", table => {
            table.HasCheckConstraint("CK_ArtifactShareLinks_MaxDownloads", "\"MaxDownloads\" IS NULL OR \"MaxDownloads\" > 0");
            table.HasCheckConstraint("CK_ArtifactShareLinks_DownloadCount", "\"DownloadCount\" >= 0");
        });
        link.HasKey(x => x.Id);
        link.Property(x => x.TokenHash).HasMaxLength(64).IsRequired();
        link.HasIndex(x => x.TokenHash).IsUnique();
        link.HasOne(x => x.Artifact).WithMany(x => x.Links).HasForeignKey(x => x.ArtifactId).OnDelete(DeleteBehavior.Cascade);
        link.HasOne(x => x.CreatedByUser).WithMany().HasForeignKey(x => x.CreatedByUserId).OnDelete(DeleteBehavior.SetNull);

        var grant = builder.Entity<ArtifactDownloadGrant>();
        grant.ToTable("ArtifactDownloadGrants", table => table.HasCheckConstraint("CK_ArtifactDownloadGrants_ActiveStreams", "\"ActiveStreams\" >= 0 AND \"ActiveStreams\" <= 2"));
        grant.HasKey(x => x.Id);
        grant.Property(x => x.TokenHash).HasMaxLength(64).IsRequired();
        grant.Property(x => x.ProtectedToken).IsRequired();
        grant.HasIndex(x => x.TokenHash).IsUnique();
        grant.HasIndex(x => new { x.ArtifactShareLinkId, x.IdempotencyKey }).IsUnique();
        grant.HasIndex(x => x.ExpiresAt);
        grant.HasOne(x => x.Link).WithMany(x => x.Grants).HasForeignKey(x => x.ArtifactShareLinkId).OnDelete(DeleteBehavior.Cascade);
    }
}
