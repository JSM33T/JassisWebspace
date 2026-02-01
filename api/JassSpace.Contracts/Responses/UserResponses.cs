namespace JassSpace.Contracts.Responses;

public sealed record UserPublicResponse(
    Guid Id,
    string Username,
    string? FirstName,
    string? LastName,
    string? AvatarUrl,
    string? CoverUrl,
    string? Bio
);

/// <summary>
/// Basic user information - just Id and Username for internal lookups
/// </summary>
public sealed record UserBasicResponse(
    Guid Id,
    string Username
);
