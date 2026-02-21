using System.Text.Json;
using JassSpace.Contracts.Interfaces;
using JassSpace.Infra.Configuration;
using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace JassSpace.Infra
{
    public sealed class RedisCacheService(
        IDistributedCache cache,
        IOptions<RedisSettings> settings,
        ILogger<RedisCacheService> logger) : IRedisCacheService
    {
        private readonly IDistributedCache _cache = cache;
        private readonly RedisSettings _settings = settings.Value;
        private readonly ILogger<RedisCacheService> _logger = logger;

        private static readonly JsonSerializerOptions JsonSerializerOptions = new(JsonSerializerDefaults.Web);

        public async Task<T?> GetAsync<T>(string key, CancellationToken cancellationToken = default)
        {
            var raw = await GetStringAsync(key, cancellationToken);
            if (string.IsNullOrWhiteSpace(raw))
            {
                return default;
            }

            try
            {
                return JsonSerializer.Deserialize<T>(raw, JsonSerializerOptions);
            }
            catch (JsonException ex)
            {
                _logger.LogWarning(ex, "Failed to deserialize Redis value for key {Key}", BuildKey(key));
                return default;
            }
        }

        public Task<string?> GetStringAsync(string key, CancellationToken cancellationToken = default)
        {
            return _cache.GetStringAsync(BuildKey(key), cancellationToken);
        }

        public Task SetAsync<T>(string key, T value, TimeSpan? expiry = null, CancellationToken cancellationToken = default)
        {
            var serializedValue = JsonSerializer.Serialize(value, JsonSerializerOptions);
            return SetStringAsync(key, serializedValue, expiry, cancellationToken);
        }

        public Task SetStringAsync(string key, string value, TimeSpan? expiry = null, CancellationToken cancellationToken = default)
        {
            var options = new DistributedCacheEntryOptions
            {
                AbsoluteExpirationRelativeToNow = expiry ?? TimeSpan.FromMinutes(Math.Max(1, _settings.DefaultTtlMinutes))
            };

            return _cache.SetStringAsync(BuildKey(key), value, options, cancellationToken);
        }

        public Task RemoveAsync(string key, CancellationToken cancellationToken = default)
        {
            return _cache.RemoveAsync(BuildKey(key), cancellationToken);
        }

        private string BuildKey(string key)
        {
            if (string.IsNullOrWhiteSpace(key))
            {
                throw new ArgumentException("Cache key cannot be null or whitespace.", nameof(key));
            }

            var trimmedKey = key.Trim();
            return string.IsNullOrWhiteSpace(_settings.InstanceName)
                ? trimmedKey
                : $"{_settings.InstanceName}{trimmedKey}";
        }
    }
}
