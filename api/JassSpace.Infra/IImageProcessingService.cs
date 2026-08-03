namespace JassSpace.Infra;

public interface IImageProcessingService
{
    /// <summary>
    /// Processes an image: converts to WebP and scales down if needed (max 2000px on largest side)
    /// </summary>
    /// <param name="sourceStream">The source image stream</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Processed image stream in WebP format</returns>
    Task<Stream> ProcessImageAsync(Stream sourceStream, CancellationToken cancellationToken = default);

    /// <summary>
    /// Creates a small thumbnail variant (WebP) preserving aspect ratio.
    /// Intended for grids/cards where the full asset is unnecessary.
    /// </summary>
    /// <param name="sourceStream">The source image stream</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Thumbnail image stream in WebP format</returns>
    Task<Stream> CreateThumbnailAsync(Stream sourceStream, CancellationToken cancellationToken = default);

    /// <summary>
    /// Creates a thumbnail from a file-backed source. Prefer this for cached files so native
    /// image decoders can seek directly instead of using a pipe-backed managed stream bridge.
    /// </summary>
    /// <param name="sourcePath">Absolute path to the source image.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>Thumbnail image stream in WebP format.</returns>
    Task<Stream> CreateThumbnailFromFileAsync(string sourcePath, CancellationToken cancellationToken = default);
}
