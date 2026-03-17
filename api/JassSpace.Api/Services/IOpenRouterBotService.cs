using JassSpace.Contracts.Requests;

namespace JassSpace.Api.Services;

public interface IOpenRouterBotService
{
    Task<BotChatCompletionResult> GetCompletionAsync(
        IReadOnlyList<BotChatMessageRequest> messages,
        CancellationToken cancellationToken = default);

    Task<BotChatCompletionResult> StreamCompletionAsync(
        IReadOnlyList<BotChatMessageRequest> messages,
        Func<string, CancellationToken, Task> onDelta,
        CancellationToken cancellationToken = default);
}

public sealed record BotChatCompletionResult(
    string Message,
    string Model,
    DateTimeOffset CreatedAt
);
