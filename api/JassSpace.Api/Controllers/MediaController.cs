using JassSpace.Api.Extensions;
using JassSpace.Contracts;
using JassSpace.Contracts.Interfaces;
using JassSpace.Contracts.Requests;
using JassSpace.Contracts.Responses;
using JassSpace.Infra;
using JassSpace.Infra.Configuration;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;

namespace JassSpace.Api.Controllers;

[Route("media")]
[Authorize]
public sealed class MediaController(
    IAzureBlobStorageService blobStorageService,
    IProfileRepository profileRepository,
    IImageProcessingService imageProcessingService,
    ILogger<MediaController> logger,
    IOptions<AzureBlobStorageSettings> blobSettings)
    : BaseApiController
{
    private readonly string _containerName = blobSettings?.Value?.ContainerName ?? string.Empty;

    /// <summary>
    /// Uploads an image to Cloudinary and stores a cached copy locally.
    /// </summary>
    [HttpPost]
    [ProducesResponseType(typeof(ApiResponse<MediaUploadResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> UploadImage([FromForm] IFormFile? file, CancellationToken cancellationToken = default)
    {
        if (file is null || file.Length == 0)
        {
            return BadRequestProblem("No file uploaded", "Provide a non-empty file in the request body.");
        }

        try
        {
            var uploadResult = await UploadFileAsync(file, cancellationToken);
            var mediaUrl = MediaUrlHelper.BuildMediaUrl(Request, uploadResult.BlobName);
            var response = new MediaUploadResponse(uploadResult.BlobName, mediaUrl);
            return OkEnvelope(response);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Image upload failed");
            return Problem(
                StatusCodes.Status500InternalServerError,
                "Image upload failed",
                "An unexpected error occurred while uploading the image.");
        }
    }

    /// <summary>
    /// Uploads an avatar image, updates the current user's profile, and returns the updated profile.
    /// </summary>
    [HttpPost("avatar")]
    [RateLimit("profile-avatar-update", Partition = RateLimitPartitionStrategy.UserId)]
    [ProducesResponseType(typeof(ApiResponse<ProfileUpdateResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UploadAvatar([FromForm] IFormFile? file, CancellationToken cancellationToken = default)
    {
        if (file is null || file.Length == 0)
        {
            return BadRequestProblem("No file uploaded", "Provide a non-empty file in the request body.");
        }

        if (!Guid.TryParse(UserId, out var userId))
        {
            return UnauthorizedProblem("Unauthorized", "Unable to resolve the current user.");
        }

        try
        {
            var uploadResult = await UploadFileAsync(file, $"{userId:N}-avatar", cancellationToken);

            var mediaUrl = MediaUrlHelper.BuildMediaUrl(Request, uploadResult.BlobName);
            var updateRequest = new UpdateProfileRequest(AvatarUrl: mediaUrl);
            var updateResponse = await profileRepository.UpdateProfileAsync(userId, updateRequest, cancellationToken);

            if (updateResponse is null)
            {
                return NotFoundProblem("User not found", "Unable to update the avatar for the current user.");
            }

            return OkEnvelope(updateResponse, new { uploadResult.BlobName, Url = mediaUrl });
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Avatar upload failed for user {UserId}", UserId);
            return Problem(
                StatusCodes.Status500InternalServerError,
                "Avatar upload failed",
                "An unexpected error occurred while uploading the avatar.");
        }
    }
    /// <summary>
    /// Uploads a cover image, updates the current user's profile, and returns the updated profile.
    /// </summary>
    [HttpPost("cover")]
    [ProducesResponseType(typeof(ApiResponse<ProfileUpdateResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UploadCover([FromForm] IFormFile? file, CancellationToken cancellationToken = default)
    {
        if (file is null || file.Length == 0)
        {
            return BadRequestProblem("No file uploaded", "Provide a non-empty file in the request body.");
        }

        if (!Guid.TryParse(UserId, out var userId))
        {
            return UnauthorizedProblem("Unauthorized", "Unable to resolve the current user.");
        }

        try
        {
            var uploadResult = await UploadFileAsync(file, $"{userId:N}-cover", cancellationToken);

            var mediaUrl = MediaUrlHelper.BuildMediaUrl(Request, uploadResult.BlobName);
            var updateRequest = new UpdateProfileRequest(CoverUrl: mediaUrl);
            var updateResponse = await profileRepository.UpdateProfileAsync(userId, updateRequest, cancellationToken);

            if (updateResponse is null)
            {
                return NotFoundProblem("User not found", "Unable to update the cover image for the current user.");
            }

            return OkEnvelope(updateResponse, new { uploadResult.BlobName, Url = mediaUrl });
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Cover upload failed for user {UserId}", UserId);
            return Problem(
                StatusCodes.Status500InternalServerError,
                "Cover upload failed",
                "An unexpected error occurred while uploading the cover image.");
        }
    }



    /// <summary>
    /// Uploads a file to Azure Blob Storage and caches it locally.
    /// </summary>
    private Task<BlobUploadResult> UploadFileAsync(IFormFile file, CancellationToken cancellationToken)
        => UploadFileAsync(file, null, cancellationToken);

    private async Task<BlobUploadResult> UploadFileAsync(IFormFile file, string? blobName, CancellationToken cancellationToken)
    {
        await using var stream = file.OpenReadStream();
        
        // Process the image (convert to WebP and scale if needed)
        // This unifies behavior with gallery uploads
        await using var processedStream = await imageProcessingService.ProcessImageAsync(stream, cancellationToken);

        return await blobStorageService.UploadImageAsync(
            processedStream,
            file.FileName,
            "image/webp", // Force WebP content type
            blobName,
            cancellationToken);
    }

    /// <summary>
    /// Retrieves the avatar image for a profile, using the local Azure Blob cache.
    /// </summary>
    [HttpGet("profile/{userId:guid}/avatar")]
    [ProducesResponseType(typeof(FileContentResult), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetProfileAvatar(Guid userId, CancellationToken cancellationToken = default)
        => await GetProfileMediaAsync(
            userId,
            profile => profile.AvatarUrl,
            "Avatar",
            "avatar",
            cancellationToken);

    /// <summary>
    /// Retrieves the cover image for a profile, using the local Azure Blob cache.
    /// </summary>
    [HttpGet("profile/{userId:guid}/cover")]
    [ProducesResponseType(typeof(FileContentResult), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetProfileCover(Guid userId, CancellationToken cancellationToken = default)
        => await GetProfileMediaAsync(
            userId,
            profile => profile.CoverUrl,
            "Cover",
            "cover image",
            cancellationToken);

    /// <summary>
    /// Retrieves an image by its blob name. Uses the local cache when possible.
    /// </summary>
    [HttpGet("{blobName}")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(FileContentResult), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetImage(string blobName, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(blobName))
        {
            return BadRequestProblem("Invalid image identifier", "The blob name provided is empty.");
        }

        var cachedImage = await blobStorageService.GetImageAsync(blobName, cancellationToken);
        if (cachedImage is null)
        {
            return NotFoundProblem("Image not found", $"No image found for blob name '{blobName}'.");
        }

        return StreamCachedImage(
            resourceType: "blob image",
            cacheIdentifier: blobName,
            cachedImage,
            notFoundTitle: "Image not found",
            notFoundDetail: $"No cached file available for blob name '{blobName}'.",
            errorTitle: "Failed to read image");
    }

    private async Task<IActionResult> GetProfileMediaAsync(
        Guid userId,
        Func<ProfileDetailsResponse, string?> mediaSelector,
        string mediaTitle,
        string mediaDescription,
        CancellationToken cancellationToken)
    {
        var profile = await profileRepository.GetProfileDetailsAsync(userId, cancellationToken);
        if (profile is null)
        {
            return NotFoundProblem("User not found", $"No profile found for user '{userId}'.");
        }

        var mediaReference = mediaSelector(profile);
        if (string.IsNullOrWhiteSpace(mediaReference))
        {
            return NotFoundProblem($"{mediaTitle} not found", $"The user '{userId}' has not set a {mediaDescription}.");
        }

        var cachedImage = await ResolveCachedImageAsync(mediaReference, cancellationToken);
        
        if (cachedImage is null)
            return NotFoundProblem(
                $"{mediaTitle} not found",
                $"No cached {mediaDescription} available for user '{userId}'.");

        return StreamCachedImage(
            resourceType: $"{mediaDescription}",
            cacheIdentifier: mediaReference,
            cachedImage,
            notFoundTitle: $"{mediaTitle} not found",
            notFoundDetail: $"No cached {mediaDescription} available for user '{userId}'.",
            errorTitle: $"Failed to read {mediaDescription}");
    }

    private async Task<CachedImageResult?> ResolveCachedImageAsync(string mediaReference, CancellationToken cancellationToken)
    {
        if (MediaUrlHelper.TryExtractMediaBlobName(mediaReference, out var mediaBlobName))
        {
            return await blobStorageService.GetImageAsync(mediaBlobName, cancellationToken);
        }

        if (Uri.TryCreate(mediaReference, UriKind.Absolute, out _))
        {
            var cachedFromUrl = await blobStorageService.GetImageByUrlAsync(mediaReference, cancellationToken);
            if (cachedFromUrl is not null)
            {
                return cachedFromUrl;
            }
        }

        if (MediaUrlHelper.TryResolveBlobNameFromUrl(mediaReference, _containerName, out var blobName))
        {
            return await blobStorageService.GetImageAsync(blobName, cancellationToken);
        }

        return await blobStorageService.GetImageAsync(mediaReference, cancellationToken);
    }

    private IActionResult StreamCachedImage(
        string resourceType,
        string cacheIdentifier,
        CachedImageResult cachedImage,
        string notFoundTitle,
        string notFoundDetail,
        string errorTitle)
    {
        try
        {
            var contentType = NormalizeContentType(cachedImage.ContentType, cachedImage.FilePath);
            var stream = new FileStream(
                cachedImage.FilePath,
                FileMode.Open,
                FileAccess.Read,
                FileShare.Read,
                4096,
                FileOptions.Asynchronous | FileOptions.SequentialScan);

            return File(stream, contentType);
        }
        catch (FileNotFoundException)
        {
            logger.LogWarning("Cached file missing for {ResourceType} identifier {CacheIdentifier}", resourceType, cacheIdentifier);
            return NotFoundProblem(notFoundTitle, notFoundDetail);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to read cached {ResourceType} for identifier {CacheIdentifier}", resourceType, cacheIdentifier);
            return Problem(
                StatusCodes.Status500InternalServerError,
                errorTitle,
                "An unexpected error occurred while reading the cached image.");
        }
    }

    private static string NormalizeContentType(string? contentType, string filePath)
    {
        if (!string.IsNullOrWhiteSpace(contentType) &&
            contentType.StartsWith("image/", StringComparison.OrdinalIgnoreCase))
        {
            return contentType;
        }

        var ext = Path.GetExtension(filePath).Trim().TrimStart('.').ToLowerInvariant();
        return ext switch
        {
            "jpg" => "image/jpeg",
            "jpeg" => "image/jpeg",
            "png" => "image/png",
            "gif" => "image/gif",
            "webp" => "image/webp",
            "bmp" => "image/bmp",
            "tiff" => "image/tiff",
            "svg" => "image/svg+xml",
            _ => "image/jpeg"
        };
    }
}
