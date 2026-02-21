using JassSpace.Api.Configuration;
using JassSpace.Contracts.Interfaces;
using JassSpace.Contracts.Responses;
using JassSpace.Data;
using Microsoft.EntityFrameworkCore;

namespace JassSpace.Api.Services;

public sealed class BlogCategoryCacheService(
    JassSpaceDbContext dbContext,
    IRedisCacheService redisCacheService,
    ILogger<BlogCategoryCacheService> logger) : IBlogCategoryCacheService
{
    private static readonly TimeSpan CategoriesCacheTtl = TimeSpan.FromMinutes(30);

    public async Task<CacheLookupResult<List<BlogCategoryResponse>>> GetCategoriesAsync(
        CancellationToken cancellationToken = default)
    {
        var cachedCategories = await redisCacheService
            .GetAsync<List<BlogCategoryResponse>>(RedisCacheKeys.BlogCategoriesList, cancellationToken);

        if (cachedCategories is not null)
        {
            return new CacheLookupResult<List<BlogCategoryResponse>>(cachedCategories, IsFromCache: true);
        }

        var categories = await dbContext.BlogCategories
            .AsNoTracking()
            .OrderBy(c => c.Name)
            .Select(c => new BlogCategoryResponse(
                c.Id,
                c.Name,
                c.Slug,
                c.Description,
                c.CreatedAt,
                c.UpdatedAt
            ))
            .ToListAsync(cancellationToken);

        await redisCacheService.SetAsync(
            RedisCacheKeys.BlogCategoriesList,
            categories,
            CategoriesCacheTtl,
            cancellationToken);

        return new CacheLookupResult<List<BlogCategoryResponse>>(categories, IsFromCache: false);
    }

    public async Task InvalidateAsync(CancellationToken cancellationToken = default)
    {
        try
        {
            await redisCacheService.RemoveAsync(RedisCacheKeys.BlogCategoriesList, cancellationToken);
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Failed to invalidate blog category cache.");
        }
    }
}
