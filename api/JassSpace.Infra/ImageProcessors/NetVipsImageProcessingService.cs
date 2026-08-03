using Microsoft.Extensions.Logging;
using NetVips;

namespace JassSpace.Infra.ImageProcessors;

public class NetVipsImageProcessingService : IImageProcessingService
{
    private readonly ILogger<NetVipsImageProcessingService> _logger;
    private const int MaxDimension = 2000;
    private const int ThumbMaxDimension = 960;
    private const int ThumbQuality = 90;

    public NetVipsImageProcessingService(ILogger<NetVipsImageProcessingService> logger)
    {
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    public Task<Stream> ProcessImageAsync(Stream sourceStream, CancellationToken cancellationToken = default)
        => ProcessToWebpAsync(sourceStream, MaxDimension, quality: 85, cancellationToken);

    public Task<Stream> CreateThumbnailAsync(Stream sourceStream, CancellationToken cancellationToken = default)
        => ProcessToWebpAsync(sourceStream, ThumbMaxDimension, quality: ThumbQuality, cancellationToken);

    public Task<Stream> CreateThumbnailFromFileAsync(string sourcePath, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(sourcePath))
        {
            throw new ArgumentException("Source path cannot be empty.", nameof(sourcePath));
        }

        if (!File.Exists(sourcePath))
        {
            throw new FileNotFoundException("Source image was not found.", sourcePath);
        }

        try
        {
            cancellationToken.ThrowIfCancellationRequested();

            // File-backed loading lets libvips seek directly. Using NewFromStream for a cached
            // FileStream routes through vips_source_pipe and can abort the native process when
            // a decoder requests a different position in the source.
            using var image = Image.NewFromFile(sourcePath, access: Enums.Access.Sequential);
            return EncodeToWebpAsync(image, ThumbMaxDimension, ThumbQuality, cancellationToken);
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            _logger.LogError(ex, "Failed to create thumbnail with NetVips from file {SourcePath}", sourcePath);
            throw new InvalidOperationException("Thumbnail processing failed. The file may not be a valid image.", ex);
        }
    }

    private Task<Stream> ProcessToWebpAsync(
        Stream sourceStream,
        int maxDimension,
        int quality,
        CancellationToken cancellationToken)
    {
        if (sourceStream == null)
        {
            throw new ArgumentNullException(nameof(sourceStream));
        }

        if (!sourceStream.CanRead)
        {
            throw new InvalidOperationException("Source stream cannot be read.");
        }

        try
        {
            cancellationToken.ThrowIfCancellationRequested();

            using var image = Image.NewFromStream(sourceStream, access: Enums.Access.Sequential);
            return EncodeToWebpAsync(image, maxDimension, quality, cancellationToken);
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            _logger.LogError(ex, "Failed to process image with NetVips");
            throw new InvalidOperationException("Image processing failed. The file may not be a valid image.", ex);
        }
    }

    private Task<Stream> EncodeToWebpAsync(
        Image image,
        int maxDimension,
        int quality,
        CancellationToken cancellationToken)
    {
        var originalWidth = image.Width;
        var originalHeight = image.Height;
        var maxSide = Math.Max(originalWidth, originalHeight);
        Image outputImage = image;

        if (maxSide > maxDimension)
        {
            var scale = (double)maxDimension / maxSide;
            outputImage = image.Resize(scale);

            _logger.LogInformation(
                "Resized image with NetVips from {OriginalWidth}x{OriginalHeight} to {NewWidth}x{NewHeight}",
                originalWidth, originalHeight, outputImage.Width, outputImage.Height);
        }
        else
        {
            _logger.LogDebug(
                "Image dimensions {Width}x{Height} are within limits, no NetVips resizing needed",
                originalWidth, originalHeight);
        }

        try
        {
            cancellationToken.ThrowIfCancellationRequested();

            var buffer = outputImage.WriteToBuffer($".webp[Q={quality},strip]");
            var outputStream = new MemoryStream(buffer);

            _logger.LogInformation(
                "Image processed successfully with NetVips: converted to WebP, final size {Width}x{Height}",
                outputImage.Width, outputImage.Height);

            return Task.FromResult<Stream>(outputStream);
        }
        finally
        {
            if (!ReferenceEquals(outputImage, image))
            {
                outputImage.Dispose();
            }
        }
    }
}
