using JassSpace.Api.Configuration;
using JassSpace.Contracts;
using JassSpace.Contracts.Responses;
using Microsoft.AspNetCore.Mvc;

namespace JassSpace.Api.Controllers;

[Route("version")]
public sealed class VersionController(ProductVersionManifest version) : BaseApiController
{
    [HttpGet]
    [ResponseCache(NoStore = true, Duration = 0, Location = ResponseCacheLocation.None)]
    [ProducesResponseType(typeof(ApiResponse<SoftwareVersion>), StatusCodes.Status200OK)]
    public IActionResult Index()
        => OkEnvelope(new SoftwareVersion(version.Api.Name, version.Api.Version));
}
