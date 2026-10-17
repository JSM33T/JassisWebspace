using Microsoft.AspNetCore.DataProtection;
using Hangfire;
using Hangfire.PostgreSql;
using JassSpace.Repositories;
using JassSpace.Api.Configuration;
using JassSpace.Api.Extensions; // Custom CORS
using JassSpace.Api.Jobs;
using JassSpace.Api.Logging;
using JassSpace.Api.Middleware; // CorrelationIdMiddleware
using JassSpace.Api.Security;
using JassSpace.Api.Services;
using JassSpace.Contracts.Interfaces;
using JassSpace.Data;
using JassSpace.Infra;
using JassSpace.Infra.ImageProcessors;
using JassSpace.Infra.Configuration;
using JassSpace.Services;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Distributed;
using Serilog;
using Serilog.Exceptions;

var builder = WebApplication.CreateBuilder(args);
var productVersion = ProductVersionManifest.Load();

// --- 1. Bootstrap Serilog very early ---
Log.Logger = new LoggerConfiguration()
    .ReadFrom.Configuration(builder.Configuration)
    .Enrich.FromLogContext()
    .Enrich.WithExceptionDetails()
    .Enrich.WithProperty("Application", "JassSpace.Api")
    .Enrich.WithProperty("Software", productVersion.Api.Name)
    .Enrich.WithProperty("Version", productVersion.Api.Version)
    .Enrich.WithProperty("Environment", builder.Environment.EnvironmentName)
    .CreateLogger();

builder.Host.UseSerilog((ctx, services, cfg) =>
{
    cfg.ReadFrom.Configuration(ctx.Configuration)
       .ReadFrom.Services(services)
       .Enrich.FromLogContext()
       .Enrich.WithExceptionDetails()
       .Enrich.WithProperty("Application", "JassSpace.Api")
       .Enrich.WithProperty("Software", productVersion.Api.Name)
       .Enrich.WithProperty("Version", productVersion.Api.Version)
       .Enrich.WithProperty("Environment", ctx.HostingEnvironment.EnvironmentName);
});

// --- 2. Register services ---
builder.Services.AddSingleton(productVersion);
builder.Services.AddControllers();
builder.Services.AddOpenApi(); // built-in OpenAPI/Swagger

// --- Entity Framework Core with PostgreSQL ---
builder.Services.AddJassSpaceDbContext(builder.Configuration, builder.Environment);

// --- JWT Configuration ---
builder.Services.AddJwtAuthentication(builder.Configuration, builder.Environment);

// --- CORS Configuration ---
builder.Services.AddCustomCors();

// --- Rate limiting ---
builder.Services.AddMemoryCache();
builder.Services.Configure<RedisSettings>(builder.Configuration.GetSection(RedisSettings.SectionName));
var redisConnectionString = builder.Configuration.GetConnectionString("Redis");
if (string.IsNullOrWhiteSpace(redisConnectionString))
{
    throw new InvalidOperationException("Missing required configuration: ConnectionStrings:Redis");
}

builder.Services.AddStackExchangeRedisCache(options =>
{
    options.Configuration = redisConnectionString;
    options.InstanceName = builder.Configuration.GetValue<string>($"{RedisSettings.SectionName}:{nameof(RedisSettings.InstanceName)}");
});
builder.Services.AddSingleton<IRedisCacheService, RedisCacheService>();

builder.Services.AddSingleton(TimeProvider.System);
builder.Services.Configure<RateLimitOptions>(builder.Configuration.GetSection("RateLimiting"));
builder.Services.AddScoped<IRateLimiterService, RateLimiterService>();
builder.Services.Configure<HangfireSettings>(builder.Configuration.GetSection(HangfireSettings.SectionName));

var hangfireSettings = builder.Configuration.GetSection(HangfireSettings.SectionName).Get<HangfireSettings>() ?? new HangfireSettings();
var defaultConnectionString = builder.Configuration.GetConnectionString("DefaultConnection");
if (string.IsNullOrWhiteSpace(defaultConnectionString))
{
    throw new InvalidOperationException("Missing required configuration: ConnectionStrings:DefaultConnection");
}

builder.Services.AddHangfire(config =>
{
    config.SetDataCompatibilityLevel(CompatibilityLevel.Version_180);
    config.UseSimpleAssemblyNameTypeSerializer();
    config.UseRecommendedSerializerSettings();
    config.UsePostgreSqlStorage(
        storageOptions => storageOptions.UseNpgsqlConnection(defaultConnectionString),
        new PostgreSqlStorageOptions
        {
            SchemaName = string.IsNullOrWhiteSpace(hangfireSettings.SchemaName)
                ? "hangfire"
                : hangfireSettings.SchemaName
        });
});

builder.Services.AddHangfireServer(options =>
{
    var queueName = string.IsNullOrWhiteSpace(hangfireSettings.QueueName) ? "emails" : hangfireSettings.QueueName;
    options.Queues = ["default", queueName];
});

builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
    options.KnownIPNetworks.Clear();
    options.KnownProxies.Clear();
});

// Register services
builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<IJwtService, JwtService>();
builder.Services.AddScoped<ICacheSubjectResolver, CacheSubjectResolver>();
builder.Services.AddScoped<IRequestCacheKeyBuilder, RequestCacheKeyBuilder>();
builder.Services.AddScoped<IHttpResponseCacheStore, HttpResponseCacheStore>();
builder.Services.AddScoped<ICommentNotificationJob, CommentNotificationJob>();
builder.Services.AddScoped<IEmailBroadcastJob, EmailBroadcastJob>();
builder.Services.AddSingleton<IUnsubscribeTokenService, UnsubscribeTokenService>();
builder.Services.AddHttpClient();

// Email Service Configuration
builder.Services.Configure<SmtpSettings>(
    builder.Configuration.GetSection("Email:Smtp"));
builder.Services.AddScoped<IEmailService, EmailService>();

// Azure Blob Storage Service Configuration
builder.Services.Configure<AzureBlobStorageSettings>(
    builder.Configuration.GetSection("AzureBlobStorage"));
builder.Services.AddScoped<IAzureBlobStorageService, AzureBlobStorageService>();

// Image Processing Service
builder.Services.AddScoped<IImageProcessingService, NetVipsImageProcessingService>();

// Repository Services
builder.Services.AddScoped<IUserRepository, UserRepository>();
builder.Services.AddScoped<AccountCleanupService>();
builder.Services.AddScoped<IProfileRepository, ProfileRepository>();
builder.Services.AddScoped<IProfileService, ProfileService>();
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IAdminDashboardService, AdminDashboardService>();
builder.Services.AddScoped<IAdminContentService, AdminContentService>();
builder.Services.AddScoped<IAdminBlogService, AdminBlogService>();
builder.Services.AddScoped<IAdminGalleryService, AdminGalleryService>();
builder.Services.AddScoped<IAdminMusicService, AdminMusicService>();
builder.Services.AddScoped<IAdminEmailService, AdminEmailService>();
builder.Services.AddScoped<IBlogService, BlogService>();
builder.Services.AddScoped<IGalleryService, GalleryService>();
builder.Services.AddScoped<IMusicService, MusicService>();
builder.Services.AddScoped<ISeoService, SeoService>();
builder.Services.AddScoped<IUiPropertiesService, UiPropertiesService>();
builder.Services.AddScoped<IContactService, ContactService>();
builder.Services.AddScoped<ICommentService, CommentService>();
builder.Services.AddScoped<ILikeService, LikeService>();
builder.Services.AddScoped<IContentViewService, ContentViewService>();
builder.Services.AddScoped<IBootlegService, BootlegService>();
builder.Services.AddOptions<ArtifactSettings>()
    .Bind(builder.Configuration.GetSection("Artifacts"))
    .Validate(s => s.MaxUploadBytes > 0 && s.MaxUploadBytes <= 100L * 1024 * 1024, "Artifacts:MaxUploadBytes must be between 1 and 104857600.")
    .Validate(s => s.OwnerQuotaBytes >= s.MaxUploadBytes && s.GrantLifetimeMinutes is >= 1 and <= 60, "Invalid artifact quota or grant lifetime.")
    .ValidateOnStart();
builder.Services.AddScoped<IArtifactAccessContext, ArtifactAccessContext>();
builder.Services.AddSingleton<IArtifactTokenProtector, ArtifactTokenProtector>();
builder.Services.AddScoped<IArtifactStorageService, ArtifactStorageService>();
builder.Services.AddScoped<IArtifactService, ArtifactService>();
var artifactKeyDirectory = builder.Configuration["Artifacts:DataProtectionKeyDirectory"]
    ?? (builder.Environment.IsDevelopment()
        ? Path.Combine(builder.Environment.ContentRootPath, ".data", "artifact-keys")
        : "/app/cache/artifact-keys");
builder.Services.AddDataProtection().SetApplicationName("JassSpace.Artifacts")
    .PersistKeysToFileSystem(new DirectoryInfo(artifactKeyDirectory));
builder.Services.PostConfigure<RateLimitOptions>(options =>
{
    options.Policies.TryAdd("artifact-upload", new RateLimitPolicy { PermitLimit = 10, Window = TimeSpan.FromMinutes(10) });
    options.Policies.TryAdd("artifact-share-read", new RateLimitPolicy { PermitLimit = 120, Window = TimeSpan.FromMinutes(1) });
    options.Policies.TryAdd("artifact-redeem", new RateLimitPolicy { PermitLimit = 30, Window = TimeSpan.FromMinutes(1) });
    options.Policies.TryAdd("artifact-download", new RateLimitPolicy { PermitLimit = 120, Window = TimeSpan.FromMinutes(1) });
});
builder.Services.AddScoped<ISearchRepository, SearchRepository>();
builder.Services.AddScoped<ISearchService, SearchService>();
builder.Services.Configure<IpGeolocationOptions>(builder.Configuration.GetSection("IpGeolocation"));
builder.Services.Configure<BootlegStreamingSettings>(builder.Configuration.GetSection("BootlegStreaming"));
builder.Services
    .AddOptions<OpenRouterSettings>()
    .Bind(builder.Configuration.GetSection(OpenRouterSettings.SectionName))
    .Validate(
        settings => Uri.TryCreate(settings.BaseUrl, UriKind.Absolute, out _),
        "OpenRouter:BaseUrl must be an absolute URI.")
    .Validate(
        settings => !string.IsNullOrWhiteSpace(settings.Model),
        "OpenRouter:Model is required.")
    .ValidateOnStart();
builder.Services.Configure<TurnstileOptions>(builder.Configuration.GetSection(TurnstileOptions.SectionName));
builder.Services.AddSingleton<IClientIpResolver, ClientIpResolver>();
builder.Services.AddSingleton<IIpGeolocationService, IpGeolocationService>();
builder.Services.AddSingleton<IBootlegTokenService, BootlegTokenService>();
builder.Services.AddScoped<ITurnstileVerificationService, TurnstileVerificationService>();

var app = builder.Build();
var applyMigrationsOnStartup = builder.Configuration.GetValue("ApplyMigrationsOnStartup", true);

// --- 3. Configure middleware pipeline ---
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseForwardedHeaders();
app.UseMiddleware<CorrelationIdMiddleware>();

app.UseSerilogRequestLogging(opts =>
{
    opts.MessageTemplate = "HTTP {RequestMethod} {RequestPath} responded {StatusCode} in {Elapsed:0.0000} ms";
    opts.GetLevel = (httpContext, _, exception) => RequestCompletionLogging.GetLogLevel(httpContext, exception);
    opts.EnrichDiagnosticContext = RequestCompletionLogging.EnrichDiagnosticContext;
});

// Enable CORS
app.UseCustomCors();

// Only enforce HTTPS redirection in non-development environments. In local dev
// it's common to run the API over HTTP which would otherwise cause a 307
// redirect when the frontend calls the API. Keep HTTPS enforced in prod.
if (!app.Environment.IsDevelopment())
{
    app.UseHttpsRedirection();
}

app.Use(async (context, next) =>
{
    if (context.Request.Path.StartsWithSegments("/artifact-shares") || context.Request.Path.StartsWithSegments("/artifact-downloads"))
    {
        context.Response.Headers["Cache-Control"] = "private, no-store";
        context.Response.Headers["Referrer-Policy"] = "no-referrer";
        context.Response.Headers["X-Robots-Tag"] = "noindex, nofollow, noarchive";
        context.Response.Headers["X-Content-Type-Options"] = "nosniff";
    }
    await next();
});

app.UseAuthentication();
app.UseAuthorization();

var dashboardPath = string.IsNullOrWhiteSpace(hangfireSettings.DashboardPath) ? "/hangfire" : hangfireSettings.DashboardPath;
if (!dashboardPath.StartsWith('/'))
{
    dashboardPath = $"/{dashboardPath}";
}

app.UseHangfireDashboard(dashboardPath, new DashboardOptions
{
    DisplayStorageConnectionString = false,
    Authorization =
    [
        new BasicHangfireDashboardAuthorizationFilter(
            hangfireSettings.DashboardAuth.Username,
            hangfireSettings.DashboardAuth.Password)
    ]
});

RecurringJob.AddOrUpdate<AccountCleanupService>(
    recurringJobId: "account-cleanup-daily-7am",
    queue: "default",
    methodCall: service => service.CleanupUnverifiedUsersAsync(CancellationToken.None),
    cronExpression: "0 7 * * *",
    options: new RecurringJobOptions
    {
        TimeZone = TimeZoneInfo.Local
    });

RecurringJob.AddOrUpdate<IArtifactService>(
    recurringJobId: "artifact-cleanup", queue: "default",
    methodCall: service => service.CleanupAsync(CancellationToken.None),
    cronExpression: "*/15 * * * *", options: new RecurringJobOptions { TimeZone = TimeZoneInfo.Utc });

app.MapControllers();

// --- 4. Start app with safe logging ---
try
{
    Log.Information(
        "Starting {Software} v{Version}.",
        productVersion.Api.Name,
        productVersion.Api.Version);
    if (applyMigrationsOnStartup)
    {
        await ApplyDatabaseMigrationsAsync(app);
    }

    await ValidateStartupDependenciesAsync(app);
    await app.RunAsync();
}
catch (Exception ex)
{
    Log.Fatal(ex, "JassSpace.Api terminated unexpectedly");
}
finally
{
    Log.CloseAndFlush();
}

static async Task ValidateStartupDependenciesAsync(WebApplication app)
{
    using var scope = app.Services.CreateScope();
    var serviceProvider = scope.ServiceProvider;
    var logger = serviceProvider.GetRequiredService<ILoggerFactory>().CreateLogger("Startup.DependencyChecks");

    logger.LogInformation("Running startup dependency checks.");

    var dbContext = serviceProvider.GetRequiredService<JassSpaceDbContext>();
    logger.LogInformation("Checking database connectivity.");

    var canConnectToDatabase = await dbContext.Database.CanConnectAsync();
    if (!canConnectToDatabase)
    {
        logger.LogCritical("Database connectivity check failed. Application startup aborted.");
        throw new InvalidOperationException("Database connectivity check failed.");
    }

    logger.LogInformation("Database connectivity check passed.");

    var cache = serviceProvider.GetRequiredService<IDistributedCache>();
    var redisProbeKey = $"startup:redis:probe:{Guid.NewGuid():N}";
    var redisProbeValue = DateTimeOffset.UtcNow.ToString("O");

    logger.LogInformation("Checking Redis connectivity.");
    await cache.SetStringAsync(
        redisProbeKey,
        redisProbeValue,
        new DistributedCacheEntryOptions
        {
            AbsoluteExpirationRelativeToNow = TimeSpan.FromSeconds(30)
        });

    var redisValue = await cache.GetStringAsync(redisProbeKey);
    await cache.RemoveAsync(redisProbeKey);

    if (!string.Equals(redisValue, redisProbeValue, StringComparison.Ordinal))
    {
        logger.LogCritical("Redis connectivity check failed. Application startup aborted.");
        throw new InvalidOperationException("Redis connectivity check failed.");
    }

    logger.LogInformation("Redis connectivity check passed.");
    logger.LogInformation("All startup dependency checks passed.");
}

static async Task ApplyDatabaseMigrationsAsync(WebApplication app)
{
    using var scope = app.Services.CreateScope();
    var serviceProvider = scope.ServiceProvider;
    var logger = serviceProvider.GetRequiredService<ILoggerFactory>().CreateLogger("Startup.Migrations");
    var dbContext = serviceProvider.GetRequiredService<JassSpaceDbContext>();

    var pendingMigrations = (await dbContext.Database.GetPendingMigrationsAsync()).ToList();
    if (pendingMigrations.Count == 0)
    {
        logger.LogInformation("No pending database migrations found.");
        return;
    }

    logger.LogInformation(
        "Applying {Count} pending database migration(s): {Migrations}",
        pendingMigrations.Count,
        string.Join(", ", pendingMigrations));

    await dbContext.Database.MigrateAsync();

    logger.LogInformation("Database migrations applied successfully.");
}
