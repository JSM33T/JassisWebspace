using JassSpace.Contracts;
using JassSpace.Contracts.Requests;
using JassSpace.Contracts.Responses;
using JassSpace.Api.Configuration;
using JassSpace.Data;
using JassSpace.Entities;
using JassSpace.Api.Filters;
using JassSpace.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace JassSpace.Api.Controllers;

[Route("ui-properties")]
public sealed class UiPropertiesController(
    JassSpaceDbContext dbContext,
    IHttpResponseCacheStore responseCacheStore)
    : BaseApiController
{
    [HttpGet]
    [AllowAnonymous]
    [CachedResponse(RedisCacheKeys.UiProperties, TtlSeconds = 86400, Scope = CacheScope.Anonymous, VaryByQuery = false)]
    [ProducesResponseType(typeof(ApiResponse<IReadOnlyCollection<UiPropertyResponse>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetUiProperties(CancellationToken cancellationToken = default)
    {
        var properties = await dbContext.UiProperties
            .AsNoTracking()
            .OrderBy(p => p.Key)
            .Select(p => new UiPropertyResponse(
                p.Id,
                p.Key,
                p.Value,
                p.UpdatedAt))
            .ToListAsync(cancellationToken);

        return OkEnvelope<IReadOnlyCollection<UiPropertyResponse>>(properties);
    }

    [HttpGet("{key}")]
    [AllowAnonymous]
    [CachedResponse(RedisCacheKeys.UiProperties, TtlSeconds = 86400, Scope = CacheScope.Anonymous, VaryByQuery = false)]
    [ProducesResponseType(typeof(ApiResponse<UiPropertyResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetUiProperty(string key, CancellationToken cancellationToken = default)
    {
        var normalizedKey = NormalizeKey(key);
        if (normalizedKey is null)
        {
            return NotFoundProblem("UI property not found");
        }

        var property = await dbContext.UiProperties
            .AsNoTracking()
            .Where(p => p.Key == normalizedKey)
            .Select(p => new UiPropertyResponse(
                p.Id,
                p.Key,
                p.Value,
                p.UpdatedAt))
            .FirstOrDefaultAsync(cancellationToken);

        if (property is null)
        {
            return NotFoundProblem("UI property not found", $"No UI property found with key '{normalizedKey}'.");
        }

        return OkEnvelope(property);
    }

    [HttpPut("{key}")]
    [Authorize(Roles = "admin")]
    [ProducesResponseType(typeof(ApiResponse<UiPropertyResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> SetUiProperty(
        string key,
        [FromBody] SetUiPropertyRequest request,
        CancellationToken cancellationToken = default)
    {
        var normalizedKey = NormalizeKey(key);
        if (normalizedKey is null)
        {
            return BadRequestProblem("Invalid UI property key", "The property key is required.");
        }

        if (request.Value is null)
        {
            return BadRequestProblem("Invalid UI property value", "The property value is required.");
        }

        var property = await dbContext.UiProperties
            .FirstOrDefaultAsync(p => p.Key == normalizedKey, cancellationToken);

        if (property is null)
        {
            property = new UiProperties
            {
                Id = Guid.NewGuid(),
                Key = normalizedKey,
                Value = request.Value,
                UpdatedAt = DateTimeOffset.UtcNow
            };

            dbContext.UiProperties.Add(property);
        }
        else
        {
            property.Value = request.Value;
            property.UpdatedAt = DateTimeOffset.UtcNow;
        }

        await dbContext.SaveChangesAsync(cancellationToken);
        await responseCacheStore.InvalidateByBaseKeyAsync(RedisCacheKeys.UiProperties, cancellationToken);

        var response = new UiPropertyResponse(
            property.Id,
            property.Key,
            property.Value,
            property.UpdatedAt);

        return OkEnvelope(response);
    }

    private static string? NormalizeKey(string? key)
    {
        var normalized = key?.Trim();
        return string.IsNullOrWhiteSpace(normalized) ? null : normalized;
    }
}
