using JassSpace.Api.Configuration;
using JassSpace.Api.Logging;
using JassSpace.Data;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.Security.Claims;
using System.Text;

namespace JassSpace.Api.Extensions;

/// <summary>
/// Provides extension methods for configuring JWT authentication and authorization.
/// </summary>
public static class AuthExtensions
{
    /// <summary>
    /// Configures JWT authentication and authorization using the provided <see cref="JwtSettings"/>.
    /// </summary>
    /// <param name="services">The <see cref="IServiceCollection"/> to add services to.</param>
    /// <param name="configuration">The application configuration containing the "JWT" section.</param>
    /// <param name="env">The current host environment.</param>
    /// <returns>The <see cref="IServiceCollection"/> for chaining.</returns>
    /// <exception cref="InvalidOperationException">
    /// Thrown if the JWT configuration section is missing or invalid (e.g., missing secret key).
    /// </exception>
    public static IServiceCollection AddJwtAuthentication(
        this IServiceCollection services,
        IConfiguration configuration,
        IHostEnvironment env)
    {
        services.Configure<JwtSettings>(configuration.GetSection("JWT"));
        var jwtSettings = configuration.GetSection("JWT").Get<JwtSettings>();

        if (jwtSettings == null || string.IsNullOrEmpty(jwtSettings.SecretKey))
        {
            throw new InvalidOperationException("JWT configuration is missing or invalid");
        }

        services.AddAuthentication(options =>
        {
            options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
            options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
        })
        .AddJwtBearer(options =>
        {
            options.RequireHttpsMetadata = !env.IsDevelopment();
            options.SaveToken = true;
            options.TokenValidationParameters = new TokenValidationParameters
            {
                ValidateIssuerSigningKey = true,
                IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSettings.SecretKey)),
                ValidateIssuer = true,
                ValidIssuer = jwtSettings.Issuer,
                ValidateAudience = true,
                ValidAudience = jwtSettings.Audience,
                ValidateLifetime = true,
                ClockSkew = TimeSpan.Zero,
                NameClaimType = ClaimTypes.Name,
                RoleClaimType = ClaimTypes.Role
            };

            options.Events = new JwtBearerEvents
            {
                OnAuthenticationFailed = context =>
                {
                    var logger = context.HttpContext.RequestServices
                        .GetRequiredService<ILoggerFactory>()
                        .CreateLogger("Authentication.Jwt");

                    logger.LogWarning(
                        context.Exception,
                        "JWT authentication failed for {RequestPath}.",
                        RequestLoggingContext.GetRequestPath(context.HttpContext));

                    return Task.CompletedTask;
                },
                OnTokenValidated = async context =>
                {
                    var logger = context.HttpContext.RequestServices
                        .GetRequiredService<ILoggerFactory>()
                        .CreateLogger("Authentication.Jwt");
                    var principal = context.Principal;
                    var identity = principal?.Identity as ClaimsIdentity;
                    var userIdValue = principal?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                    var sessionIdValue = RequestLoggingContext.TryGetSessionId(principal);

                    if (identity is null ||
                        !Guid.TryParse(userIdValue, out var userId) || userId == Guid.Empty ||
                        !Guid.TryParse(sessionIdValue, out var sessionId) || sessionId == Guid.Empty)
                    {
                        context.Fail("Missing or invalid user or session claim.");
                        return;
                    }

                    try
                    {
                        var db = context.HttpContext.RequestServices.GetRequiredService<JassSpaceDbContext>();
                        var cancellationToken = context.HttpContext.RequestAborted;
                        var user = await db.Users.AsNoTracking()
                            .Where(u => u.Id == userId)
                            .Select(u => new { u.IsActive, u.DeletedAt })
                            .SingleOrDefaultAsync(cancellationToken);

                        if (user is null || !user.IsActive || user.DeletedAt.HasValue)
                        {
                            context.Fail("User is missing or inactive.");
                            return;
                        }

                        var sessionIsActive = await db.Sessions.AsNoTracking()
                            .AnyAsync(s => s.Id == sessionId && s.UserId == userId && s.RevokedAt == null,
                                cancellationToken);
                        if (!sessionIsActive)
                        {
                            context.Fail("Session is missing or revoked.");
                            return;
                        }

                        var currentRoles = await db.UserRoles.AsNoTracking()
                            .Where(ur => ur.UserId == userId)
                            .Select(ur => ur.Role.Name)
                            .ToListAsync(cancellationToken);

                        foreach (var claimsIdentity in principal!.Identities)
                        {
                            foreach (var claim in claimsIdentity.Claims
                                .Where(c => c.Type == ClaimTypes.Role || c.Type == "role" ||
                                            c.Type == "roles" || c.Type == claimsIdentity.RoleClaimType)
                                .ToArray())
                            {
                                claimsIdentity.RemoveClaim(claim);
                            }
                        }

                        foreach (var role in currentRoles
                            .Where(role => !string.IsNullOrWhiteSpace(role))
                            .Select(role => role.Trim())
                            .Distinct(StringComparer.OrdinalIgnoreCase))
                        {
                            identity.AddClaim(new Claim(identity.RoleClaimType, role));
                        }

                        logger.LogDebug("JWT session validated with current roles for user {UserId}.", userId);
                    }
                    catch (Exception exception)
                    {
                        logger.LogError(exception, "Could not verify current authentication state for user {UserId}.", userId);
                        context.Fail("Authentication state could not be verified.");
                    }
                }
            };
        });

        services.AddAuthorization();

        return services;
    }
}
