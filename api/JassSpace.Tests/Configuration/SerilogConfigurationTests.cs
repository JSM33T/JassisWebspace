using System.Text.Json;
using JassSpace.Tests.Support;

namespace JassSpace.Tests.Configuration;

public sealed class SerilogConfigurationTests
{
    [Fact]
    public void BaseConfig_UsesConsoleFirstCompactFormatting()
    {
        using var document = JsonDocument.Parse(File.ReadAllText(TestPaths.ApiProjectFile("appsettings.json")));
        var serilog = document.RootElement.GetProperty("Serilog");
        var usingEntries = serilog.GetProperty("Using").EnumerateArray().Select(x => x.GetString()).ToArray();
        var writeTo = serilog.GetProperty("WriteTo").EnumerateArray().ToArray();

        Assert.Contains("Serilog.Formatting.Compact", usingEntries);
        Assert.DoesNotContain("Serilog.Sinks.File", usingEntries);
        Assert.Single(writeTo);
        Assert.Equal("Console", writeTo[0].GetProperty("Name").GetString());
        Assert.Equal(
            "Serilog.Formatting.Compact.RenderedCompactJsonFormatter, Serilog.Formatting.Compact",
            writeTo[0].GetProperty("Args").GetProperty("formatter").GetString());
        Assert.Equal("Warning", serilog.GetProperty("MinimumLevel").GetProperty("Override").GetProperty("Microsoft.EntityFrameworkCore").GetString());
    }

    [Fact]
    public void DevelopmentConfig_UsesConsoleAndFileSinks()
    {
        var developmentConfigPath = TestPaths.ApiProjectFile("appsettings.Development.json");
        if (!File.Exists(developmentConfigPath))
        {
            return;
        }

        using var document = JsonDocument.Parse(File.ReadAllText(developmentConfigPath));
        var serilog = document.RootElement.GetProperty("Serilog");
        var usingEntries = serilog.GetProperty("Using").EnumerateArray().Select(x => x.GetString()).ToArray();
        var sinkNames = serilog.GetProperty("WriteTo").EnumerateArray().Select(x => x.GetProperty("Name").GetString()).ToArray();

        Assert.Contains("Serilog.Sinks.Console", usingEntries);
        Assert.Contains("Serilog.Sinks.File", usingEntries);
        Assert.Contains("Console", sinkNames);
        Assert.Contains("File", sinkNames);

        if (serilog.TryGetProperty("MinimumLevel", out var minimumLevel) &&
            minimumLevel.TryGetProperty("Override", out var overrides) &&
            overrides.TryGetProperty("Microsoft.EntityFrameworkCore.Database.Command", out var efCommandLevel))
        {
            Assert.Equal("Warning", efCommandLevel.GetString());
        }
    }
}
