using JassSpace.Api.Configuration;
using JassSpace.Contracts.Interfaces;

namespace JassSpace.Api.Services;

public sealed class HttpResponseCacheStore(
    IRedisCacheService redisCacheService,
    ILogger<HttpResponseCacheStore> logger) : IHttpResponseCacheStore
{
    private static readonly TimeSpan IndexTtl = TimeSpan.FromDays(7);

    public Task<CachedHttpResponse?> GetAsync(string cacheKey, CancellationToken cancellationToken = default)
        => redisCacheService.GetAsync<CachedHttpResponse>(cacheKey, cancellationToken);

    public async Task SetAsync(
        CacheKeyContext keyContext,
        CachedHttpResponse response,
        TimeSpan ttl,
        CancellationToken cancellationToken = default)
    {
        await redisCacheService.SetAsync(keyContext.CacheKey, response, ttl, cancellationToken);
        await AddToBaseIndexAsync(keyContext.BaseKey, keyContext.CacheKey, cancellationToken);
    }

    public async Task InvalidateByBaseKeyAsync(string baseKey, CancellationToken cancellationToken = default)
    {
        var normalizedBaseKey = CacheKeyFormatter.NormalizeSegment(baseKey);
        var indexKey = BuildBaseIndexKey(normalizedBaseKey);
        var cacheKeys = await redisCacheService.GetAsync<HashSet<string>>(indexKey, cancellationToken)
            ?? [];

        foreach (var cacheKey in cacheKeys)
        {
            await redisCacheService.RemoveAsync(cacheKey, cancellationToken);
        }

        await redisCacheService.RemoveAsync(indexKey, cancellationToken);

        logger.LogInformation(
            "Invalidated {Count} cached responses for base key {BaseKey}.",
            cacheKeys.Count,
            normalizedBaseKey);
    }

    private async Task AddToBaseIndexAsync(
        string normalizedBaseKey,
        string cacheKey,
        CancellationToken cancellationToken)
    {
        var indexKey = BuildBaseIndexKey(normalizedBaseKey);
        var knownCacheKeys = await redisCacheService.GetAsync<HashSet<string>>(indexKey, cancellationToken)
            ?? new HashSet<string>(StringComparer.Ordinal);

        if (!knownCacheKeys.Add(cacheKey))
        {
            return;
        }

        await redisCacheService.SetAsync(indexKey, knownCacheKeys, IndexTtl, cancellationToken);
    }

    private static string BuildBaseIndexKey(string normalizedBaseKey)
        => $"cache:index:{normalizedBaseKey}";
}
