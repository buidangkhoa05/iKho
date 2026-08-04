using Confluent.Kafka;
using HealthChecks.Kafka;
using Ikho.SharedLibrary.Options;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Diagnostics.HealthChecks;

namespace Ikho.SharedLibrary.HealthChecks;

/// <summary>
/// Standard health check registration and endpoint mapping shared by every warehouse service:
/// a liveness probe (process is running) and a readiness probe (dependencies - database,
/// broker - are reachable).
/// </summary>
public static class ServiceDefaultsHealthCheckExtensions
{
    /// <summary>
    /// Tag applied to checks that must pass for the service to be considered ready to receive
    /// traffic (as opposed to merely alive).
    /// </summary>
    public const string ReadyTag = "ready";

    /// <summary>
    /// Registers the database and message broker health checks, tagged <see cref="ReadyTag"/>.
    /// </summary>
    public static IHealthChecksBuilder AddServiceDefaultsHealthChecks(this IServiceCollection services, DatabaseOptions databaseOptions, MessageBrokerOptions brokerOptions)
    {
        var builder = services.AddHealthChecks();

        if (!string.IsNullOrWhiteSpace(databaseOptions.ConnectionString))
        {
            builder.AddNpgSql(databaseOptions.ConnectionString, name: "postgresql", tags: [ReadyTag]);
        }

        if (!string.IsNullOrWhiteSpace(brokerOptions.BootstrapServers))
        {
            builder.AddKafka(
                new KafkaHealthCheckOptions
                {
                    Configuration = new ProducerConfig { BootstrapServers = brokerOptions.BootstrapServers },
                },
                name: "kafka",
                tags: [ReadyTag]);
        }

        return builder;
    }

    /// <summary>
    /// Maps the standard <c>/health/live</c> (process alive, no dependency checks) and
    /// <c>/health/ready</c> (dependencies healthy, tagged <see cref="ReadyTag"/>) endpoints.
    /// </summary>
    public static IEndpointRouteBuilder MapDefaultHealthCheckEndpoints(this IEndpointRouteBuilder endpoints)
    {
        endpoints.MapHealthChecks("/health/live", new HealthCheckOptions
        {
            Predicate = _ => false,
        });

        endpoints.MapHealthChecks("/health/ready", new HealthCheckOptions
        {
            Predicate = check => check.Tags.Contains(ReadyTag),
        });

        return endpoints;
    }
}
