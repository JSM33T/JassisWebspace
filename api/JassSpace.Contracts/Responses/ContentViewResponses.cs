namespace JassSpace.Contracts.Responses;

public sealed record ContentViewResponse(
    Guid ContentId,
    int ViewCount,
    DateTimeOffset ViewedAt
);
