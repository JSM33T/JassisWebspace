using JassSpace.Api.Configuration;

namespace JassSpace.Api.Services;

public interface ICacheSubjectResolver
{
    string? ResolveSubject(HttpContext httpContext, CacheScope scope);
}
