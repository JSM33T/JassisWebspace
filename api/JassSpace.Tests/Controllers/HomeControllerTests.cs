using JassSpace.Api.Controllers;
using JassSpace.Contracts;
using JassSpace.Contracts.Responses;
using JassSpace.tests.Support;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging.Abstractions;

namespace JassSpace.tests.Controllers;

public sealed class HomeControllerTests
{
    [Fact]
    public void Index_ReturnsMatchingRequestIdentifiers()
    {
        var controller = new HomeController(NullLogger<HomeController>.Instance, new FakeHostEnvironment());
        var httpContext = new DefaultHttpContext();
        JassSpace.Api.Logging.RequestLoggingContext.SetCorrelationId(httpContext, "corr-home");
        controller.ControllerContext = new ControllerContext
        {
            HttpContext = httpContext
        };

        var result = Assert.IsType<OkObjectResult>(controller.Index());
        var envelope = Assert.IsType<ApiResponse<ServerInfo>>(result.Value);

        Assert.Equal("corr-home", envelope.Data.RequestId);
        Assert.Equal("corr-home", envelope.Data.CorrelationId);
    }

    [Fact]
    public void Health_ReturnsHealthyPayload()
    {
        var controller = new HomeController(
            NullLogger<HomeController>.Instance,
            new FakeHostEnvironment { EnvironmentName = "Testing" });
        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext()
        };

        var result = Assert.IsType<OkObjectResult>(controller.Health());
        var envelope = Assert.IsType<ApiResponse<HealthStatus>>(result.Value);

        Assert.Equal("Healthy", envelope.Data.Status);
        Assert.Equal("Testing", envelope.Data.Environment);
    }
}
