using JassSpace.Contracts.Requests;
using JassSpace.Contracts.Responses;

namespace JassSpace.Contracts.Interfaces;

public interface IArtifactAccessContext
{
    Guid? UserId { get; }
    bool IsAdmin { get; }
    bool CanManage { get; }
}

public interface IArtifactTokenProtector
{
    string Protect(string token);
    string Unprotect(string protectedToken);
}

public sealed class ArtifactException(int statusCode, string message) : Exception(message)
{
    public int StatusCode { get; } = statusCode;
}

public interface IArtifactService
{
    Task<ArtifactPageResponse> ListAsync(string? search, Guid? owner, int page, int pageSize, CancellationToken ct);
    Task<ArtifactDetailResponse> GetByContentAsync(Guid contentId, CancellationToken ct);
    Task<ArtifactDetailResponse> GetAsync(Guid id, CancellationToken ct);
    Task<ArtifactDetailResponse> UploadAsync(Stream stream, string filename, string mediaType, long length, string? title, string? note, CancellationToken ct);
    Task<ArtifactDetailResponse> ReplaceAsync(Guid id, Stream stream, string filename, string mediaType, long length, CancellationToken ct);
    Task<ArtifactManagerDownload> OpenManagerDownloadAsync(Guid id, CancellationToken ct);
    Task<ArtifactDetailResponse> UpdateAsync(Guid id, ArtifactUpdateRequest request, CancellationToken ct);
    Task DeleteAsync(Guid id, CancellationToken ct);
    Task<ArtifactCreatedLinkResponse> CreateLinkAsync(Guid id, ArtifactLinkSettingsRequest request, CancellationToken ct);
    Task UpdateLinkAsync(Guid id, Guid linkId, ArtifactLinkSettingsRequest request, CancellationToken ct);
    Task RevokeLinkAsync(Guid id, Guid linkId, CancellationToken ct);
    Task DeleteLinkAsync(Guid id, Guid linkId, CancellationToken ct);
    Task<ArtifactPublicResponse> GetShareAsync(string token, CancellationToken ct);
    Task<ArtifactRedeemResponse> RedeemAsync(string token, Guid idempotencyKey, CancellationToken ct);
    Task<ArtifactDownload> OpenDownloadAsync(string token, CancellationToken ct);
    Task ReleaseDownloadAsync(Guid grantId);
    Task CleanupAsync(CancellationToken ct);
}

public sealed record ArtifactDownload(Guid GrantId, Stream Stream, string FileName, long SizeBytes);
public sealed record ArtifactManagerDownload(Stream Stream, string FileName);
