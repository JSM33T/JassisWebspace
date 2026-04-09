using JassSpace.Api.Logging;
using Microsoft.AspNetCore.Http;
using System.Security.Claims;

namespace JassSpace.tests.Logging;

public sealed class RequestLoggingContextTests
{
    [Fact]
    public void GetOrCreateCorrelationId_GeneratesAndStoresSharedRequestIdentifiers()
    {
        var httpContext = new DefaultHttpContext();
        httpContext.TraceIdentifier = string.Empty;

        var correlationId = RequestLoggingContext.GetOrCreateCorrelationId(httpContext);

        Assert.False(string.IsNullOrWhiteSpace(correlationId));
        Assert.Equal(correlationId, RequestLoggingContext.TryGetCorrelationId(httpContext));
        Assert.Equal(correlationId, RequestLoggingContext.TryGetRequestId(httpContext));
        Assert.Equal(correlationId, httpContext.TraceIdentifier);
        Assert.Equal(correlationId, httpContext.Items[RequestLoggingContext.CorrelationIdItemKey]);
        Assert.Equal(correlationId, httpContext.Items[RequestLoggingContext.RequestIdItemKey]);
    }

    [Fact]
    public void TryGetCorrelationId_PrefersStoredContextOverHeaders()
    {
        var httpContext = new DefaultHttpContext();
        httpContext.Request.Headers[RequestLoggingContext.CorrelationIdHeaderName] = "header-correlation-id";
        httpContext.Items[RequestLoggingContext.CorrelationIdItemKey] = "stored-correlation-id";

        var correlationId = RequestLoggingContext.TryGetCorrelationId(httpContext);

        Assert.Equal("stored-correlation-id", correlationId);
    }

    [Fact]
    public void TryGetCorrelationId_FallsBackToLegacyRequestIdHeader()
    {
        var httpContext = new DefaultHttpContext();
        httpContext.Request.Headers[RequestLoggingContext.LegacyRequestIdHeaderName] = "legacy-request-id";

        var correlationId = RequestLoggingContext.TryGetCorrelationId(httpContext);

        Assert.Equal("legacy-request-id", correlationId);
        Assert.Equal("legacy-request-id", RequestLoggingContext.TryGetRequestId(httpContext));
    }

    [Fact]
    public void TryGetUserId_AndSessionId_ReadExpectedClaims()
    {
        var principal = new ClaimsPrincipal(
            new ClaimsIdentity(
            [
                new Claim(ClaimTypes.NameIdentifier, "user-123"),
                new Claim("sid", "session-456")
            ]));

        Assert.Equal("user-123", RequestLoggingContext.TryGetUserId(principal));
        Assert.Equal("session-456", RequestLoggingContext.TryGetSessionId(principal));
    }

    [Fact]
    public void IsHealthRequest_OnlyMatchesHealthPath()
    {
        var healthContext = new DefaultHttpContext();
        healthContext.Request.Path = "/health";

        var otherContext = new DefaultHttpContext();
        otherContext.Request.Path = "/contact";

        Assert.True(RequestLoggingContext.IsHealthRequest(healthContext));
        Assert.False(RequestLoggingContext.IsHealthRequest(otherContext));
    }

    [Fact]
    public void GetRequestPath_CombinesPathBaseAndPath()
    {
        var httpContext = new DefaultHttpContext();
        httpContext.Request.PathBase = "/api";
        httpContext.Request.Path = "/auth/login";

        var path = RequestLoggingContext.GetRequestPath(httpContext);

        Assert.Equal("/api/auth/login", path);
    }
}
