namespace JassSpace.Contracts.Interfaces
{
    /// <summary>
    /// Provides basic Redis-backed cache operations for application data.
    /// </summary>
    public interface IRedisCacheService
    {
        Task<T?> GetAsync<T>(string key, CancellationToken cancellationToken = default);
        Task<string?> GetStringAsync(string key, CancellationToken cancellationToken = default);
        Task SetAsync<T>(string key, T value, TimeSpan? expiry = null, CancellationToken cancellationToken = default);
        Task SetStringAsync(string key, string value, TimeSpan? expiry = null, CancellationToken cancellationToken = default);
        Task RemoveAsync(string key, CancellationToken cancellationToken = default);
    }
}
