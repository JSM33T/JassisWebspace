namespace JassSpace.Contracts.Responses;


public record AdminUserListItemResponse(
    Guid Id,
    string Email,
    bool EmailVerified,
    string Username,
    string? FirstName,
    string? LastName,
    string? DisplayName,
    bool VerifiedBadge,
    bool IsActive,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt,
    string[] Roles
);

public record AdminUserDetailsResponse(
    ProfileDetailsResponse Profile,
    bool IsActive
);
