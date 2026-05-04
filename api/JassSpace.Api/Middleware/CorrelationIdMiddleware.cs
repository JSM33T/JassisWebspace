using JassSpace.Api.Logging;
using Microsoft.Extensions.Primitives;
using Serilog.Context;

namespace JassSpace.Api.Middleware;

public sealed class CorrelationIdMiddleware(RequestDelegate next)
{
    public async Task Invoke(HttpContext context)
    {
        string correlationId;
        if (context.Request.Headers.TryGetValue(RequestLoggingContext.CorrelationIdHeaderName, out StringValues correlationHeader) &&
            !StringValues.IsNullOrEmpty(correlationHeader))
        {
            correlationId = correlationHeader.ToString();
        }
        else if (context.Request.Headers.TryGetValue(RequestLoggingContext.LegacyRequestIdHeaderName, out StringValues legacyHeader) &&
                 !StringValues.IsNullOrEmpty(legacyHeader))
        {
            correlationId = legacyHeader.ToString();
        }
        else
        {
            correlationId = Guid.NewGuid().ToString("N");
        }

        RequestLoggingContext.SetCorrelationId(context, correlationId);

        context.Response.OnStarting(() =>
        {
            if (!context.Response.Headers.ContainsKey(RequestLoggingContext.CorrelationIdHeaderName))
            {
                context.Response.Headers[RequestLoggingContext.CorrelationIdHeaderName] = correlationId;
            }

            return Task.CompletedTask;
        });

        using (LogContext.PushProperty(RequestLoggingContext.CorrelationIdPropertyName, correlationId))
        using (LogContext.PushProperty(RequestLoggingContext.RequestIdPropertyName, correlationId))
        {
            await next(context);
        }
    }
}
