using JassSpace.Api.Filters;

namespace JassSpace.Api.Services;

public interface IRequestCacheKeyBuilder
{
    CacheKeyContext? TryBuild(HttpContext httpContext, CachedResponseAttribute attribute);
}

public readonly record struct CacheKeyContext(
    string BaseKey,
    // ReSharper disable once NotAccessedPositionalProperty.Global
    string SubjectKey,
    string CacheKey);
