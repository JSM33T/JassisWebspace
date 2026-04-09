using System.IdentityModel.Tokens.Jwt;
using JassSpace.Api.Configuration;
using JassSpace.Api.Services;
using JassSpace.Entities;
using JassSpace.Tests.Support;
using Microsoft.Extensions.Options;

namespace JassSpace.Tests.Services;

public sealed class JwtServiceTests
{
    [Fact]
    public void GenerateToken_IncludesSessionClaims_WhenSessionIdProvided()
    {
        var logger = new TestLogger<JwtService>();
        var service = CreateJwtService(logger);
        var sessionId = Guid.NewGuid();

        var token = service.GenerateToken(CreateUser(), sessionId);
        var jwt = new JwtSecurityTokenHandler().ReadJwtToken(token);

        Assert.Equal(sessionId.ToString(), jwt.Claims.First(c => c.Type == "session_id").Value);
        Assert.Equal(sessionId.ToString(), jwt.Claims.First(c => c.Type == "sid").Value);
    }

    [Fact]
    public void GenerateToken_OmitsSessionClaims_WhenSessionIdMissing()
    {
        var service = CreateJwtService(new TestLogger<JwtService>());

        var token = service.GenerateToken(CreateUser(), sessionId: null);
        var jwt = new JwtSecurityTokenHandler().ReadJwtToken(token);

        Assert.DoesNotContain(jwt.Claims, c => c.Type == "session_id");
        Assert.DoesNotContain(jwt.Claims, c => c.Type == "sid");
    }

    [Fact]
    public void ValidateToken_ReturnsPrincipal_ForValidToken()
    {
        var service = CreateJwtService(new TestLogger<JwtService>());
        var token = service.GenerateToken(CreateUser(), Guid.NewGuid());

        var principal = service.ValidateToken(token);

        Assert.NotNull(principal);
        Assert.Equal("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", principal!.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value);
    }

    [Fact]
    public void ValidateToken_ReturnsNull_ForMalformedToken()
    {
        var service = CreateJwtService(new TestLogger<JwtService>());

        var principal = service.ValidateToken("not-a-token");

        Assert.Null(principal);
    }

    [Fact]
    public void GenerateToken_LogsWithoutUsernameOrEmail()
    {
        var logger = new TestLogger<JwtService>();
        var user = CreateUser();
        var service = CreateJwtService(logger);

        service.GenerateToken(user, Guid.Parse("11111111-1111-1111-1111-111111111111"));

        var entry = Assert.Single(logger.Entries);
        Assert.Equal(Microsoft.Extensions.Logging.LogLevel.Debug, entry.Level);
        Assert.DoesNotContain(user.Username.ToLowerInvariant(), entry.Message.ToLowerInvariant());
        Assert.DoesNotContain(user.Email.ToLowerInvariant(), entry.Message.ToLowerInvariant());
    }

    private static JwtService CreateJwtService(TestLogger<JwtService> logger)
        => new(
            Options.Create(new JwtSettings
            {
                SecretKey = "0123456789abcdef0123456789abcdef",
                Issuer = "JassSpace.Tests",
                Audience = "JassSpace.Tests.Client",
                ExpiryMinutes = 15
            }),
            logger);

    private static User CreateUser() => new()
    {
        Id = Guid.Parse("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"),
        Email = "user@example.com",
        Username = "testuser",
        PasswordHash = "hash",
        EmailVerified = true
    };
}
