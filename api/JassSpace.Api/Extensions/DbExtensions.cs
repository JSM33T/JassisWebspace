using System;
using JassSpace.Data;
using Microsoft.EntityFrameworkCore;
namespace JassSpace.Api.Extensions
{
    /// <summary>
    /// Provides extension methods for registering the <see cref="JassSpaceDbContext"/> in the
    /// dependency injection (DI) container. Configures PostgreSQL with retry policies, migration
    /// assembly, logging, and environment-specific options.
    ///
    /// Features:
    /// <list type="bullet">
    ///   <item>
    ///     <description>Uses the <c>"DefaultConnection"</c> connection string from configuration.</description>
    ///   </item>
    ///   <item>
    ///     <description>Sets EF Core migrations assembly to <c>JassSpace.Data</c>.</description>
    ///   </item>
    ///   <item>
    ///     <description>Enables retry on transient failures (max 3 retries, 5-second delay).</description>
    ///   </item>
    ///   <item>
    ///     <description>Ignores common EF Core warnings (navigation/query filter interaction,
    ///     pending model changes).</description>
    ///   </item>
    ///   <item>
    ///     <description>Enables sensitive data logging and detailed errors in the Development environment.</description>
    ///   </item>
    /// </list>
    ///
    /// Usage:
    /// <code>
    /// services.AddJassSpaceDbContext(Configuration, Environment);
    /// </code>
    /// </summary>
    public static class DbExtensions
    {
        /// <summary>
        /// Registers <see cref="JassSpaceDbContext"/> with Npgsql and configures provider- and environment-specific options.
        /// </summary>
        /// <param name="services">The DI service collection.</param>
        /// <param name="configuration">Application configuration used to resolve the connection string.</param>
        /// <param name="env">The current host environment.</param>
        /// <returns>The same <see cref="IServiceCollection"/> instance for chaining.</returns>
        /// <exception cref="InvalidOperationException">Thrown when the <c>DefaultConnection</c> connection string is missing or empty.</exception>
        public static IServiceCollection AddJassSpaceDbContext(this IServiceCollection services, IConfiguration configuration, IHostEnvironment env)
        {
            var connectionString = configuration.GetConnectionString("DefaultConnection");
            if (string.IsNullOrWhiteSpace(connectionString))
            {
                throw new InvalidOperationException(
                    "Connection string 'DefaultConnection' was not found or is empty. " +
                    "Ensure it is defined in the environment configuration.");
            }

            void Configure(DbContextOptionsBuilder options)
            {
                options.UseNpgsql(connectionString, npgsqlOptions =>
                {
                    npgsqlOptions.MigrationsAssembly("JassSpace.Data");
                    npgsqlOptions.UseQuerySplittingBehavior(QuerySplittingBehavior.SplitQuery);
                    npgsqlOptions.EnableRetryOnFailure(
                        maxRetryCount: 3,
                        maxRetryDelay: TimeSpan.FromSeconds(5),
                        errorCodesToAdd: null);
                });

                options.ConfigureWarnings(warnings =>
                {
                    warnings.Ignore(Microsoft.EntityFrameworkCore.Diagnostics.CoreEventId.PossibleIncorrectRequiredNavigationWithQueryFilterInteractionWarning);
                    warnings.Ignore(Microsoft.EntityFrameworkCore.Diagnostics.RelationalEventId.PendingModelChangesWarning);
                });

                if (env.IsDevelopment())
                {
                    options.EnableSensitiveDataLogging();
                    options.EnableDetailedErrors();
                }
            }

            services.AddDbContext<JassSpaceDbContext>(Configure, ServiceLifetime.Scoped, ServiceLifetime.Singleton);
            services.AddDbContextFactory<JassSpaceDbContext>(Configure, ServiceLifetime.Singleton);

            return services;
        }
    }
}
