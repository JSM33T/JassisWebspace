using System;
using System.Collections.Generic;

namespace JassSpace.Contracts.Responses;

public sealed record AdminUserListItemResponse(
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
    IReadOnlyList<string> Roles
);

public sealed record AdminUserDetailsResponse(
    ProfileDetailsResponse Profile,
    bool IsActive
);


