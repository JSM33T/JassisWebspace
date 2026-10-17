using System.Data.Common;
using JassSpace.Api.Extensions;
using JassSpace.Contracts.Interfaces;
using JassSpace.Contracts.Requests;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;

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

[AllowAnonymous]
[TypeFilter(typeof(ArtifactExceptionFilter))]
[ResponseCache(NoStore = true, Location = ResponseCacheLocation.None)]
public sealed class ArtifactShareController(IArtifactService artifacts) : BaseApiController
{
    // Secrets travel in headers or POST bodies, never in paths/query strings.
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

    [AcceptVerbs("GET", "HEAD", "POST")]
    [Route("artifact-downloads")]
    [RequestSizeLimit(4096)]
    [RateLimit("artifact-download")]
    [Produces("application/octet-stream")]
    public async Task<IActionResult> Download(CancellationToken ct)
    {
        var token = Request.Headers["X-Artifact-Grant"].ToString();
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
