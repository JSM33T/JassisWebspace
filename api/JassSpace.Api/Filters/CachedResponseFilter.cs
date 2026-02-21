using System.Text.Json;
using System.Text.Json.Nodes;
using JassSpace.Api.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.Extensions.Options;

namespace JassSpace.Api.Filters;

public sealed class CachedResponseFilter(
    CachedResponseAttribute attribute,
    IRequestCacheKeyBuilder cacheKeyBuilder,
    IHttpResponseCacheStore responseCacheStore,
    IOptions<JsonOptions> jsonOptions,
    ILogger<CachedResponseFilter> logger) : IAsyncActionFilter
{
    private readonly JsonSerializerOptions _jsonSerializerOptions = jsonOptions.Value.JsonSerializerOptions;

    public async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
    {
        if (!HttpMethods.IsGet(context.HttpContext.Request.Method))
        {
            await next();
            return;
        }

        var cancellationToken = context.HttpContext.RequestAborted;
        var keyContext = cacheKeyBuilder.TryBuild(context.HttpContext, attribute);
        if (keyContext is null)
        {
            await next();
            return;
        }

        var cachedResponse = await responseCacheStore.GetAsync(keyContext.Value.CacheKey, cancellationToken);
        if (cachedResponse is not null)
        {
            var payloadWithCacheFlag = EnsureCacheFlag(cachedResponse.PayloadJson);
            context.Result = new ContentResult
            {
                Content = payloadWithCacheFlag,
                ContentType = cachedResponse.ContentType,
                StatusCode = cachedResponse.StatusCode
            };
            return;
        }

        var executedContext = await next();
        if (executedContext.Exception is not null && !executedContext.ExceptionHandled)
        {
            return;
        }

        if (!TryCaptureResponse(executedContext.Result, out var cachedResult))
        {
            return;
        }

        var ttl = TimeSpan.FromSeconds(Math.Max(1, attribute.TtlSeconds));
        await responseCacheStore.SetAsync(keyContext.Value, cachedResult, ttl, cancellationToken);
    }

    private bool TryCaptureResponse(IActionResult? actionResult, out CachedHttpResponse response)
    {
        response = default!;

        switch (actionResult)
        {
            case ObjectResult objectResult:
            {
                var statusCode = objectResult.StatusCode ?? StatusCodes.Status200OK;
                if (statusCode != StatusCodes.Status200OK)
                {
                    return false;
                }

                var payloadJson = JsonSerializer.Serialize(objectResult.Value, _jsonSerializerOptions);
                var contentType = objectResult.ContentTypes.FirstOrDefault() ?? "application/json; charset=utf-8";
                response = new CachedHttpResponse(statusCode, contentType, payloadJson);
                return true;
            }
            case JsonResult jsonResult:
            {
                var statusCode = jsonResult.StatusCode ?? StatusCodes.Status200OK;
                if (statusCode != StatusCodes.Status200OK)
                {
                    return false;
                }

                var payloadJson = JsonSerializer.Serialize(jsonResult.Value, _jsonSerializerOptions);
                var contentType = jsonResult.ContentType ?? "application/json; charset=utf-8";
                response = new CachedHttpResponse(statusCode, contentType, payloadJson);
                return true;
            }
            default:
                return false;
        }
    }

    private string EnsureCacheFlag(string payloadJson)
    {
        try
        {
            var node = JsonNode.Parse(payloadJson);
            if (node is not JsonObject jsonObject)
            {
                return payloadJson;
            }

            jsonObject["isFromCache"] = true;
            return jsonObject.ToJsonString(_jsonSerializerOptions);
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Failed to append isFromCache flag to cached response payload.");
            return payloadJson;
        }
    }
}
