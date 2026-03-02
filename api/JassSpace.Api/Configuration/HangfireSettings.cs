namespace JassSpace.Api.Configuration;

public sealed class HangfireSettings
{
    public const string SectionName = "Hangfire";

    public string SchemaName { get; set; } = "hangfire";
    public string QueueName { get; set; } = "emails";
    public string DashboardPath { get; set; } = "/hangfire";
    public HangfireDashboardAuthSettings DashboardAuth { get; set; } = new();
}

public sealed class HangfireDashboardAuthSettings
{
    public string Username { get; set; } = "admin";
    public string Password { get; set; } = "change-me";
}
