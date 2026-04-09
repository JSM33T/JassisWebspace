using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Primitives;

namespace JassSpace.Api.Logging;

public static class RequestLoggingContext
{
    public const string CorrelationIdHeaderName = "X-Correlation-Id";
    public const string LegacyRequestIdHeaderName = "X-Request-Id";
    public const string CorrelationIdItemKey = "CorrelationId";
    public const string RequestIdItemKey = "RequestId";
    public const string UserIdPropertyName = "UserId";
    public const string SessionIdPropertyName = "SessionId";
    public const string CorrelationIdPropertyName = "CorrelationId";
    public const string RequestIdPropertyName = "RequestId";
    public const string ClientIpPropertyName = "ClientIp";
    public const string RequestHostPropertyName = "RequestHost";
    public const string RequestSchemePropertyName = "RequestScheme";

    public static string GetOrCreateCorrelationId(HttpContext context)
    {
        var correlationId = TryGetCorrelationId(context);
        if (!string.IsNullOrWhiteSpace(correlationId))
        {
            return correlationId;
        }

        correlationId = Guid.NewGuid().ToString("N");
        SetCorrelationId(context, correlationId);
        return correlationId;
    }

    public static void SetCorrelationId(HttpContext context, string correlationId)
    {
        context.Items[CorrelationIdItemKey] = correlationId;
        context.Items[RequestIdItemKey] = correlationId;
        context.TraceIdentifier = correlationId;
    }

    public static string? TryGetCorrelationId(HttpContext? context)
    {
        if (context is null)
        {
            return null;
        }

        return context.Items[CorrelationIdItemKey] as string
            ?? context.Items[RequestIdItemKey] as string
            ?? TryGetHeader(context, CorrelationIdHeaderName)
            ?? TryGetHeader(context, LegacyRequestIdHeaderName)
            ?? (!string.IsNullOrWhiteSpace(context.TraceIdentifier) ? context.TraceIdentifier : null);
    }

    public static string? TryGetRequestId(HttpContext? context) => TryGetCorrelationId(context);

    public static string? TryGetUserId(ClaimsPrincipal? user)
        => user?.FindFirst(ClaimTypes.NameIdentifier)?.Value
        ?? user?.FindFirst("oid")?.Value;

    public static string? TryGetSessionId(ClaimsPrincipal? user)
        => user?.FindFirst("session_id")?.Value
        ?? user?.FindFirst("sid")?.Value;

    public static bool IsHealthRequest(HttpContext context)
        => context.Request.Path.Equals("/health", StringComparison.OrdinalIgnoreCase);

    public static string GetRequestPath(HttpContext context)
    {
        var path = context.Request.PathBase.Add(context.Request.Path).Value;
        return string.IsNullOrWhiteSpace(path) ? "/" : path;
    }

    private static string? TryGetHeader(HttpContext context, string name)
        => context.Request.Headers.TryGetValue(name, out StringValues value) && !StringValues.IsNullOrEmpty(value)
            ? value.ToString()
            : null;
}
