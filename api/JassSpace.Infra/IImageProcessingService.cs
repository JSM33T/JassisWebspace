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
}
