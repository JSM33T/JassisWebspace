using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;
using Microsoft.Extensions.Configuration;

namespace JassSpace.Data;

public sealed class JassSpaceDesignTimeDbContextFactory : IDesignTimeDbContextFactory<JassSpaceDbContext>
{
    public JassSpaceDbContext CreateDbContext(string[] args)
    {
        var environmentName =
            Environment.GetEnvironmentVariable("DOTNET_ENVIRONMENT")
            ?? Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT")
            ?? "Development";

        var apiProjectPath = Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, "..", "..", "..", "..", "JassSpace.Api"));

        var configuration = new ConfigurationBuilder()
            .SetBasePath(apiProjectPath)
            .AddJsonFile("appsettings.json", optional: true)
            .AddJsonFile($"appsettings.{environmentName}.json", optional: true)
            .AddEnvironmentVariables()
            .Build();

        var connectionString =
            Environment.GetEnvironmentVariable("JASSSPACE_DESIGNTIME_CONNECTION")
            ?? configuration.GetConnectionString("DefaultConnection");

        if (string.IsNullOrWhiteSpace(connectionString) || IsPlaceholder(connectionString))
        {
            throw new InvalidOperationException(
                "No valid database connection string was found for EF design-time operations. " +
                "Set ConnectionStrings__DefaultConnection or JASSSPACE_DESIGNTIME_CONNECTION.");
        }

        var optionsBuilder = new DbContextOptionsBuilder<JassSpaceDbContext>();
        optionsBuilder.UseNpgsql(
            connectionString,
            npgsqlOptions => npgsqlOptions.MigrationsAssembly(typeof(JassSpaceDbContext).Assembly.GetName().Name));

        return new JassSpaceDbContext(optionsBuilder.Options);
    }

    private static bool IsPlaceholder(string connectionString)
    {
        var trimmed = connectionString.Trim();
        return trimmed.StartsWith("YOUR_", StringComparison.OrdinalIgnoreCase)
            || trimmed.StartsWith("CHANGE_ME", StringComparison.OrdinalIgnoreCase);
    }
}
