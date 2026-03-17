using System.Text.Json;
using JassSpace.Api.Extensions;
using JassSpace.Api.Configuration;
using JassSpace.Api.Services;
using JassSpace.Contracts;
using JassSpace.Contracts.Requests;
using JassSpace.Contracts.Responses;
using JassSpace.Data;
using JassSpace.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace JassSpace.Api.Controllers;

[Route("bot")]
public sealed class BotController(
    IOpenRouterBotService botService,
    IBotMcpBridgeService botMcpBridgeService,
    IOptions<OpenRouterSettings> openRouterSettings,
    JassSpaceDbContext dbContext,
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
            var chat = await UpsertChatAsync(request.ChatId, normalizedMessages!, cancellationToken);
            var bridgeResult = await botMcpBridgeService.ResolveAsync(normalizedMessages!, cancellationToken);
            var completion = bridgeResult.DirectResponse is not null
                ? CreateDirectCompletionResult(bridgeResult)
                : await botService.GetCompletionAsync(bridgeResult.Messages, cancellationToken);
            await FinalizeChatAsync(chat, completion, cancellationToken);
            return OkEnvelope(new BotChatResponse(
                chat.Id,
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
            var chat = await UpsertChatAsync(request.ChatId, normalizedMessages!, cancellationToken);
            var bridgeResult = await botMcpBridgeService.ResolveAsync(normalizedMessages!, cancellationToken);
            var streamModel = string.IsNullOrWhiteSpace(bridgeResult.Model) ? _configuredModel : bridgeResult.Model;
            await WriteEventAsync(
                "start",
                new BotStreamStartResponse(chat.Id, streamModel, DateTimeOffset.UtcNow),
                cancellationToken);

            BotChatCompletionResult completion;
            if (bridgeResult.DirectResponse is not null)
            {
                await WriteEventAsync("delta", new BotStreamDeltaResponse(bridgeResult.DirectResponse), cancellationToken);
                completion = CreateDirectCompletionResult(bridgeResult);
            }
            else
            {
                completion = await botService.StreamCompletionAsync(
                    bridgeResult.Messages,
                    async (delta, ct) =>
                    {
                        await WriteEventAsync("delta", new BotStreamDeltaResponse(delta), ct);
                    },
                    cancellationToken);
            }

            await FinalizeChatAsync(chat, completion, cancellationToken);
            await WriteEventAsync(
                "complete",
                new BotStreamCompleteResponse(
                    chat.Id,
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

    private static BotChatCompletionResult CreateDirectCompletionResult(BotMcpBridgeResult bridgeResult)
    {
        return new BotChatCompletionResult(
            bridgeResult.DirectResponse ?? string.Empty,
            string.IsNullOrWhiteSpace(bridgeResult.Model) ? "mcp/direct" : bridgeResult.Model,
            DateTimeOffset.UtcNow);
    }

    private async Task<Chat> UpsertChatAsync(
        Guid? requestedChatId,
        IReadOnlyList<BotChatMessageRequest> normalizedMessages,
        CancellationToken cancellationToken)
    {
        var chatId = requestedChatId is { } value && value != Guid.Empty
            ? value
            : Guid.NewGuid();

        var utcNow = DateTimeOffset.UtcNow;
        var incomingMessages = normalizedMessages
            .Select(message => new PersistedChatMessage(message.Role, message.Content))
            .ToList();

        var chat = await dbContext.Chats.SingleOrDefaultAsync(c => c.Id == chatId, cancellationToken);
        var mergedMessages = MergeMessages(chat is null ? [] : ReadStoredMessages(chat), incomingMessages);

        if (chat is null)
        {
            chat = new Chat
            {
                Id = chatId,
                MessagesJson = SerializeMessages(mergedMessages),
                CreatedAt = utcNow,
                UpdatedAt = utcNow
            };

            dbContext.Chats.Add(chat);
        }
        else
        {
            chat.MessagesJson = SerializeMessages(mergedMessages);
            chat.UpdatedAt = utcNow;
        }

        await dbContext.SaveChangesAsync(cancellationToken);
        return chat;
    }

    private async Task FinalizeChatAsync(
        Chat chat,
        BotChatCompletionResult completion,
        CancellationToken cancellationToken)
    {
        var storedMessages = ReadStoredMessages(chat);
        var assistantMessage = new PersistedChatMessage("assistant", completion.Message);

        if (storedMessages.Count == 0 || !MessageEquals(storedMessages[^1], assistantMessage))
        {
            storedMessages.Add(assistantMessage);
        }

        chat.MessagesJson = SerializeMessages(storedMessages);
        chat.Model = completion.Model;
        chat.UpdatedAt = completion.CreatedAt;

        await dbContext.SaveChangesAsync(cancellationToken);
    }

    private List<PersistedChatMessage> ReadStoredMessages(Chat chat)
    {
        try
        {
            var storedMessages = JsonSerializer.Deserialize<List<PersistedChatMessage>>(chat.MessagesJson, JsonOptions);
            return storedMessages ?? [];
        }
        catch (JsonException ex)
        {
            logger.LogWarning(ex, "Failed to parse stored chat transcript for chat {ChatId}.", chat.Id);
            return [];
        }
    }

    private static string SerializeMessages(IReadOnlyList<PersistedChatMessage> messages)
    {
        return JsonSerializer.Serialize(messages, JsonOptions);
    }

    private static List<PersistedChatMessage> MergeMessages(
        IReadOnlyList<PersistedChatMessage> existingMessages,
        IReadOnlyList<PersistedChatMessage> incomingMessages)
    {
        if (existingMessages.Count == 0)
        {
            return incomingMessages.ToList();
        }

        if (incomingMessages.Count == 0)
        {
            return existingMessages.ToList();
        }

        var maxOverlap = Math.Min(existingMessages.Count, incomingMessages.Count);
        for (var overlap = maxOverlap; overlap > 0; overlap--)
        {
            var matches = true;
            var existingStart = existingMessages.Count - overlap;

            for (var index = 0; index < overlap; index++)
            {
                if (MessageEquals(existingMessages[existingStart + index], incomingMessages[index]))
                {
                    continue;
                }

                matches = false;
                break;
            }

            if (!matches)
            {
                continue;
            }

            var mergedMessages = existingMessages.ToList();
            mergedMessages.AddRange(incomingMessages.Skip(overlap));
            return mergedMessages;
        }

        return incomingMessages.ToList();
    }

    private static bool MessageEquals(PersistedChatMessage left, PersistedChatMessage right)
    {
        return string.Equals(left.Role, right.Role, StringComparison.Ordinal)
            && string.Equals(left.Content, right.Content, StringComparison.Ordinal);
    }

    private sealed record PersistedChatMessage(string Role, string Content);
}
