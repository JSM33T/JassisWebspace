using JassSpace.Contracts;
using JassSpace.Contracts.Interfaces;
using JassSpace.Contracts.Requests;
using JassSpace.Contracts.Responses;
using JassSpace.Api.Configuration;
using JassSpace.Api.Filters;
using JassSpace.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace JassSpace.Api.Controllers;

[Route("ui-properties")]
public sealed class UiPropertiesController(
    IUiPropertiesService uiPropertiesService,
    IHttpResponseCacheStore responseCacheStore)
    : BaseApiController
{
    [HttpGet]
    [AllowAnonymous]
    [CachedResponse(RedisCacheKeys.UiProperties, TtlSeconds = 86400, Scope = CacheScope.Anonymous, VaryByQuery = false)]
    [ProducesResponseType(typeof(ApiResponse<IReadOnlyCollection<UiPropertyResponse>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetUiProperties(CancellationToken cancellationToken = default)
    {
        var properties = await uiPropertiesService.GetUiPropertiesAsync(cancellationToken);

        return OkEnvelope<IReadOnlyCollection<UiPropertyResponse>>(properties);
    }

    [HttpGet("{key}")]
    [AllowAnonymous]
    [CachedResponse(RedisCacheKeys.UiProperties, TtlSeconds = 86400, Scope = CacheScope.Anonymous, VaryByQuery = false)]
    [ProducesResponseType(typeof(ApiResponse<UiPropertyResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetUiProperty(string key, CancellationToken cancellationToken = default)
    {
        var property = await uiPropertiesService.GetUiPropertyAsync(key, cancellationToken);

        if (property is null)
        {
            return NotFoundProblem("UI property not found", $"No UI property found with key '{key?.Trim()}'.");
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
        var result = await uiPropertiesService.SetUiPropertyAsync(key, request, cancellationToken);
        if (result.Status == UiPropertyUpsertStatus.InvalidKey)
        {
            return BadRequestProblem("Invalid UI property key", result.ErrorMessage);
        }

        if (result.Status == UiPropertyUpsertStatus.InvalidValue)
        {
            return BadRequestProblem("Invalid UI property value", result.ErrorMessage);
        }

        await responseCacheStore.InvalidateByBaseKeyAsync(RedisCacheKeys.UiProperties, cancellationToken);
        return OkEnvelope(result.Property!);
    }
}
