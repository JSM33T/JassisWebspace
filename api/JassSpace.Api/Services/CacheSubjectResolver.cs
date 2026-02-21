using System.Security.Claims;
using JassSpace.Api.Configuration;

namespace JassSpace.Api.Services;

public sealed class CacheSubjectResolver : ICacheSubjectResolver
{
    public string? ResolveSubject(HttpContext httpContext, CacheScope scope)
    {
        var userId = httpContext.User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? httpContext.User.FindFirst("oid")?.Value;

        return scope switch
        {
            CacheScope.Anonymous => "anonymous",
            CacheScope.User => string.IsNullOrWhiteSpace(userId) ? null : $"user_{userId}",
            CacheScope.UserOrAnonymous => string.IsNullOrWhiteSpace(userId) ? "anonymous" : $"user_{userId}",
            _ => "anonymous"
        };
    }
}
