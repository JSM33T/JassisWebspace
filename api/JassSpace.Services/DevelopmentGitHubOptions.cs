namespace JassSpace.Services;

public sealed class DevelopmentGitHubOptions
{
    public const string SectionName = "GitHub";

    public string Owner { get; set; } = "JSM33T";
    public string Repository { get; set; } = "JassisWebspace";
    public string? Token { get; set; }
    public int CacheMinutes { get; set; } = 5;
}
