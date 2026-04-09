using JassSpace.Api.Extensions;
using JassSpace.Api.Logging;
using JassSpace.Contracts;
using JassSpace.Infra;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Net.Http.Headers;

namespace JassSpace.Api.Controllers;

/// <summary>
/// Base API controller providing common helpers for request context,
/// standardized ProblemDetails responses (RFC 7807), and response envelopes.
/// </summary>
/// <remarks>
/// This controller is hidden from Swagger by default and should be inherited
/// by concrete API controllers.
/// </remarks>
[ApiController]
[Produces("application/json")]
[ApiExplorerSettings(IgnoreApi = true)]
public abstract class BaseApiController : ControllerBase
{
    // -------- Context helpers --------

    /// <summary>
    /// Gets the current request ID alias for the active correlation ID.
    /// </summary>
    protected string? RequestId => RequestLoggingContext.TryGetRequestId(HttpContext);

    /// <summary>
    /// Gets the current correlation ID from normalized request context.
    /// </summary>
    protected string? CorrelationId => RequestLoggingContext.TryGetCorrelationId(HttpContext);

    /// <summary>
    /// Gets the bearer token (without the "Bearer " prefix) from the Authorization header.
    /// </summary>
    protected string? BearerToken =>
        Request.Headers.TryGetValue(HeaderNames.Authorization, out var auth) &&
        auth.ToString().StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase)
            ? auth.ToString()["Bearer ".Length..]
            : null;

    /// <summary>
    /// Gets the user identifier from claims (NameIdentifier or "oid").
    /// </summary>
    protected string? UserId => RequestLoggingContext.TryGetUserId(User);

    /// <summary>
    /// Gets the tenant identifier from claims ("tid" or "tenant_id").
    /// </summary>
    protected string? TenantId =>
        User.FindFirst("tid")?.Value
        ?? User.FindFirst("tenant_id")?.Value;

    /// <summary>
    /// Gets a value indicating whether the current user is authenticated.
    /// </summary>
    protected bool IsAuthenticated => User.Identity?.IsAuthenticated == true;

    // -------- ProblemDetails helpers (RFC 7807) --------

    /// <summary>
    /// Returns a <see cref="ProblemDetails"/> response with 404 Not Found.
    /// </summary>
    protected IActionResult NotFoundProblem(string title = "Resource not found", string? detail = null)
        => Problem(StatusCodes.Status404NotFound, title, detail);

    /// <summary>
    /// Returns a <see cref="ProblemDetails"/> response with 400 Bad Request.
    /// </summary>
    protected IActionResult BadRequestProblem(string title = "Bad request", string? detail = null)
        => Problem(StatusCodes.Status400BadRequest, title, detail);

    /// <summary>
    /// Returns a <see cref="ProblemDetails"/> response with 409 Conflict.
    /// </summary>
    protected IActionResult ConflictProblem(string title = "Conflict", string? detail = null)
        => Problem(StatusCodes.Status409Conflict, title, detail);

    /// <summary>
    /// Returns a <see cref="ProblemDetails"/> response with 403 Forbidden.
    /// </summary>
    protected IActionResult ForbiddenProblem(string title = "Forbidden", string? detail = null)
        => Problem(StatusCodes.Status403Forbidden, title, detail);

    /// <summary>
    /// Returns a <see cref="ProblemDetails"/> response with 401 Unauthorized.
    /// </summary>
    protected IActionResult UnauthorizedProblem(string title = "Unauthorized", string? detail = null)
        => Problem(StatusCodes.Status401Unauthorized, title, detail);

    /// <summary>
    /// Returns a <see cref="ProblemDetails"/> response wrapped in a standardized
    /// <see cref="ApiResponse{T}"/> envelope.
    /// </summary>
    protected IActionResult UnauthorizedProblemEnvelope(string title = "Unauthorized", string? detail = null)
        => ProblemEnvelope(StatusCodes.Status401Unauthorized, title, detail);

    /// <summary>
    /// Returns a <see cref="ProblemDetails"/> response with 429 Too Many Requests (RFC 6585).
    /// Applies standard rate-limit headers when a decision is provided.
    /// </summary>
    protected IActionResult TooManyRequestsProblem(
        string title = "Too many requests",
        string? detail = null,
        RateLimitDecision? decision = null)
    {
        if (decision is not null)
        {
            ApplyRateLimitHeaders(decision);
        }

        IDictionary<string, object?>? extensions = null;
        if (decision is not null)
        {
            extensions = new Dictionary<string, object?>
            {
                ["policy"] = decision.PolicyName,
                ["limit"] = decision.Limit,
                ["windowStart"] = decision.WindowStart,
                ["windowEnd"] = decision.WindowEnd,
                ["retryAfterUtc"] = decision.RetryAfterUtc
            };
        }

        var message = detail ?? decision?.Reason ?? "Rate limit exceeded. Please try again later.";

        return Problem(
            statusCode: StatusCodes.Status429TooManyRequests,
            title: title,
            detail: message,
            type: "https://datatracker.ietf.org/doc/html/rfc6585#section-4",
            instance: null,
            extensions: extensions);
    }

    /// <summary>
    /// Creates a <see cref="ProblemDetails"/> response with extensions.
    /// </summary>
    /// <param name="statusCode">HTTP status code.</param>
    /// <param name="title">Title of the problem.</param>
    /// <param name="detail">Optional detail message.</param>
    /// <param name="type">Problem type URI (default is "about:blank").</param>
    /// <param name="instance">Optional instance URI (defaults to request path).</param>
    /// <param name="extensions">Additional key-value pairs added to extensions.</param>
    protected IActionResult Problem(
        int statusCode,
        string title,
        string? detail = null,
        string? type = "about:blank",
        string? instance = null,
        IDictionary<string, object?>? extensions = null)
    {
        var pd = CreateProblemDetails(statusCode, title, detail, type, instance, extensions);

        return new ObjectResult(pd)
        {
            StatusCode = statusCode,
            ContentTypes = { "application/problem+json" }
        };
    }

    /// <summary>
    /// Creates a <see cref="ProblemDetails"/> envelope response using <see cref="ApiResponse{T}"/>.
    /// </summary>
    protected IActionResult ProblemEnvelope(
        int statusCode,
        string title,
        string? detail = null,
        string? type = "about:blank",
        string? instance = null,
        IDictionary<string, object?>? extensions = null)
    {
        var pd = CreateProblemDetails(statusCode, title, detail, type, instance, extensions);

        return new ObjectResult(new ApiResponse<ProblemDetails>(pd))
        {
            StatusCode = statusCode,
            ContentTypes = { "application/json" }
        };
    }

    /// <summary>
    /// Applies standardized rate-limit headers to the current response.
    /// </summary>
    /// <param name="decision">Rate-limit evaluation result.</param>
    protected void ApplyRateLimitHeaders(RateLimitDecision decision)
    {
        RateLimitResponseExtensions.ApplyRateLimitHeaders(Response, decision);
    }

    // -------- Optional success envelope helpers --------

    /// <summary>
    /// Returns a 200 OK response with a standardized <see cref="ApiResponse{T}"/>.
    /// </summary>
    protected IActionResult OkEnvelope<T>(T data, object? meta = null, bool? isFromCache = null)
        => Ok(new ApiResponse<T>(data, meta, isFromCache));

    /// <summary>
    /// Returns a 201 Created response with a standardized <see cref="ApiResponse{T}"/>.
    /// </summary>
    protected IActionResult CreatedEnvelope<T>(
        string routeName,
        object routeValues,
        T data,
        object? meta = null,
        bool? isFromCache = null)
        => CreatedAtRoute(routeName, routeValues, new ApiResponse<T>(data, meta, isFromCache));

    /// <summary>
    /// Returns a 200 OK response with a paged <see cref="ApiResponse{T}"/>.
    /// </summary>
    protected IActionResult PagedOk<T>(
        IReadOnlyCollection<T> items,
        int page,
        int pageSize,
        long total,
        bool? isFromCache = null)
        => Ok(new ApiResponse<IReadOnlyCollection<T>>(items, new PagedMeta(page, pageSize, total), isFromCache));

    private ProblemDetails CreateProblemDetails(
        int statusCode,
        string title,
        string? detail,
        string? type,
        string? instance,
        IDictionary<string, object?>? extensions)
    {
        var pd = new ProblemDetails
        {
            Status = statusCode,
            Title = title,
            Detail = detail,
            Type = type,
            Instance = instance ?? HttpContext.Request.Path
        };

        if (extensions is not null)
        {
            foreach (var kvp in extensions)
            {
                pd.Extensions[kvp.Key] = kvp.Value;
            }
        }

        if (!string.IsNullOrWhiteSpace(RequestId))
        {
            pd.Extensions[nameof(RequestId)] = RequestId;
        }

        if (!string.IsNullOrWhiteSpace(CorrelationId))
        {
            pd.Extensions[nameof(CorrelationId)] = CorrelationId;
        }

        return pd;
    }
}
