using JassSpace.Api.Logging;
using JassSpace.Api.Middleware;
using Microsoft.AspNetCore.Http;
using System.IO;

namespace JassSpace.tests.Middleware;

public sealed class CorrelationIdMiddlewareTests
{
    [Fact]
    public async Task Invoke_PreservesIncomingCorrelationId_AndStoresItForDownstreamAccess()
    {
        const string expectedCorrelationId = "incoming-correlation-id";
        var httpContext = new DefaultHttpContext();
        httpContext.Response.Body = new MemoryStream();
        httpContext.Request.Headers[RequestLoggingContext.CorrelationIdHeaderName] = expectedCorrelationId;

        var middleware = new CorrelationIdMiddleware(async context =>
        {
            await context.Response.WriteAsync("ok");
        });

        await middleware.Invoke(httpContext);
        Assert.Equal(expectedCorrelationId, httpContext.TraceIdentifier);
        Assert.Equal(expectedCorrelationId, RequestLoggingContext.TryGetCorrelationId(httpContext));
    }

    [Fact]
    public async Task Invoke_GeneratesCorrelationId_WhenRequestDoesNotProvideOne()
    {
        var httpContext = new DefaultHttpContext();
        httpContext.Response.Body = new MemoryStream();

        var middleware = new CorrelationIdMiddleware(async context =>
        {
            await context.Response.WriteAsync("ok");
        });

        await middleware.Invoke(httpContext);
        var correlationId = RequestLoggingContext.TryGetCorrelationId(httpContext);

        Assert.False(string.IsNullOrWhiteSpace(correlationId));
        Assert.Equal(correlationId, httpContext.TraceIdentifier);
    }

    [Fact]
    public async Task Invoke_UsesLegacyRequestIdHeader_WhenCorrelationHeaderIsMissing()
    {
        var httpContext = new DefaultHttpContext();
        httpContext.Response.Body = new MemoryStream();
        httpContext.Request.Headers[RequestLoggingContext.LegacyRequestIdHeaderName] = "legacy-request-id";

        var middleware = new CorrelationIdMiddleware(_ => Task.CompletedTask);

        await middleware.Invoke(httpContext);

        Assert.Equal("legacy-request-id", RequestLoggingContext.TryGetCorrelationId(httpContext));
        Assert.Equal("legacy-request-id", httpContext.TraceIdentifier);
    }

    [Fact]
    public async Task Invoke_SetsSharedRequestContextItemKeys()
    {
        var httpContext = new DefaultHttpContext();
        httpContext.Response.Body = new MemoryStream();

        var middleware = new CorrelationIdMiddleware(_ => Task.CompletedTask);

        await middleware.Invoke(httpContext);

        var correlationId = RequestLoggingContext.TryGetCorrelationId(httpContext);

        Assert.Equal(correlationId, httpContext.Items[RequestLoggingContext.CorrelationIdItemKey]);
        Assert.Equal(correlationId, httpContext.Items[RequestLoggingContext.RequestIdItemKey]);
    }
}
