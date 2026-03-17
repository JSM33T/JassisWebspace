namespace JassSpace.Api.Configuration;

public sealed class OpenRouterSettings
{
    public const string SectionName = "OpenRouter";

    public string BaseUrl { get; set; } = "https://openrouter.ai/api/v1";

    public string ApiKey { get; set; } = string.Empty;

    public string Model { get; set; } = "openai/gpt-4o-mini";

    public string? SiteUrl { get; set; }

    public string? SiteName { get; set; }

    public string? SystemPrompt { get; set; }

    public double? Temperature { get; set; }

    public int? MaxTokens { get; set; }
}
