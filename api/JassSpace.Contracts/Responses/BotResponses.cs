namespace JassSpace.Contracts.Responses;

public sealed record BotChatResponse(
    Guid ChatId,
    string Message,
    string Model,
    DateTimeOffset CreatedAt
);

public sealed record BotStreamStartResponse(
    Guid ChatId,
    string Model,
    DateTimeOffset StartedAt
);

public sealed record BotStreamDeltaResponse(
    string Delta
);

public sealed record BotStreamCompleteResponse(
    Guid ChatId,
    string Message,
    string Model,
    DateTimeOffset CompletedAt
);

public sealed record BotStreamErrorResponse(
    string Message
);
