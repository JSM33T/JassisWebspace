using JassSpace.Contracts.Responses;

namespace JassSpace.Api.Services;

public interface IBlogCategoryCacheService
{
    Task<CacheLookupResult<List<BlogCategoryResponse>>> GetCategoriesAsync(CancellationToken cancellationToken = default);
    Task InvalidateAsync(CancellationToken cancellationToken = default);
}

public readonly record struct CacheLookupResult<T>(T Data, bool IsFromCache);
