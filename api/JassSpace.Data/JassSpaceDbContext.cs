using JassSpace.Entities;
using Microsoft.EntityFrameworkCore;

namespace JassSpace.Data;

public class JassSpaceDbContext(DbContextOptions<JassSpaceDbContext> options) : DbContext(options)
{
    // DbSets for all entities
    public DbSet<User> Users { get; set; }
    public DbSet<Role> Roles { get; set; }
    public DbSet<UserRole> UserRoles { get; set; }
    public DbSet<ExternalLogin> ExternalLogins { get; set; }
    public DbSet<OtpCode> OtpCodes { get; set; }
    public DbSet<Session> Sessions { get; set; }
    public DbSet<RefreshToken> RefreshTokens { get; set; }
    public DbSet<TwoFactorMethod> TwoFactorMethods { get; set; }
    public DbSet<TwoFactorCode> TwoFactorCodes { get; set; }
    public DbSet<AuditLog> AuditLogs { get; set; }
    public DbSet<RateLimitBucket> RateLimitBuckets { get; set; }
    public DbSet<AppConfig> AppConfigs { get; set; }
    public DbSet<Album> Albums { get; set; }
    public DbSet<Image> Images { get; set; }
    public DbSet<Content> Contents { get; set; }
    public DbSet<ContentAuthor> ContentAuthors { get; set; }
    public DbSet<Blog> Blogs { get; set; }
    public DbSet<BlogCategory> BlogCategories { get; set; }
    public DbSet<BootlegAsset> BootlegAssets { get; set; }
    public DbSet<Track> Tracks { get; set; }
    public DbSet<TrackLink> TrackLinks { get; set; }
    public DbSet<Comment> Comments => Set<Comment>();
    public DbSet<Like> Likes => Set<Like>();
    public DbSet<Contact> Contacts => Set<Contact>();
    public DbSet<UiProperties> UiProperties => Set<UiProperties>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Enable PostgreSQL extensions
        modelBuilder.HasPostgresExtension("pgcrypto");
        modelBuilder.HasPostgresExtension("citext");

        ConfigureUserEntity(modelBuilder);
        ConfigureRoleEntity(modelBuilder);
        ConfigureUserRoleEntity(modelBuilder);
        ConfigureExternalLoginEntity(modelBuilder);
        ConfigureOtpCodeEntity(modelBuilder);
        ConfigureSessionEntity(modelBuilder);
        ConfigureRefreshTokenEntity(modelBuilder);
        ConfigureTwoFactorMethodEntity(modelBuilder);
        ConfigureTwoFactorCodeEntity(modelBuilder);
        ConfigureAuditLogEntity(modelBuilder);
        ConfigureRateLimitBucketEntity(modelBuilder);
        ConfigureAppConfigEntity(modelBuilder);
        ConfigureAlbumEntity(modelBuilder);
        ConfigureImageEntity(modelBuilder);
        ConfigureContentEntity(modelBuilder);
        ConfigureContentAuthorEntity(modelBuilder);
        ConfigureBlogEntity(modelBuilder);
        ConfigureBlogCategoryEntity(modelBuilder);
        ConfigureBootlegAssetEntity(modelBuilder);
        ConfigureTrackEntity(modelBuilder);
        ConfigureTrackLinkEntity(modelBuilder);
        ConfigureCommentEntity(modelBuilder);
        ConfigureLikeEntity(modelBuilder);
        ConfigureContactEntity(modelBuilder);
        ConfigureUiPropertiesEntity(modelBuilder);

        SeedRoles(modelBuilder);
        SeedAppConfigs(modelBuilder);
        SeedUiProperties(modelBuilder);
    }
// ... (existing configuration methods)

    private void ConfigureCommentEntity(ModelBuilder modelBuilder)
    {
        var entity = modelBuilder.Entity<Comment>();

        // Primary key
        entity.HasKey(e => e.Id);

        // Indexes
        entity.HasIndex(e => e.ContentId);
        entity.HasIndex(e => e.UserId);
        entity.HasIndex(e => e.ParentCommentId); // Index for fast reply lookups
        entity.HasIndex(e => e.CreatedAt);

        // Relationships
        entity.HasOne(c => c.Content)
              .WithMany() // Assuming Content doesn't have a specific Comments collection navigation property yet, it's fine.
              .HasForeignKey(c => c.ContentId)
              .OnDelete(DeleteBehavior.Cascade); // Delete content -> Delete comments

        entity.HasOne(c => c.User)
              .WithMany()
              .HasForeignKey(c => c.UserId)
              .OnDelete(DeleteBehavior.Cascade); // Delete user -> Delete comments? Or SetNull? Usually Cascade or Keep generic user. Let's cascade for now.

        // Self-referencing for replies
        entity.HasOne(c => c.ParentComment)
              .WithMany(p => p.Replies)
              .HasForeignKey(c => c.ParentCommentId)
              .OnDelete(DeleteBehavior.Cascade); // Delete parent -> Delete replies
    }


    private void ConfigureUserEntity(ModelBuilder modelBuilder)
    {
        var entity = modelBuilder.Entity<User>();

        // Primary key
        entity.HasKey(e => e.Id);

        // Unique constraints
        entity.HasIndex(e => e.Email).IsUnique();
        entity.HasIndex(e => e.Username).IsUnique(); // Username is now part of User entity

        // Global query filter for soft delete
        // Note: Commented out to avoid conflicts with required navigation properties
        // You can implement soft delete logic in your services instead
        // entity.HasQueryFilter(e => e.DeletedAt == null);

        entity.HasMany(u => u.UserRoles)
              .WithOne(ur => ur.User)
              .HasForeignKey(ur => ur.UserId)
              .OnDelete(DeleteBehavior.Cascade);

        entity.HasMany(u => u.ExternalLogins)
              .WithOne(el => el.User)
              .HasForeignKey(el => el.UserId)
              .OnDelete(DeleteBehavior.Cascade);

        entity.HasMany(u => u.Sessions)
              .WithOne(s => s.User)
              .HasForeignKey(s => s.UserId)
              .OnDelete(DeleteBehavior.Cascade);

        entity.HasMany(u => u.RefreshTokens)
              .WithOne(rt => rt.User)
              .HasForeignKey(rt => rt.UserId)
              .OnDelete(DeleteBehavior.Cascade);

        entity.HasMany(u => u.TwoFactorMethods)
              .WithOne(tfm => tfm.User)
              .HasForeignKey(tfm => tfm.UserId)
              .OnDelete(DeleteBehavior.Cascade);

        entity.HasMany(u => u.TwoFactorCodes)
              .WithOne(tfc => tfc.User)
              .HasForeignKey(tfc => tfc.UserId)
              .OnDelete(DeleteBehavior.Cascade);

        entity.HasMany(u => u.AuditLogs)
              .WithOne(al => al.User)
              .HasForeignKey(al => al.UserId)
              .OnDelete(DeleteBehavior.SetNull);

    }

    private void ConfigureRoleEntity(ModelBuilder modelBuilder)
    {
        var entity = modelBuilder.Entity<Role>();

        // Primary key
        entity.HasKey(e => e.Id);

        // Unique constraints
        entity.HasIndex(e => e.Name).IsUnique();

        // Relationships
        entity.HasMany(r => r.UserRoles)
              .WithOne(ur => ur.Role)
              .HasForeignKey(ur => ur.RoleId)
              .OnDelete(DeleteBehavior.Cascade);
    }

    private void ConfigureUserRoleEntity(ModelBuilder modelBuilder)
    {
        var entity = modelBuilder.Entity<UserRole>();

        // Composite primary key
        entity.HasKey(e => new { e.UserId, e.RoleId });
    }

    private void ConfigureExternalLoginEntity(ModelBuilder modelBuilder)
    {
        var entity = modelBuilder.Entity<ExternalLogin>();

        // Primary key
        entity.HasKey(e => e.Id);

        // Unique constraints
        entity.HasIndex(e => new { e.Provider, e.ProviderUserId }).IsUnique();
    }

    private void ConfigureOtpCodeEntity(ModelBuilder modelBuilder)
    {
        var entity = modelBuilder.Entity<OtpCode>();

        // Primary key
        entity.HasKey(e => e.Id);

        // Indexes
        entity.HasIndex(e => new { e.Email, e.Purpose, e.ExpiresAt });
    }

    private void ConfigureSessionEntity(ModelBuilder modelBuilder)
    {
        var entity = modelBuilder.Entity<Session>();

        // Primary key
        entity.HasKey(e => e.Id);

        // Indexes
        entity.HasIndex(e => new { e.UserId, e.LastSeenAt });

        // Relationships
        entity.HasMany(s => s.RefreshTokens)
              .WithOne(rt => rt.Session)
              .HasForeignKey(rt => rt.SessionId)
              .OnDelete(DeleteBehavior.Cascade);
    }

    private void ConfigureRefreshTokenEntity(ModelBuilder modelBuilder)
    {
        var entity = modelBuilder.Entity<RefreshToken>();

        // Primary key
        entity.HasKey(e => e.Id);

        // Indexes
        entity.HasIndex(e => new { e.UserId, e.SessionId });
        entity.HasIndex(e => e.FamilyId);

        // Self-referencing relationship
        entity.HasOne(rt => rt.ReplacedBy)
              .WithMany()
              .HasForeignKey(rt => rt.ReplacedById)
              .OnDelete(DeleteBehavior.SetNull);
    }

    private void ConfigureTwoFactorMethodEntity(ModelBuilder modelBuilder)
    {
        var entity = modelBuilder.Entity<TwoFactorMethod>();

        // Primary key
        entity.HasKey(e => e.Id);

        // Relationships
        entity.HasMany(tfm => tfm.TwoFactorCodes)
              .WithOne(tfc => tfc.Method)
              .HasForeignKey(tfc => tfc.MethodId)
              .OnDelete(DeleteBehavior.Cascade);
    }

    private void ConfigureTwoFactorCodeEntity(ModelBuilder modelBuilder)
    {
        var entity = modelBuilder.Entity<TwoFactorCode>();

        // Primary key
        entity.HasKey(e => e.Id);

        // Indexes
        entity.HasIndex(e => new { e.UserId, e.ExpiresAt });
    }

    private void ConfigureAuditLogEntity(ModelBuilder modelBuilder)
    {
        var entity = modelBuilder.Entity<AuditLog>();

        // Primary key
        entity.HasKey(e => e.Id);

        // Indexes
        entity.HasIndex(e => new { e.UserId, e.At });
        entity.HasIndex(e => e.Metadata).HasMethod("gin"); // GIN index for JSONB
    }

    private void ConfigureRateLimitBucketEntity(ModelBuilder modelBuilder)
    {
        var entity = modelBuilder.Entity<RateLimitBucket>();

        // Primary key
        entity.HasKey(e => e.Id);

        // Limit cardinality per window + policy bucket
        entity.Property(e => e.Key)
            .HasMaxLength(256);

        // Prevent duplicate buckets for the same key/window
        entity.HasIndex(e => new { e.Key, e.WindowStart })
              .IsUnique();
    }

    private void ConfigureAppConfigEntity(ModelBuilder modelBuilder)
    {
        var entity = modelBuilder.Entity<AppConfig>();

        // Primary key
        entity.HasKey(e => e.Id);

        // Unique constraints
        entity.HasIndex(e => e.Key).IsUnique();
    }

    private void ConfigureAlbumEntity(ModelBuilder modelBuilder)
    {
        var entity = modelBuilder.Entity<Album>();

        // Primary key
        entity.HasKey(e => e.Id);

        // Unique constraints
        entity.HasIndex(e => e.Slug).IsUnique();

        // Indexes
        entity.HasIndex(e => e.Name);
        entity.HasIndex(e => e.CreatedAt);
        entity.HasIndex(e => e.SortOrder);

        // Relationships
        entity.HasMany(a => a.Images)
              .WithOne(i => i.Album)
              .HasForeignKey(i => i.AlbumId)
              .OnDelete(DeleteBehavior.Cascade);
    }

    private void ConfigureImageEntity(ModelBuilder modelBuilder)
    {
        var entity = modelBuilder.Entity<Image>();

        // Primary key
        entity.HasKey(e => e.Id);

        // Indexes
        entity.HasIndex(e => new { e.AlbumId, e.Order });
        entity.HasIndex(e => e.CreatedAt);
    }

    private void ConfigureContentEntity(ModelBuilder modelBuilder)
    {
        var entity = modelBuilder.Entity<Content>();

        // Primary key
        entity.HasKey(e => e.Id);

        // Unique constraints
        entity.HasIndex(e => e.Slug).IsUnique();

        // Indexes
        entity.HasIndex(e => e.ContentType);
        entity.HasIndex(e => new { e.ContentType, e.ContentRefId });
        entity.HasIndex(e => e.IsPublished);
        entity.HasIndex(e => e.CreatedAt);

        // Full-text search: stored generated tsvector + GIN index
        entity.HasGeneratedTsVectorColumn(
            c => c.SearchVector,
            "english",
            c => new { c.Title, c.Description, c.SearchBody });

        entity.HasIndex(e => e.SearchVector)
              .HasMethod("GIN");

        entity.HasMany(c => c.Authors)
              .WithOne(ca => ca.Content)
              .HasForeignKey(ca => ca.ContentId)
              .OnDelete(DeleteBehavior.Cascade);
    }

    private void ConfigureContentAuthorEntity(ModelBuilder modelBuilder)
    {
        var entity = modelBuilder.Entity<ContentAuthor>();

        entity.HasKey(e => e.Id);

        entity.Property(e => e.Role)
            .HasMaxLength(64);

        entity.HasIndex(e => new { e.ContentId, e.UserId }).IsUnique();
        entity.HasIndex(e => new { e.ContentId, e.Order });
        entity.HasIndex(e => e.UserId);

        entity.HasOne(e => e.User)
            .WithMany()
            .HasForeignKey(e => e.UserId)
            .OnDelete(DeleteBehavior.Cascade);
    }

    private void ConfigureBlogEntity(ModelBuilder modelBuilder)
    {
        var entity = modelBuilder.Entity<Blog>();

        // Primary key
        entity.HasKey(e => e.Id);

        // Unique constraints
        entity.HasIndex(e => e.Slug).IsUnique();

        // Indexes
        entity.HasIndex(e => e.Title);
        entity.HasIndex(e => e.IsPublished);
        entity.HasIndex(e => e.PublishedAt);
        entity.HasIndex(e => e.CreatedAt);
        entity.HasIndex(e => e.CategoryId);

        // Relationships
        entity.HasOne(b => b.Category)
              .WithMany(c => c.Blogs)
              .HasForeignKey(b => b.CategoryId)
              .OnDelete(DeleteBehavior.SetNull);
    }

    private void ConfigureBlogCategoryEntity(ModelBuilder modelBuilder)
    {
        var entity = modelBuilder.Entity<BlogCategory>();

        // Primary key
        entity.HasKey(e => e.Id);

        // Unique constraints
        entity.HasIndex(e => e.Slug).IsUnique();

        // Indexes
        entity.HasIndex(e => e.Name);
        entity.HasIndex(e => e.CreatedAt);
    }


    private void ConfigureBootlegAssetEntity(ModelBuilder modelBuilder)
    {
        var entity = modelBuilder.Entity<BootlegAsset>();

        entity.HasKey(e => e.Id);

        entity.Property(e => e.Folder)
            .HasMaxLength(128)
            .IsRequired();

        entity.Property(e => e.BlobName)
            .HasMaxLength(512)
            .IsRequired();

        entity.Property(e => e.OriginalFileName)
            .HasMaxLength(512)
            .IsRequired();

        entity.Property(e => e.ContentType)
            .HasMaxLength(128)
            .IsRequired();

        entity.HasIndex(e => e.BlobName).IsUnique();
        entity.HasIndex(e => new { e.Folder, e.CreatedAt });
    }

    private void ConfigureTrackEntity(ModelBuilder modelBuilder)
    {
        var entity = modelBuilder.Entity<Track>();

        entity.HasKey(e => e.Id);

        entity.Property(e => e.Title)
            .HasMaxLength(220)
            .IsRequired();

        entity.Property(e => e.Slug)
            .HasMaxLength(240)
            .IsRequired();

        entity.Property(e => e.Description)
            .HasMaxLength(4000)
            .IsRequired();

        entity.Property(e => e.Category)
            .HasMaxLength(64)
            .IsRequired();

        entity.Property(e => e.Duration)
            .HasMaxLength(32);

        entity.Property(e => e.Genre)
            .HasMaxLength(100);

        entity.Property(e => e.Cover)
            .HasMaxLength(2048);

        entity.Property(e => e.Tags)
            .HasColumnType("text[]");

        entity.HasIndex(e => e.Slug).IsUnique();
        entity.HasIndex(e => e.Category);
        entity.HasIndex(e => e.IsPublished);
        entity.HasIndex(e => e.ReleaseDate);
        entity.HasIndex(e => e.CreatedAt);

        entity.HasOne(e => e.BootlegAsset)
            .WithMany(b => b.Tracks)
            .HasForeignKey(e => e.BootlegAssetId)
            .OnDelete(DeleteBehavior.SetNull);

        entity.HasMany(e => e.Links)
            .WithOne(l => l.Track)
            .HasForeignKey(l => l.TrackId)
            .OnDelete(DeleteBehavior.Cascade);
    }

    private void ConfigureTrackLinkEntity(ModelBuilder modelBuilder)
    {
        var entity = modelBuilder.Entity<TrackLink>();

        entity.HasKey(e => e.Id);

        entity.Property(e => e.Type)
            .HasMaxLength(64)
            .IsRequired();

        entity.Property(e => e.Url)
            .HasMaxLength(2048)
            .IsRequired();

        entity.Property(e => e.Label)
            .HasMaxLength(160)
            .IsRequired();

        entity.HasIndex(e => new { e.TrackId, e.Order });
    }

    private void SeedRoles(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Role>().HasData(
            new Role { Id = 1, Name = "admin", Description = "Administrator with full system access" },
            new Role { Id = 2, Name = "mod", Description = "Moderator with moderation privileges" },
            new Role { Id = 3, Name = "user", Description = "Standard user" }
        );
    }

    private void SeedAppConfigs(ModelBuilder modelBuilder)
    {
        // Use static values instead of dynamic ones to avoid model changes
        var baseDate = new DateTimeOffset(2025, 9, 20, 0, 0, 0, TimeSpan.Zero);

        modelBuilder.Entity<AppConfig>().HasData(
            new AppConfig { Id = new Guid("11111111-1111-1111-1111-111111111111"), Key = "GoogleLoginEnabled", Value = "true", UpdatedAt = baseDate },
            new AppConfig { Id = new Guid("22222222-2222-2222-2222-222222222222"), Key = "OtpExpiryMinutes", Value = "10", UpdatedAt = baseDate },
            new AppConfig { Id = new Guid("33333333-3333-3333-3333-333333333333"), Key = "OtpMaxAttempts", Value = "5", UpdatedAt = baseDate },
            new AppConfig { Id = new Guid("44444444-4444-4444-4444-444444444444"), Key = "SessionIdleTimeoutDays", Value = "14", UpdatedAt = baseDate },
            new AppConfig { Id = new Guid("55555555-5555-5555-5555-555555555555"), Key = "SessionAbsoluteLifetimeDays", Value = "60", UpdatedAt = baseDate },
            new AppConfig { Id = new Guid("66666666-6666-6666-6666-666666666666"), Key = "TwoFactorRequired", Value = "false", UpdatedAt = baseDate },
            new AppConfig { Id = new Guid("77777777-7777-7777-7777-777777777777"), Key = "SignupDisabled", Value = "false", UpdatedAt = baseDate },
            new AppConfig { Id = new Guid("88888888-8888-8888-8888-888888888888"), Key = "PasswordMinLength", Value = "8", UpdatedAt = baseDate }
        );
    }

    private void SeedUiProperties(ModelBuilder modelBuilder)
    {
        var baseDate = new DateTimeOffset(2025, 9, 20, 0, 0, 0, TimeSpan.Zero);

        modelBuilder.Entity<UiProperties>().HasData(
            new UiProperties
            {
                Id = new Guid("99999999-9999-9999-9999-999999999999"),
                Key = "RESUME_URL",
                Value = "https://example.com/resume.pdf",
                UpdatedAt = baseDate
            }
        );
    }
    private void ConfigureLikeEntity(ModelBuilder modelBuilder)
    {
        var entity = modelBuilder.Entity<Like>();

        entity.HasKey(l => new { l.ContentId, l.UserId });

        entity.HasOne(l => l.Content)
            .WithMany()
            .HasForeignKey(l => l.ContentId)
            .OnDelete(DeleteBehavior.Cascade);

        entity.HasOne(l => l.User)
            .WithMany()
            .HasForeignKey(l => l.UserId)
            .OnDelete(DeleteBehavior.Cascade);
    }

    private void ConfigureContactEntity(ModelBuilder modelBuilder)
    {
        var entity = modelBuilder.Entity<Contact>();

        entity.HasKey(c => c.Id);

        entity.Property(c => c.Name)
              .HasMaxLength(120)
              .IsRequired();

        entity.Property(c => c.Email)
              .HasMaxLength(320)
              .IsRequired();

        entity.Property(c => c.Purpose)
              .HasMaxLength(100)
              .IsRequired();

        entity.Property(c => c.Message)
              .HasMaxLength(5000)
              .IsRequired();

        entity.Property(c => c.RefUrl)
              .HasMaxLength(2048);

        entity.HasIndex(c => c.CreatedAt);
        entity.HasIndex(c => c.Email);
    }

    private void ConfigureUiPropertiesEntity(ModelBuilder modelBuilder)
    {
        var entity = modelBuilder.Entity<UiProperties>();

        entity.HasKey(e => e.Id);

        entity.Property(e => e.Key)
            .HasMaxLength(200)
            .IsRequired();

        entity.Property(e => e.Value)
            .IsRequired();

        entity.HasIndex(e => e.Key)
            .IsUnique();

        entity.HasIndex(e => e.UpdatedAt);
    }
}
