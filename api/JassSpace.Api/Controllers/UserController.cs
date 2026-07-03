using JassSpace.Api.Extensions;
using JassSpace.Contracts.Interfaces;
using JassSpace.Contracts.Responses;
using JassSpace.Contracts;
using JassSpace.Infra.Configuration;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;

namespace JassSpace.Api.Controllers;

[Route($"user")]
[ApiController]
public class UserController(
    ILogger<UserController> logger,
    IUserRepository userRepository,
    IOptions<AzureBlobStorageSettings> blobSettings)
    : BaseApiController
{
    private readonly string _containerName = blobSettings?.Value?.ContainerName ?? string.Empty;

    /// <summary>
    /// Get minimal public profile information for a username.
    /// </summary>
    [HttpGet("{username}/public")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(ApiResponse<UserPublicResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetPublicByUsername(string? username, CancellationToken cancellationToken = default)
    {
        try
        {
            var normalized = (username ?? string.Empty).Trim();
            if (string.IsNullOrEmpty(normalized)) return NotFoundProblem("User not found");

            var user = await userRepository.GetPublicByUsernameAsync(normalized, cancellationToken);
            return user == null ? NotFoundProblem("User not found") : OkEnvelope(MapPublicUserUrls(user));
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error getting public user for username {Username}", username);
            return Problem(StatusCodes.Status500InternalServerError, "Internal Server Error", "An error occurred while retrieving user");
        }
    }

    private UserPublicResponse MapPublicUserUrls(UserPublicResponse user)
        => user with
        {
            AvatarUrl = MediaUrlHelper.ToMediaUrl(Request, user.AvatarUrl, _containerName),
            CoverUrl = MediaUrlHelper.ToMediaUrl(Request, user.CoverUrl, _containerName)
        };
}
