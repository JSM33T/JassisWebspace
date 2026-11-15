using System.Data.Common;
using JassSpace.Api.Extensions;
using JassSpace.Contracts.Interfaces;
using JassSpace.Contracts.Requests;
using JassSpace.Infra;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.Net.Http.Headers;

namespace JassSpace.Api.Controllers;

// Preserve domain errors and distinguish infrastructure outages from unexpected code failures.
public sealed class ArtifactExceptionFilter(ILogger<ArtifactExceptionFilter> logger) : IExceptionFilter
{
    public void OnException(ExceptionContext context)
    {
        if (context.Exception is OperationCanceledException && context.HttpContext.RequestAborted.IsCancellationRequested) return;
        var known = context.Exception as ArtifactException;
        var infrastructureFailure = context.Exception is Azure.RequestFailedException or DbException
            or IOException or HttpRequestException or TimeoutException;
        var status = known?.StatusCode ?? (infrastructureFailure ? 503 : 500);
        if (known is null) logger.LogError(context.Exception, "Artifact operation failed");
        context.Result = new ObjectResult(new ProblemDetails
        {
            Status = status,
            Title = known?.Message ?? (infrastructureFailure
                ? "Artifact storage is temporarily unavailable. Try again later."
                : "The artifact operation could not be completed. Try again later.")
        }) { StatusCode = status };
        context.ExceptionHandled = true;
    }
}

[Route("admin/artifacts")]
[Authorize(Roles = "admin,mod")]
[TypeFilter(typeof(ArtifactExceptionFilter))]
[ResponseCache(NoStore = true, Location = ResponseCacheLocation.None)]
public sealed class AdminArtifactController(IArtifactService artifacts) : BaseApiController
{
    private const int CoverUploadLimit = 8 * 1024 * 1024;
    private const int ProcessedCoverLimit = 2 * 1024 * 1024;

    [HttpGet]
    public async Task<IActionResult> List([FromQuery] string? search, [FromQuery] Guid? owner,
        [FromQuery] int page = 1, [FromQuery] int pageSize = 20, CancellationToken ct = default) =>
        OkEnvelope(await artifacts.ListAsync(search, owner, page, pageSize, ct));

    [HttpGet("content/{contentId:guid}")]
    public async Task<IActionResult> ByContent(Guid contentId, CancellationToken ct) => OkEnvelope(await artifacts.GetByContentAsync(contentId, ct));

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> Get(Guid id, CancellationToken ct) => OkEnvelope(await artifacts.GetAsync(id, ct));

    [HttpPost]
    [RateLimit("artifact-upload", Partition = RateLimitPartitionStrategy.UserId)]
    [RequestSizeLimit(101 * 1024 * 1024)]
    [RequestFormLimits(MultipartBodyLengthLimit = 101 * 1024 * 1024)]
    public async Task<IActionResult> Upload([FromForm] IFormFile file, [FromForm] string? title,
        [FromForm] string? privateNote, CancellationToken ct)
    {
        if (file is null || file.Length == 0) return BadRequestProblem("Choose a non-empty file.");
        await using var stream = file.OpenReadStream();
        return OkEnvelope(await artifacts.UploadAsync(stream, file.FileName, file.ContentType, file.Length, title, privateNote, ct));
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] ArtifactUpdateRequest request, CancellationToken ct) =>
        OkEnvelope(await artifacts.UpdateAsync(id, request, ct));

    [HttpPut("{id:guid}/publication")]
    public async Task<IActionResult> SetPublication(Guid id, [FromBody] ArtifactPublicationRequest request, CancellationToken ct) =>
        OkEnvelope(await artifacts.SetPublicationAsync(id, request.IsPublished, ct));

    [HttpPut("{id:guid}/listing")]
    [RequestSizeLimit(CoverUploadLimit + 256 * 1024)]
    [RequestFormLimits(MultipartBodyLengthLimit = CoverUploadLimit + 256 * 1024)]
    public async Task<IActionResult> UpdateListing(Guid id, [FromForm] ArtifactListingRequest request,
        [FromForm] IFormFile? coverImage, [FromServices] IImageProcessingService images, CancellationToken ct)
    {
        byte[]? cover = null;
        if (coverImage is not null)
        {
            if (coverImage.Length == 0 || coverImage.Length > CoverUploadLimit ||
                coverImage.ContentType is not ("image/jpeg" or "image/png" or "image/webp"))
                return BadRequestProblem("Choose a JPEG, PNG, or WebP cover up to 8 MiB.");

            try
            {
                await using var input = coverImage.OpenReadStream();
                var header = new byte[12];
                if (await input.ReadAtLeastAsync(header, header.Length, throwOnEndOfStream: false, cancellationToken: ct) != header.Length ||
                    !IsSupportedCover(header))
                    return BadRequestProblem("The cover must be a JPEG, PNG, or WebP image.");
                input.Position = 0;
                await using var converted = await images.ProcessImageAsync(input, ct);
                if (converted.CanSeek && converted.Length > ProcessedCoverLimit)
                    return BadRequestProblem("The processed cover is too large. Try a smaller image.");
                using var buffer = new MemoryStream();
                await converted.CopyToAsync(buffer, ct);
                if (buffer.Length is 0 or > ProcessedCoverLimit)
                    return BadRequestProblem("The processed cover is too large. Try a smaller image.");
                cover = buffer.ToArray();
            }
            catch (InvalidOperationException)
            {
                return BadRequestProblem("The cover could not be read as an image.");
            }
        }
        return OkEnvelope(await artifacts.UpdateListingAsync(id, request, cover, ct));
    }

    private static bool IsSupportedCover(ReadOnlySpan<byte> header) =>
        header.StartsWith(new byte[] { 0xFF, 0xD8, 0xFF }) ||
        header.StartsWith(new byte[] { 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A }) ||
        (header.StartsWith("RIFF"u8) && header[8..].SequenceEqual("WEBP"u8));

    [HttpGet("{id:guid}/cover")]
    public async Task<IActionResult> CoverPreview(Guid id, CancellationToken ct) =>
        OkEnvelope(await artifacts.GetCoverAsync(id, publishedOnly: false, ct));

    [HttpPost("{id:guid}/file")]
    [RateLimit("artifact-upload", Partition = RateLimitPartitionStrategy.UserId)]
    [RequestSizeLimit(101 * 1024 * 1024)]
    [RequestFormLimits(MultipartBodyLengthLimit = 101 * 1024 * 1024)]
    public async Task<IActionResult> Replace(Guid id, [FromForm] IFormFile file, CancellationToken ct)
    {
        if (file is null || file.Length == 0) return BadRequestProblem("Choose a non-empty replacement file.");
        await using var stream = file.OpenReadStream();
        return OkEnvelope(await artifacts.ReplaceAsync(id, stream, file.FileName, file.ContentType, file.Length, ct));
    }

    [HttpGet("{id:guid}/download")]
    [RateLimit("artifact-download", Partition = RateLimitPartitionStrategy.UserId)]
    [Produces("application/octet-stream")]
    public async Task<IActionResult> Download(Guid id, CancellationToken ct)
    {
        var download = await artifacts.OpenManagerDownloadAsync(id, ct);
        Response.Headers["Cache-Control"] = "private, no-store";
        Response.Headers["X-Content-Type-Options"] = "nosniff";
        return File(download.Stream, "application/octet-stream", download.FileName, enableRangeProcessing: true);
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct) { await artifacts.DeleteAsync(id, ct); return NoContent(); }

    [HttpPost("{id:guid}/links")]
    public async Task<IActionResult> CreateLink(Guid id, [FromBody] ArtifactLinkSettingsRequest request, CancellationToken ct) =>
        OkEnvelope(await artifacts.CreateLinkAsync(id, request, ct));

    [HttpPut("{id:guid}/links/{linkId:guid}")]
    public async Task<IActionResult> UpdateLink(Guid id, Guid linkId, [FromBody] ArtifactLinkSettingsRequest request, CancellationToken ct)
    { await artifacts.UpdateLinkAsync(id, linkId, request, ct); return NoContent(); }

    [HttpPost("{id:guid}/links/{linkId:guid}/revoke")]
    public async Task<IActionResult> Revoke(Guid id, Guid linkId, CancellationToken ct)
    { await artifacts.RevokeLinkAsync(id, linkId, ct); return NoContent(); }

    [HttpDelete("{id:guid}/links/{linkId:guid}")]
    public async Task<IActionResult> DeleteLink(Guid id, Guid linkId, CancellationToken ct)
    { await artifacts.DeleteLinkAsync(id, linkId, ct); return NoContent(); }
}

[Route("public-artifacts")]
[AllowAnonymous]
[TypeFilter(typeof(ArtifactExceptionFilter))]
[ResponseCache(NoStore = true, Location = ResponseCacheLocation.None)]
public sealed class PublicArtifactController(IArtifactService artifacts) : BaseApiController
{
    [HttpGet]
    [RateLimit("artifact-share-read")]
    public async Task<IActionResult> List([FromQuery] string? search, [FromQuery] string? category, [FromQuery] int page = 1,
        [FromQuery] int pageSize = 24, CancellationToken ct = default) =>
        OkEnvelope(await artifacts.ListPublishedAsync(search, category, page, pageSize, ct));

    [HttpGet("{id:guid}")]
    [RateLimit("artifact-share-read")]
    public async Task<IActionResult> Details(Guid id, CancellationToken ct) =>
        OkEnvelope(await artifacts.GetPublishedAsync(id, ct));

    [HttpGet("{id:guid}/cover")]
    [RateLimit("artifact-share-read")]
    public async Task<IActionResult> Cover(Guid id, CancellationToken ct)
    {
        var image = await artifacts.GetCoverAsync(id, publishedOnly: true, ct);
        Response.Headers["X-Content-Type-Options"] = "nosniff";
        return File(image, "image/webp");
    }

    [HttpGet("{id:guid}/download")]
    [RateLimit("artifact-download")]
    [Produces("application/octet-stream")]
    public async Task<IActionResult> Download(Guid id, CancellationToken ct)
    {
        var file = await artifacts.OpenPublishedDownloadAsync(id, ct);
        Response.Headers["Cache-Control"] = "no-store";
        Response.Headers["X-Content-Type-Options"] = "nosniff";
        return File(file.Stream, "application/octet-stream", file.FileName);
    }
}

[AllowAnonymous]
[TypeFilter(typeof(ArtifactExceptionFilter))]
[ResponseCache(NoStore = true, Location = ResponseCacheLocation.None)]
public sealed class ArtifactShareController(IArtifactService artifacts, IConfiguration configuration) : BaseApiController
{
    // The normal share-page flow sends capabilities in headers or POST bodies.
    [HttpGet("artifact-shares")]
    [RateLimit("artifact-share-read")]
    public async Task<IActionResult> Metadata([FromHeader(Name = "X-Artifact-Token")] string token, CancellationToken ct) =>
        OkEnvelope(await artifacts.GetShareAsync(token, ct));

    [HttpPost("artifact-shares/redeem")]
    [RequestSizeLimit(4096)]
    [RateLimit("artifact-redeem")]
    public async Task<IActionResult> Redeem([FromHeader(Name = "X-Artifact-Token")] string token,
        [FromBody] ArtifactRedeemRequest request, CancellationToken ct) =>
        OkEnvelope(await artifacts.RedeemAsync(token, request.IdempotencyKey, ct));

    [HttpGet("artifact-shares/{token}")]
    [HttpHead("artifact-shares/{token}")]
    [RateLimit("artifact-redeem")]
    public async Task<IActionResult> Share(string token, [FromQuery] bool directdl = false, CancellationToken ct = default)
    {
        if (token.Length != 43 || token.Any(c => !char.IsAsciiLetterOrDigit(c) && c != '-' && c != '_'))
            return NotFoundProblem("Artifact not found.");
        if (!directdl)
        {
            var frontend = configuration["Frontend:BaseUrl"] ?? configuration["AppUrl"] ?? "http://localhost:3001";
            return Redirect($"{frontend.TrimEnd('/')}/artifacts/share#{Uri.EscapeDataString(token)}");
        }
        if (HttpMethods.IsHead(Request.Method))
        {
            // HEAD/link inspection must not reserve a download or consume a use.
            var metadata = await artifacts.GetShareAsync(token, ct);
            var disposition = new ContentDispositionHeaderValue("attachment");
            disposition.SetHttpFileName(metadata.FileName);
            Response.Headers.ContentDisposition = disposition.ToString();
            Response.ContentType = "application/octet-stream";
            Response.ContentLength = metadata.SizeBytes;
            return new EmptyResult();
        }
        var grant = await artifacts.RedeemAsync(token, Guid.NewGuid(), ct);
        // Redirect to the reserved session so subsequent GET/HEAD/Range requests use
        // the same grant, rather than redeeming the original share repeatedly.
        return Redirect($"{Request.PathBase}/artifact-downloads/{Uri.EscapeDataString(grant.GrantToken)}");
    }

    [AcceptVerbs("GET", "HEAD", "POST")]
    [Route("artifact-downloads")]
    [Route("artifact-downloads/{grantToken}")]
    [RequestSizeLimit(4096)]
    [RateLimit("artifact-download")]
    [Produces("application/octet-stream")]
    public async Task<IActionResult> Download([FromRoute] string? grantToken, CancellationToken ct)
    {
        var token = grantToken ?? Request.Headers["X-Artifact-Grant"].ToString();
        if (Request.Method == "POST" && Request.HasFormContentType)
            token = (await Request.ReadFormAsync(ct))["grantToken"].ToString();
        var download = await artifacts.OpenDownloadAsync(token, ct);
        // The MVC result executes inside this result wrapper, ensuring the stream lease is released
        // on disconnect, invalid ranges, HEAD requests, and errors as well as successful transfers.
        return new ArtifactDownloadResult(download, artifacts);
    }
}

internal sealed class ArtifactDownloadResult(ArtifactDownload download, IArtifactService artifacts) : IActionResult
{
    public async Task ExecuteResultAsync(ActionContext context)
    {
        try
        {
            var response = context.HttpContext.Response;
            response.Headers["Cache-Control"] = "private, no-store";
            response.Headers["X-Content-Type-Options"] = "nosniff";
            var result = new FileStreamResult(download.Stream, "application/octet-stream")
            {
                FileDownloadName = download.FileName,
                EnableRangeProcessing = true
            };
            await result.ExecuteResultAsync(context);
        }
        finally
        {
            await download.Stream.DisposeAsync();
            await artifacts.ReleaseDownloadAsync(download.GrantId);
        }
    }
}
