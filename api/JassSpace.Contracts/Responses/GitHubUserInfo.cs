namespace JassSpace.Contracts.Responses;

public record GitHubUserInfo(
    long Id,
    string Login,
    string? Name,
    string? Email,
    string? AvatarUrl,
    string? HtmlUrl
);
