using System.ComponentModel.DataAnnotations;

namespace JassSpace.Contracts.Requests;

public record AdminUpdateUserRequest(
    string? Email,
    bool? EmailVerified,
    string? Username,
    string? FirstName,
    string? LastName,
    string? DisplayName,
    string? Bio,
    string? AvatarUrl,
    string? CoverUrl,
    string? Timezone,
    string? Locale,
    bool? VerifiedBadge,
    bool? IsActive,
    List<string>? Roles
);
