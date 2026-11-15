using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace JassSpace.Contracts.Requests;

public sealed record ArtifactUpdateRequest(
    [StringLength(200, MinimumLength = 1)] string? Title,
    [StringLength(4000)] string? PrivateNote);

public sealed record ArtifactPublicationRequest([property: JsonRequired] bool IsPublished);

public sealed record ArtifactListingRequest(
    [Required, StringLength(200)] string Title,
    [StringLength(500)] string? Description,
    [StringLength(20000)] string? Body,
    [StringLength(80)] string? Category,
    [MaxLength(12)] string[]? Tags,
    bool RemoveCover);

public sealed record ArtifactLinkSettingsRequest(
    DateTimeOffset? ExpiresAt,
    [Range(1, int.MaxValue)] int? MaxDownloads);

public sealed record ArtifactRedeemRequest(Guid IdempotencyKey);
