using System.Text.Json;
using System.Text.RegularExpressions;

namespace JassSpace.Api.Configuration;

public sealed record SoftwareVersionManifest(string Name, string Version);

public sealed record ProductVersionManifest(
    SoftwareVersionManifest Ui,
    SoftwareVersionManifest Api)
{
    private static readonly Regex SemVerPattern = new(
        @"^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$",
        RegexOptions.CultureInvariant);

    public static ProductVersionManifest Load()
    {
        var path = Path.Combine(AppContext.BaseDirectory, "version.json");
        if (!File.Exists(path))
        {
            throw new InvalidOperationException($"Product version manifest was not found at '{path}'.");
        }

        var manifest = JsonSerializer.Deserialize<ProductVersionManifest>(
            File.ReadAllText(path),
            new JsonSerializerOptions { PropertyNameCaseInsensitive = true })
            ?? throw new InvalidOperationException($"Product version manifest at '{path}' is empty or invalid.");

        if (manifest.Ui is null ||
            manifest.Api is null ||
            string.IsNullOrWhiteSpace(manifest.Ui.Name) ||
            string.IsNullOrWhiteSpace(manifest.Api.Name) ||
            string.IsNullOrWhiteSpace(manifest.Ui.Version) ||
            string.IsNullOrWhiteSpace(manifest.Api.Version) ||
            !SemVerPattern.IsMatch(manifest.Ui.Version) ||
            !SemVerPattern.IsMatch(manifest.Api.Version))
        {
            throw new InvalidOperationException($"Product version manifest at '{path}' has invalid values.");
        }

        return manifest;
    }
}
