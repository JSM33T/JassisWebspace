using JassSpace.Contracts;
using JassSpace.Infra;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using JassSpace.tests.Support;

namespace JassSpace.tests.Controllers;

public sealed class BaseApiControllerTests
{
    [Fact]
    public void Problem_IncludesRequestIdAndCorrelationIdExtensions()
    {
        var controller = CreateController("corr-123");

        var result = controller.InvokeProblem(StatusCodes.Status400BadRequest, "Bad request");
        var problem = Assert.IsType<ProblemDetails>(result.Value);

        Assert.Equal("corr-123", problem.Extensions["RequestId"]);
        Assert.Equal("corr-123", problem.Extensions["CorrelationId"]);
    }

    [Fact]
    public void ProblemEnvelope_IncludesRequestIdAndCorrelationIdExtensions()
    {
        var controller = CreateController("corr-456");

        var result = controller.InvokeProblemEnvelope(StatusCodes.Status401Unauthorized, "Unauthorized");
        var envelope = Assert.IsType<ApiResponse<ProblemDetails>>(result.Value);

        Assert.Equal("corr-456", envelope.Data.Extensions["RequestId"]);
        Assert.Equal("corr-456", envelope.Data.Extensions["CorrelationId"]);
    }

    [Fact]
    public void TooManyRequestsProblem_AppliesHeadersAndExtensions()
    {
        var controller = CreateController("corr-789");
        var now = DateTimeOffset.UtcNow;
        var decision = RateLimitDecision.Deny(
            policyName: "auth-login",
            limit: 10,
            count: 10,
            windowStart: now.AddMinutes(-1),
            windowEnd: now.AddMinutes(1),
            timestamp: now,
            retryAfterUtc: now.AddSeconds(30),
            reason: "slow down");

        var result = controller.InvokeTooManyRequestsProblem(decision: decision);
        var problem = Assert.IsType<ProblemDetails>(result.Value);

        Assert.Equal("auth-login", problem.Extensions["policy"]);
        Assert.Equal("10", controller.Response.Headers["X-RateLimit-Limit"].ToString());
        Assert.Equal("0", controller.Response.Headers["X-RateLimit-Remaining"].ToString());
        Assert.Equal("30", controller.Response.Headers["Retry-After"].ToString());
    }

    private static TestableBaseApiController CreateController(string correlationId)
    {
        var controller = new TestableBaseApiController();
        var httpContext = new DefaultHttpContext();
        httpContext.Request.Path = "/test";
        httpContext.Response.Body = new MemoryStream();
        JassSpace.Api.Logging.RequestLoggingContext.SetCorrelationId(httpContext, correlationId);
        controller.ControllerContext = new ControllerContext
        {
            HttpContext = httpContext
        };

        return controller;
    }
}
