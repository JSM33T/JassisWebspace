using System.Net;
using System.Security.Claims;
using JassSpace.Api.Logging;
using JassSpace.Tests.Support;
using Microsoft.AspNetCore.Http;
using Serilog.Events;

namespace JassSpace.Tests.Logging;

public sealed class RequestCompletionLoggingTests
{
    [Fact]
    public void GetLogLevel_UsesDebugForHealth()
    {
        var httpContext = new DefaultHttpContext();
        httpContext.Request.Path = "/health";

        var level = RequestCompletionLogging.GetLogLevel(httpContext, exception: null);

        Assert.Equal(LogEventLevel.Debug, level);
    }

    [Fact]
    public void GetLogLevel_UsesInformationForClientErrors()
    {
        var httpContext = new DefaultHttpContext();
        httpContext.Response.StatusCode = StatusCodes.Status404NotFound;

        var level = RequestCompletionLogging.GetLogLevel(httpContext, exception: null);

        Assert.Equal(LogEventLevel.Information, level);
    }

    [Fact]
    public void GetLogLevel_UsesErrorForServerErrorsAndExceptions()
    {
        var serverErrorContext = new DefaultHttpContext();
        serverErrorContext.Response.StatusCode = StatusCodes.Status500InternalServerError;

        Assert.Equal(LogEventLevel.Error, RequestCompletionLogging.GetLogLevel(serverErrorContext, exception: null));
        Assert.Equal(LogEventLevel.Error, RequestCompletionLogging.GetLogLevel(new DefaultHttpContext(), new InvalidOperationException("boom")));
    }

    [Fact]
    public void EnrichDiagnosticContext_AddsStructuredRequestProperties()
    {
        var httpContext = new DefaultHttpContext();
        httpContext.Request.Scheme = "https";
        httpContext.Request.Host = new HostString("api.jassi.me");
        httpContext.Request.PathBase = "/v1";
        httpContext.Request.Path = "/profile";
        httpContext.Connection.RemoteIpAddress = IPAddress.Parse("203.0.113.10");
        httpContext.User = new ClaimsPrincipal(
            new ClaimsIdentity(
            [
                new Claim(ClaimTypes.NameIdentifier, "user-123"),
                new Claim("sid", "session-456")
            ]));

        var diagnosticContext = new TestDiagnosticContext();

        RequestCompletionLogging.EnrichDiagnosticContext(diagnosticContext, httpContext);

        Assert.Equal(RequestLoggingContext.TryGetCorrelationId(httpContext), diagnosticContext.Values["CorrelationId"]);
        Assert.Equal(RequestLoggingContext.TryGetRequestId(httpContext), diagnosticContext.Values["RequestId"]);
        Assert.Equal("api.jassi.me", diagnosticContext.Values["RequestHost"]);
        Assert.Equal("https", diagnosticContext.Values["RequestScheme"]);
        Assert.Equal("203.0.113.10", diagnosticContext.Values["ClientIp"]);
        Assert.Equal("user-123", diagnosticContext.Values["UserId"]);
        Assert.Equal("session-456", diagnosticContext.Values["SessionId"]);
        Assert.Equal("/v1/profile", diagnosticContext.Values["RequestPath"]);
    }
}
