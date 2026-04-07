using JassSpace.Contracts.Responses;

namespace JassSpace.Contracts.Interfaces;

public interface ISeoService
{
    Task<BlogSeoResponse?> GetBlogSeoAsync(
        string slug,
        string requestBaseUrl,
        CancellationToken cancellationToken = default);

    Task<GallerySeoResponse?> GetGallerySeoAsync(
        string slug,
        string requestBaseUrl,
        CancellationToken cancellationToken = default);

    Task<MusicSeoResponse?> GetMusicSeoAsync(
        string slug,
        string requestBaseUrl,
        CancellationToken cancellationToken = default);
}
