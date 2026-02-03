using Microsoft.Extensions.Logging;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.Formats.Webp;
using SixLabors.ImageSharp.Processing;

namespace JassSpace.Infra;

public class ImageProcessingService : IImageProcessingService
{
    private readonly ILogger<ImageProcessingService> _logger;
    private const int MaxDimension = 2000;

    public ImageProcessingService(ILogger<ImageProcessingService> logger)
    {
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    public async Task<Stream> ProcessImageAsync(Stream sourceStream, CancellationToken cancellationToken = default)
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
            // Load the image
            using var image = await Image.LoadAsync(sourceStream, cancellationToken);
            
            var originalWidth = image.Width;
            var originalHeight = image.Height;

            // Determine if scaling is needed
            var maxSide = Math.Max(originalWidth, originalHeight);
            if (maxSide > MaxDimension)
            {
                // Calculate new dimensions maintaining aspect ratio
                var scale = (double)MaxDimension / maxSide;
                var newWidth = (int)(originalWidth * scale);
                var newHeight = (int)(originalHeight * scale);

                _logger.LogInformation(
                    "Resizing image from {OriginalWidth}x{OriginalHeight} to {NewWidth}x{NewHeight}",
                    originalWidth, originalHeight, newWidth, newHeight);

                image.Mutate(x => x.Resize(newWidth, newHeight));
            }
            else
            {
                _logger.LogDebug(
                    "Image dimensions {Width}x{Height} are within limits, no resizing needed",
                    originalWidth, originalHeight);
            }

            // Convert to WebP and save to memory stream
            var outputStream = new MemoryStream();
            var encoder = new WebpEncoder
            {
                Quality = 85, // High quality WebP
                FileFormat = WebpFileFormatType.Lossy
            };

            await image.SaveAsync(outputStream, encoder, cancellationToken);
            outputStream.Position = 0;

            _logger.LogInformation(
                "Image processed successfully: converted to WebP, final size {Width}x{Height}",
                image.Width, image.Height);

            return outputStream;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to process image");
            throw new InvalidOperationException("Image processing failed. The file may not be a valid image.", ex);
        }
    }
}
