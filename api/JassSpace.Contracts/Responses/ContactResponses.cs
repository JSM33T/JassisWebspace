namespace JassSpace.Contracts.Responses;

public sealed record ContactResponse(
    Guid Id,
    DateTimeOffset CreatedAt
);
