using JassSpace.Services;

namespace JassSpace.Tests.Services;

public sealed class AdminEmailServiceTests
{
    [Fact]
    public void Substitute_ReplacesBraceAndBracketVariables()
    {
        var vars = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
        {
            ["firstName"] = "Jassi",
            ["username"] = "jassi.me",
        };

        var result = AdminEmailService.Substitute(
            "Hey [firstName], your handle is {{ username }}.",
            vars);

        Assert.Equal("Hey Jassi, your handle is jassi.me.", result);
    }

    [Fact]
    public void Substitute_LeavesUnknownBracketTextUnchanged()
    {
        var vars = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
        {
            ["firstName"] = "Jassi",
        };

        var result = AdminEmailService.Substitute("[TEST] Hey [firstName]", vars);

        Assert.Equal("[TEST] Hey Jassi", result);
    }

    [Fact]
    public void ExtractVariables_DetectsBraceAndBracketVariables()
    {
        var result = AdminEmailService.ExtractVariables(
            "Hey [firstName]",
            "<p>{{ customValue }} for [email]</p>");

        Assert.Equal(["firstName", "customValue", "email"], result);
    }
}
