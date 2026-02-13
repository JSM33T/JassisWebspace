namespace JassSpace.Contracts.Responses;

public sealed record ContactResponse(
    Guid Id,
    DateTimeOffset CreatedAt
);

public sealed record AdminContactMessageResponse(
    Guid Id,
    string Name,
    string Email,
    string Purpose,
    string Message,
    string? RefUrl,
    DateTimeOffset CreatedAt
);
