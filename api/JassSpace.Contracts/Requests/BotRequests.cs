namespace JassSpace.Contracts.Requests;

public sealed record BotChatMessageRequest(
    string Role,
    string Content
);

public sealed record CreateBotChatRequest(
    IReadOnlyList<BotChatMessageRequest> Messages
);
