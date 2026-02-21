using Linkyard.Repositories;
using JassSpace.Api.Configuration;
using JassSpace.Api.Extensions; // Custom CORS
using JassSpace.Api.Middleware; // CorrelationIdMiddleware
using JassSpace.Api.Services;
using JassSpace.Contracts.Interfaces;
using JassSpace.Data;
using JassSpace.Infra;
using JassSpace.Infra.Configuration;
using JassSpace.Repositories;
using JassSpace.Services;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Distributed;
using Serilog;
using Serilog.Exceptions;

var builder = WebApplication.CreateBuilder(args);

// --- 1. Bootstrap Serilog very early ---
Log.Logger = new LoggerConfiguration()
    .ReadFrom.Configuration(builder.Configuration) // read from appsettings.json
    .Enrich.FromLogContext()
    .Enrich.WithExceptionDetails()
    .Enrich.WithProperty("Application", "JassSpace.Api")
    .CreateLogger();

builder.Host.UseSerilog((ctx, services, cfg) =>
{
    cfg.ReadFrom.Configuration(ctx.Configuration)
       .ReadFrom.Services(services)
       .Enrich.FromLogContext()
       .Enrich.WithExceptionDetails()
       .Enrich.WithProperty("Environment", ctx.HostingEnvironment.EnvironmentName);
});

// --- 2. Register services ---
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
builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
    options.KnownIPNetworks.Clear();
    options.KnownProxies.Clear();
});

// Register services
builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<IJwtService, JwtService>();
builder.Services.AddScoped<IBlogCategoryCacheService, BlogCategoryCacheService>();
builder.Services.AddHttpClient();

// Email Service Configuration
builder.Services.Configure<JassSpace.Infra.Configuration.SmtpSettings>(
    builder.Configuration.GetSection("Email:Smtp"));
builder.Services.AddScoped<JassSpace.Infra.IEmailService, JassSpace.Infra.EmailService>();

// Azure Blob Storage Service Configuration
builder.Services.Configure<JassSpace.Infra.Configuration.AzureBlobStorageSettings>(
    builder.Configuration.GetSection("AzureBlobStorage"));
builder.Services.AddScoped<JassSpace.Infra.IAzureBlobStorageService, JassSpace.Infra.AzureBlobStorageService>();

// Image Processing Service
builder.Services.AddScoped<JassSpace.Infra.IImageProcessingService, JassSpace.Infra.ImageProcessingService>();

// Repository Services
builder.Services.AddScoped<IUserRepository, UserRepository>();
builder.Services.AddScoped<IProfileRepository, ProfileRepository>();
builder.Services.AddScoped<IProfileService, ProfileService>();
builder.Services.Configure<IpGeolocationOptions>(builder.Configuration.GetSection("IpGeolocation"));
builder.Services.Configure<BootlegStreamingSettings>(builder.Configuration.GetSection("BootlegStreaming"));
builder.Services.AddSingleton<IClientIpResolver, ClientIpResolver>();
builder.Services.AddSingleton<IIpGeolocationService, IpGeolocationService>();
builder.Services.AddSingleton<IBootlegTokenService, BootlegTokenService>();

// Add custom app services (example)
// builder.Services.AddSingleton<ILoggingService, LoggingService>();

var app = builder.Build();

// --- 3. Configure middleware pipeline ---
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseForwardedHeaders();

// Serilog request logging (logs HTTP requests with correlation info)
app.UseSerilogRequestLogging(opts =>
{
    opts.EnrichDiagnosticContext = (diag, http) =>
    {
        diag.Set("RequestHost", http.Request.Host.Value!);
        diag.Set("RequestScheme", http.Request.Scheme);
        diag.Set("ClientIP", http.Connection.RemoteIpAddress?.ToString()!);
        diag.Set("UserId", http.User?.FindFirst("oid")?.Value ?? http.User?.Identity?.Name!);
        diag.Set("CorrelationId", http.Request.Headers["X-Correlation-Id"].ToString());
    };
});
// Correlation ID middleware (ensures every request has one)
app.UseMiddleware<CorrelationIdMiddleware>();

// Enable CORS
app.UseCustomCors();

// Only enforce HTTPS redirection in non-development environments. In local dev
// it's common to run the API over HTTP which would otherwise cause a 307
// redirect when the frontend calls the API. Keep HTTPS enforced in prod.
if (!app.Environment.IsDevelopment())
{
    app.UseHttpsRedirection();
}

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

// --- 4. Start app with safe logging ---
try
{
    Log.Information("Starting JassSpace.Api...");
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
