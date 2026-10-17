using System.ComponentModel.DataAnnotations;

namespace JassSpace.Contracts.Requests;

public sealed record ArtifactUpdateRequest(
    [Required, StringLength(200, MinimumLength = 1)] string Title,
    [StringLength(4000)] string? PrivateNote);

public sealed record ArtifactLinkSettingsRequest(
    DateTimeOffset? ExpiresAt,
    [Range(1, int.MaxValue)] int? MaxDownloads);

public sealed record ArtifactRedeemRequest(Guid IdempotencyKey);
