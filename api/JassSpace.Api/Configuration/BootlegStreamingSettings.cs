namespace JassSpace.Api.Configuration;

public class BootlegStreamingSettings
{
    public string SigningKey { get; set; } = "change-this-in-production";
    public int TokenTtlMinutes { get; set; } = 60;
}
