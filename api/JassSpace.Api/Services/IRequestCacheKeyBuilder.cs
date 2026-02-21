using JassSpace.Api.Filters;

namespace JassSpace.Api.Services;

public interface IRequestCacheKeyBuilder
{
    CacheKeyContext? TryBuild(HttpContext httpContext, CachedResponseAttribute attribute);
}

public readonly record struct CacheKeyContext(
    string BaseKey,
    string SubjectKey,
    string CacheKey);
