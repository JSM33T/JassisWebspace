namespace JassSpace.Contracts.Responses;

public sealed record BotChatResponse(
    string Message,
    string Model,
    DateTimeOffset CreatedAt
);

public sealed record BotStreamStartResponse(
    string Model,
    DateTimeOffset StartedAt
);

public sealed record BotStreamDeltaResponse(
    string Delta
);

public sealed record BotStreamCompleteResponse(
    string Message,
    string Model,
    DateTimeOffset CompletedAt
);

public sealed record BotStreamErrorResponse(
    string Message
);
