using System.Text.Json;
using JassSpace.Api.Extensions;
using JassSpace.Api.Configuration;
using JassSpace.Api.Services;
using JassSpace.Contracts;
using JassSpace.Contracts.Requests;
using JassSpace.Contracts.Responses;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;

namespace JassSpace.Api.Controllers;

[Route("bot")]
public sealed class BotController(
    IOpenRouterBotService botService,
    IOptions<OpenRouterSettings> openRouterSettings,
    ILogger<BotController> logger)
    : BaseApiController
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);
    private static readonly HashSet<string> AllowedRoles = ["system", "user", "assistant"];
    private readonly string _configuredModel = string.IsNullOrWhiteSpace(openRouterSettings.Value?.Model)
        ? "unknown"
        : openRouterSettings.Value.Model.Trim();

    [HttpPost("chat")]
    [AllowAnonymous]
    [RateLimit("bot-chat", Partition = RateLimitPartitionStrategy.IpAddress)]
    [ProducesResponseType(typeof(ApiResponse<BotChatResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status429TooManyRequests)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status502BadGateway)]
    public async Task<IActionResult> CreateChatCompletion(
        [FromBody] CreateBotChatRequest request,
        CancellationToken cancellationToken = default)
    {
        var validationProblem = ValidateRequest(request, out var normalizedMessages);
        if (validationProblem is not null)
        {
            return validationProblem;
        }

        try
        {
            var completion = await botService.GetCompletionAsync(normalizedMessages!, cancellationToken);
            return OkEnvelope(new BotChatResponse(
                completion.Message,
                completion.Model,
                completion.CreatedAt));
        }
        catch (OpenRouterBotException ex)
        {
            logger.LogWarning(ex, "Bot completion failed.");
            return Problem(
                ex.StatusCode ?? StatusCodes.Status502BadGateway,
                ex.StatusCode == StatusCodes.Status503ServiceUnavailable ? "Bot unavailable" : "Bot provider error",
                ex.Message);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Unexpected bot completion failure.");
            return Problem(
                StatusCodes.Status500InternalServerError,
                "Bot request failed",
                "An unexpected error occurred while generating the reply.");
        }
    }

    [HttpPost("chat/stream")]
    [AllowAnonymous]
    [RateLimit("bot-chat", Partition = RateLimitPartitionStrategy.IpAddress)]
    [Produces("text/event-stream")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status429TooManyRequests)]
    public async Task<IActionResult> StreamChatCompletion(
        [FromBody] CreateBotChatRequest request,
        CancellationToken cancellationToken = default)
    {
        var validationProblem = ValidateRequest(request, out var normalizedMessages);
        if (validationProblem is not null)
        {
            return validationProblem;
        }

        Response.StatusCode = StatusCodes.Status200OK;
        Response.Headers.ContentType = "text/event-stream";
        Response.Headers.CacheControl = "no-cache";
        Response.Headers.Append("X-Accel-Buffering", "no");

        try
        {
            await WriteEventAsync(
                "start",
                new BotStreamStartResponse(_configuredModel, DateTimeOffset.UtcNow),
                cancellationToken);

            var completion = await botService.StreamCompletionAsync(
                normalizedMessages!,
                async (delta, ct) =>
                {
                    await WriteEventAsync("delta", new BotStreamDeltaResponse(delta), ct);
                },
                cancellationToken);

            await WriteEventAsync(
                "complete",
                new BotStreamCompleteResponse(
                    completion.Message,
                    completion.Model,
                    completion.CreatedAt),
                cancellationToken);
        }
        catch (OperationCanceledException)
        {
            logger.LogInformation("Bot stream cancelled by client.");
        }
        catch (OpenRouterBotException ex)
        {
            logger.LogWarning(ex, "Bot stream failed.");
            await WriteEventAsync("error", new BotStreamErrorResponse(ex.Message), CancellationToken.None);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Unexpected bot stream failure.");
            await WriteEventAsync(
                "error",
                new BotStreamErrorResponse("An unexpected error occurred while streaming the reply."),
                CancellationToken.None);
        }

        return new EmptyResult();
    }

    private IActionResult? ValidateRequest(
        CreateBotChatRequest request,
        out IReadOnlyList<BotChatMessageRequest>? normalizedMessages)
    {
        normalizedMessages = null;

        if (request.Messages is null || request.Messages.Count == 0)
        {
            return BadRequestProblem("Invalid messages", "At least one message is required.");
        }

        if (request.Messages.Count > 20)
        {
            return BadRequestProblem("Too many messages", "A maximum of 20 messages is allowed per request.");
        }

        var normalized = new List<BotChatMessageRequest>(request.Messages.Count);
        foreach (var message in request.Messages)
        {
            var role = message.Role?.Trim().ToLowerInvariant();
            var content = message.Content?.Trim();

            if (string.IsNullOrWhiteSpace(role) || !AllowedRoles.Contains(role))
            {
                return BadRequestProblem("Invalid role", "Messages must use the role system, user, or assistant.");
            }

            if (string.IsNullOrWhiteSpace(content))
            {
                return BadRequestProblem("Invalid message", "Message content is required.");
            }

            if (content.Length > 4000)
            {
                return BadRequestProblem("Message too long", "Each message must be 4000 characters or less.");
            }

            normalized.Add(new BotChatMessageRequest(role, content));
        }

        normalizedMessages = normalized;
        return null;
    }

    private async Task WriteEventAsync(string eventName, object payload, CancellationToken cancellationToken)
    {
        await Response.WriteAsync($"event: {eventName}\n", cancellationToken);
        await Response.WriteAsync($"data: {JsonSerializer.Serialize(payload, JsonOptions)}\n\n", cancellationToken);
        await Response.Body.FlushAsync(cancellationToken);
    }
}
