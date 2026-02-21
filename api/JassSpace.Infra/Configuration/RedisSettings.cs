namespace JassSpace.Infra.Configuration
{
    public sealed class RedisSettings
    {
        public const string SectionName = "Redis";
        public string InstanceName { get; set; } = "jassspace:";
        public int DefaultTtlMinutes { get; set; } = 30;
    }
}
