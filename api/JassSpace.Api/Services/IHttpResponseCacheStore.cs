namespace JassSpace.Api.Services;

public interface IHttpResponseCacheStore
{
    Task<CachedHttpResponse?> GetAsync(string cacheKey, CancellationToken cancellationToken = default);

    Task SetAsync(
        CacheKeyContext keyContext,
        CachedHttpResponse response,
        TimeSpan ttl,
        CancellationToken cancellationToken = default);

    Task InvalidateByBaseKeyAsync(string baseKey, CancellationToken cancellationToken = default);
}

public sealed record CachedHttpResponse(
    int StatusCode,
    string ContentType,
    string PayloadJson);
