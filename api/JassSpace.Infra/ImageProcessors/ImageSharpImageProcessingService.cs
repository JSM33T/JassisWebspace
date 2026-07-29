//using Microsoft.Extensions.Logging;
//using SixLabors.ImageSharp;
//using SixLabors.ImageSharp.Formats.Webp;
//using SixLabors.ImageSharp.Processing;

//namespace JassSpace.Infra.ImageProcessors;

//public class ImageSharpImageProcessingService : IImageProcessingService
//{
//    private readonly ILogger<ImageSharpImageProcessingService> _logger;
//    private const int MaxDimension = 2000;
//    private const int ThumbMaxDimension = 960;
//    private const int ThumbQuality = 90;
//    private const float ThumbSharpness = 0f;

//    public ImageSharpImageProcessingService(ILogger<ImageSharpImageProcessingService> logger)
//    {
//        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
//    }

//    public async Task<Stream> ProcessImageAsync(Stream sourceStream, CancellationToken cancellationToken = default)
//    {
//        if (sourceStream == null)
//        {
//            throw new ArgumentNullException(nameof(sourceStream));
//        }

//        if (!sourceStream.CanRead)
//        {
//            throw new InvalidOperationException("Source stream cannot be read.");
//        }

//        try
//        {
//            using var image = await Image.LoadAsync(sourceStream, cancellationToken);

//            var originalWidth = image.Width;
//            var originalHeight = image.Height;

//            var maxSide = Math.Max(originalWidth, originalHeight);
//            if (maxSide > MaxDimension)
//            {
//                var scale = (double)MaxDimension / maxSide;
//                var newWidth = (int)(originalWidth * scale);
//                var newHeight = (int)(originalHeight * scale);

//                _logger.LogInformation(
//                    "Resizing image from {OriginalWidth}x{OriginalHeight} to {NewWidth}x{NewHeight}",
//                    originalWidth, originalHeight, newWidth, newHeight);

//                image.Mutate(x => x.Resize(newWidth, newHeight));
//            }
//            else
//            {
//                _logger.LogDebug(
//                    "Image dimensions {Width}x{Height} are within limits, no resizing needed",
//                    originalWidth, originalHeight);
//            }

//            var outputStream = new MemoryStream();
//            var encoder = new WebpEncoder
//            {
//                Quality = 85,
//                FileFormat = WebpFileFormatType.Lossy
//            };

//            await image.SaveAsync(outputStream, encoder, cancellationToken);
//            outputStream.Position = 0;

//            _logger.LogInformation(
//                "Image processed successfully with ImageSharp: converted to WebP, final size {Width}x{Height}",
//                image.Width, image.Height);

//            return outputStream;
//        }
//        catch (Exception ex)
//        {
//            _logger.LogError(ex, "Failed to process image with ImageSharp");
//            throw new InvalidOperationException("Image processing failed. The file may not be a valid image.", ex);
//        }
//    }

//    public Task<Stream> CreateThumbnailAsync(Stream sourceStream, CancellationToken cancellationToken = default)
//        => ProcessToWebpAsync(
//            sourceStream,
//            ThumbMaxDimension,
//            quality: ThumbQuality,
//            sharpness: ThumbSharpness,
//            cancellationToken);

//    private async Task<Stream> ProcessToWebpAsync(
//        Stream sourceStream,
//        int maxDimension,
//        int quality,
//        float sharpness,
//        CancellationToken cancellationToken)
//    {
//        if (sourceStream == null)
//        {
//            throw new ArgumentNullException(nameof(sourceStream));
//        }

//        if (!sourceStream.CanRead)
//        {
//            throw new InvalidOperationException("Source stream cannot be read.");
//        }

//        try
//        {
//            using var image = await Image.LoadAsync(sourceStream, cancellationToken);

//            var originalWidth = image.Width;
//            var originalHeight = image.Height;
//            var maxSide = Math.Max(originalWidth, originalHeight);

//            if (maxSide > maxDimension)
//            {
//                image.Mutate(x => x.Resize(new ResizeOptions
//                {
//                    Mode = ResizeMode.Max,
//                    Size = new Size(maxDimension, maxDimension)
//                }));

//                _logger.LogDebug(
//                    "Resized image for WebP output from {OriginalWidth}x{OriginalHeight} to {NewWidth}x{NewHeight} (max {MaxDimension}px)",
//                    originalWidth, originalHeight, image.Width, image.Height, maxDimension);
//            }

//            if (sharpness > 0)
//            {
//                image.Mutate(x => x.GaussianSharpen(sharpness));
//            }

//            image.Metadata.ExifProfile = null;
//            image.Metadata.IptcProfile = null;
//            image.Metadata.XmpProfile = null;

//            var outputStream = new MemoryStream();
//            var encoder = new WebpEncoder
//            {
//                Quality = quality,
//                FileFormat = WebpFileFormatType.Lossy
//            };

//            await image.SaveAsync(outputStream, encoder, cancellationToken);
//            outputStream.Position = 0;
//            return outputStream;
//        }
//        catch (Exception ex)
//        {
//            _logger.LogError(ex, "Failed to process image to WebP with ImageSharp");
//            throw new InvalidOperationException("Image processing failed. The file may not be a valid image.", ex);
//        }
//    }
//}
