using System.Diagnostics;
using System.Runtime.InteropServices;
using JassSpace.Api.Services;
using JassSpace.Contracts;
using JassSpace.Contracts.Responses;
using Microsoft.AspNetCore.Mvc;

namespace JassSpace.Api.Controllers;

[Route("")]
public sealed class HomeController(
    ILogger<HomeController> logger,
    IHostEnvironment environment)
    : BaseApiController
{
    /// <summary>
    /// Root: prints machine, OS, and uptime details.
    /// </summary>
    [HttpGet]
    [ResponseCache(NoStore = true, Duration = 0, Location = ResponseCacheLocation.None)]
    [ProducesResponseType(typeof(ApiResponse<ServerInfo>), StatusCodes.Status200OK)]
    public IActionResult Index()
    {
        using var process = Process.GetCurrentProcess();
        var processStartUtc = new DateTimeOffset(process.StartTime.ToUniversalTime(), TimeSpan.Zero);
        var uptime = DateTimeOffset.UtcNow - processStartUtc;

        var info = new ServerInfo(
            Machine: Environment.MachineName,
            OS: RuntimeInformation.OSDescription,
            OSArchitecture: RuntimeInformation.OSArchitecture.ToString(),
            ProcessArchitecture: RuntimeInformation.ProcessArchitecture.ToString(),
            Framework: RuntimeInformation.FrameworkDescription,
            Uptime: uptime,
            ProcessStartUtc: processStartUtc,
            RequestId: RequestId,
            CorrelationId: CorrelationId
        );

        return OkEnvelope(info);
    }

    /// <summary>
    /// Liveness/health probe. Returns 200 with a simple message.
    /// Keep lightweight (no DB calls) so it’s safe for k8s liveness.
    /// </summary>
    [HttpGet("health")]
    [ProducesResponseType(typeof(ApiResponse<HealthStatus>), StatusCodes.Status200OK)]
    public IActionResult Health()
    {
        try
        {
            var payload = new HealthStatus("Healthy", DateTimeOffset.UtcNow, environment.EnvironmentName);
            return OkEnvelope(payload);
        }
        catch (Exception ex)
        {
            logger.LogError(ex,
                "Health check failed at {Time} with CorrelationId {CorrelationId}",
                DateTimeOffset.UtcNow,
                CorrelationId);

            return Problem(
                statusCode: StatusCodes.Status503ServiceUnavailable,
                title: "Service Unavailable",
                detail: ex.Message);
        }
    }
}
