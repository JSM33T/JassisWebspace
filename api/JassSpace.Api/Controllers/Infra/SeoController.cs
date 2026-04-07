using JassSpace.Api.Configuration;
using JassSpace.Api.Filters;
using JassSpace.Contracts;
using JassSpace.Contracts.Interfaces;
using JassSpace.Contracts.Responses;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace JassSpace.Api.Controllers;

[Route("seo")]
[AllowAnonymous]
public sealed class SeoController(
    ISeoService seoService,
    ILogger<SeoController> logger) : BaseApiController
{
    [HttpGet("blog/{slug}")]
    [CachedResponse(RedisCacheKeys.BlogSeo, TtlSeconds = 600, Scope = CacheScope.Anonymous, VaryByQuery = false)]
    [ProducesResponseType(typeof(ApiResponse<BlogSeoResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetBlogSeo(string slug, CancellationToken cancellationToken = default)
    {
        try
        {
            var response = await seoService.GetBlogSeoAsync(
                slug,
                $"{Request.Scheme}://{Request.Host}",
                cancellationToken);

            if (response is null)
            {
                return NotFoundProblem("Blog not found", $"No published blog found with slug '{slug}'.");
            }

            return OkEnvelope(response);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to build SEO payload for blog {Slug}", slug);
            return Problem(
                StatusCodes.Status500InternalServerError,
                "Failed to build SEO metadata",
                "An unexpected error occurred while preparing SEO metadata.");
        }
    }

    [HttpGet("gallery/{slug}")]
    [CachedResponse(RedisCacheKeys.GallerySeo, TtlSeconds = 600, Scope = CacheScope.Anonymous, VaryByQuery = false)]
    [ProducesResponseType(typeof(ApiResponse<GallerySeoResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetGallerySeo(string slug, CancellationToken cancellationToken = default)
    {
        try
        {
            var response = await seoService.GetGallerySeoAsync(
                slug,
                $"{Request.Scheme}://{Request.Host}",
                cancellationToken);

            if (response is null)
            {
                return NotFoundProblem("Album not found", $"No active gallery album found with slug '{slug}'.");
            }

            return OkEnvelope(response);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to build SEO payload for gallery {Slug}", slug);
            return Problem(
                StatusCodes.Status500InternalServerError,
                "Failed to build SEO metadata",
                "An unexpected error occurred while preparing SEO metadata.");
        }
    }

    [HttpGet("music/{slug}")]
    [CachedResponse(RedisCacheKeys.MusicSeo, TtlSeconds = 600, Scope = CacheScope.Anonymous, VaryByQuery = false)]
    [ProducesResponseType(typeof(ApiResponse<MusicSeoResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetMusicSeo(string slug, CancellationToken cancellationToken = default)
    {
        try
        {
            var response = await seoService.GetMusicSeoAsync(
                slug,
                $"{Request.Scheme}://{Request.Host}",
                cancellationToken);

            if (response is null)
            {
                return NotFoundProblem("Track not found", $"No published track found with slug '{slug}'.");
            }

            return OkEnvelope(response);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to build SEO payload for music track {Slug}", slug);
            return Problem(
                StatusCodes.Status500InternalServerError,
                "Failed to build SEO metadata",
                "An unexpected error occurred while preparing SEO metadata.");
        }
    }

}
