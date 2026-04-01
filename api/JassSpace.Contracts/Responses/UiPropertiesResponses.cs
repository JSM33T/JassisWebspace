namespace JassSpace.Contracts.Responses;

public sealed record UiPropertyResponse(
    Guid Id,
    string Key,
    string Value,
    DateTimeOffset UpdatedAt
);
