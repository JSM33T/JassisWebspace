using JassSpace.Api.Controllers;
using JassSpace.Infra;
using Microsoft.AspNetCore.Mvc;

namespace JassSpace.tests.Support;

public sealed class TestableBaseApiController : BaseApiController
{
    public ObjectResult InvokeProblem(
        int statusCode,
        string title,
        string? detail = null,
        string? type = "about:blank",
        string? instance = null,
        IDictionary<string, object?>? extensions = null)
        => (ObjectResult)Problem(statusCode, title, detail, type, instance, extensions);

    public ObjectResult InvokeProblemEnvelope(
        int statusCode,
        string title,
        string? detail = null,
        string? type = "about:blank",
        string? instance = null,
        IDictionary<string, object?>? extensions = null)
        => (ObjectResult)ProblemEnvelope(statusCode, title, detail, type, instance, extensions);

    public ObjectResult InvokeTooManyRequestsProblem(
        string title = "Too many requests",
        string? detail = null,
        RateLimitDecision? decision = null)
        => (ObjectResult)TooManyRequestsProblem(title, detail, decision);
}
