namespace JassSpace.Contracts.Responses;

public record GitHubEmailInfo(
    string Email,
    bool Primary,
    bool Verified,
    string? Visibility
);
