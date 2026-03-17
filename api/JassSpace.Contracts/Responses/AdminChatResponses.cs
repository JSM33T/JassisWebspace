namespace JassSpace.Contracts.Responses;

public sealed record AdminChatTranscriptMessageResponse(
    string Role,
    string Content
);

public sealed record AdminChatSummaryResponse(
    Guid Id,
    Guid? UserId,
    string? Username,
    string? Email,
    string? VisitorId,
    string OwnerDisplay,
    int MessageCount,
    string? Preview,
    string? Model,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt
);

public sealed record AdminChatDetailResponse(
    Guid Id,
    Guid? UserId,
    string? Username,
    string? Email,
    string? VisitorId,
    string OwnerDisplay,
    string? Model,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt,
    IReadOnlyList<AdminChatTranscriptMessageResponse> Messages
);
