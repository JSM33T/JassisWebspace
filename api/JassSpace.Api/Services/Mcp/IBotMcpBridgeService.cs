using JassSpace.Contracts.Requests;

namespace JassSpace.Api.Services;

public interface IBotMcpBridgeService
{
    Task<BotMcpBridgeResult> ResolveAsync(
        IReadOnlyList<BotChatMessageRequest> messages,
        CancellationToken cancellationToken = default);
}

public sealed record BotMcpBridgeResult(
    IReadOnlyList<BotChatMessageRequest> Messages,
    string? DirectResponse = null,
    string? Model = null
);
