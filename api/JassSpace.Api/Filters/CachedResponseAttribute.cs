using JassSpace.Api.Configuration;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.Extensions.DependencyInjection;

namespace JassSpace.Api.Filters;

[AttributeUsage(AttributeTargets.Method)]
public sealed class CachedResponseAttribute(string baseKey) : Attribute, IFilterFactory, IOrderedFilter
{
    public string BaseKey { get; } = baseKey;
    public int TtlSeconds { get; init; } = 300;
    public CacheScope Scope { get; init; } = CacheScope.UserOrAnonymous;
    public bool VaryByQuery { get; init; } = true;
    public string[] VaryByHeaders { get; init; } = Array.Empty<string>();

    public int Order { get; set; } = int.MinValue + 100;
    public bool IsReusable => false;

    public IFilterMetadata CreateInstance(IServiceProvider serviceProvider)
        => ActivatorUtilities.CreateInstance<CachedResponseFilter>(serviceProvider, this);
}
