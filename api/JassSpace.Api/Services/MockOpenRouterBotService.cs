using JassSpace.Contracts.Requests;

namespace JassSpace.Api.Services;

public sealed class MockOpenRouterBotService : IOpenRouterBotService
{
    private const string MockMessage = "the bot is under construction, please check back later";
    private const string MockModel = "mock/openrouter-under-construction";

    public Task<BotChatCompletionResult> GetCompletionAsync(
        IReadOnlyList<BotChatMessageRequest> messages,
        CancellationToken cancellationToken = default)
    {
        return Task.FromResult(new BotChatCompletionResult(
            MockMessage,
            MockModel,
            DateTimeOffset.UtcNow));
    }

    public async Task<BotChatCompletionResult> StreamCompletionAsync(
        IReadOnlyList<BotChatMessageRequest> messages,
        Func<string, CancellationToken, Task> onDelta,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(onDelta);

        foreach (var chunk in GetChunks(MockMessage))
        {
            cancellationToken.ThrowIfCancellationRequested();
            await onDelta(chunk, cancellationToken);
            await Task.Delay(90, cancellationToken);
        }

        return new BotChatCompletionResult(
            MockMessage,
            MockModel,
            DateTimeOffset.UtcNow);
    }

    private static IEnumerable<string> GetChunks(string message)
    {
        var words = message.Split(' ', StringSplitOptions.RemoveEmptyEntries);
        for (var i = 0; i < words.Length; i++)
        {
            var suffix = i == words.Length - 1 ? string.Empty : " ";
            yield return $"{words[i]}{suffix}";
        }
    }
}
