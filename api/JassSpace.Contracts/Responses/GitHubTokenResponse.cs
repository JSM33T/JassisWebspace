namespace JassSpace.Contracts.Responses;

public record GitHubTokenResponse(
    string AccessToken,
    string? Scope,
    string TokenType
);
