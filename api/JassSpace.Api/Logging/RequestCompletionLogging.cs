using Serilog;
using Serilog.Events;

namespace JassSpace.Api.Logging;

public static class RequestCompletionLogging
{
    public static LogEventLevel GetLogLevel(HttpContext httpContext, Exception? exception)
    {
        if (RequestLoggingContext.IsHealthRequest(httpContext))
        {
            return LogEventLevel.Debug;
        }

        if (exception is not null || httpContext.Response.StatusCode >= StatusCodes.Status500InternalServerError)
        {
            return LogEventLevel.Error;
        }

        return LogEventLevel.Information;
    }

    public static void EnrichDiagnosticContext(IDiagnosticContext diagnosticContext, HttpContext httpContext)
    {
        var correlationId = RequestLoggingContext.GetOrCreateCorrelationId(httpContext);

        diagnosticContext.Set(RequestLoggingContext.CorrelationIdPropertyName, correlationId);
        diagnosticContext.Set(RequestLoggingContext.RequestIdPropertyName, correlationId);
        diagnosticContext.Set(RequestLoggingContext.RequestHostPropertyName, httpContext.Request.Host.Value);
        diagnosticContext.Set(RequestLoggingContext.RequestSchemePropertyName, httpContext.Request.Scheme);
        diagnosticContext.Set(RequestLoggingContext.ClientIpPropertyName, httpContext.Connection.RemoteIpAddress?.ToString());

        var userId = RequestLoggingContext.TryGetUserId(httpContext.User);
        if (!string.IsNullOrWhiteSpace(userId))
        {
            diagnosticContext.Set(RequestLoggingContext.UserIdPropertyName, userId);
        }

        var sessionId = RequestLoggingContext.TryGetSessionId(httpContext.User);
        if (!string.IsNullOrWhiteSpace(sessionId))
        {
            diagnosticContext.Set(RequestLoggingContext.SessionIdPropertyName, sessionId);
        }

        diagnosticContext.Set("RequestPath", RequestLoggingContext.GetRequestPath(httpContext));
    }
}
