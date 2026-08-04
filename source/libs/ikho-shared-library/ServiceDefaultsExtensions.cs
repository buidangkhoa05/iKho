using Ikho.SharedLibrary.Events;
using Ikho.SharedLibrary.HealthChecks;
using Ikho.SharedLibrary.Idempotency;
using Ikho.SharedLibrary.Middleware;
using Ikho.SharedLibrary.Options;
using Ikho.SharedLibrary.Outbox;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Routing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

namespace Ikho.SharedLibrary;

/// <summary>
/// Single entry point every warehouse service uses to opt into the platform's standard
/// cross-cutting behavior: correlation ids, request logging, health checks, Kafka event
/// publishing, transactional outbox, and consumer idempotency. Mirrors the shape of the
/// gateway's <c>Program.cs</c> registrations so behavior is consistent across services.
/// </summary>
public static class ServiceDefaultsExtensions
{
    /// <summary>
    /// Registers <see cref="MessageBrokerOptions"/>/<see cref="DatabaseOptions"/> config
    /// binding, the Kafka event publisher, the outbox writer and background publisher, the
    /// idempotency store, and readiness/liveness health checks. <typeparamref name="TDbContext"/>
    /// must implement both <see cref="IHasOutboxMessages"/> and <see cref="IHasProcessedMessages"/>
    /// (typically by applying <see cref="OutboxEntityTypeConfiguration"/> and
    /// <see cref="ProcessedMessageEntityTypeConfiguration"/> in <c>OnModelCreating</c>).
    /// </summary>
    public static IServiceCollection AddServiceDefaults<TDbContext>(this IServiceCollection services, IConfiguration configuration)
        where TDbContext : DbContext, IHasOutboxMessages, IHasProcessedMessages
    {
        services.Configure<MessageBrokerOptions>(configuration.GetSection(MessageBrokerOptions.SectionName));
        services.Configure<DatabaseOptions>(configuration.GetSection(DatabaseOptions.SectionName));

        var databaseOptions = configuration.GetSection(DatabaseOptions.SectionName).Get<DatabaseOptions>() ?? new DatabaseOptions();
        var brokerOptions = configuration.GetSection(MessageBrokerOptions.SectionName).Get<MessageBrokerOptions>() ?? new MessageBrokerOptions();

        services.AddSingleton<IEventPublisher, KafkaEventPublisher>();
        services.AddScoped<IOutboxWriter, OutboxWriter>();
        services.AddSingleton<IIdempotencyStore, EfIdempotencyStore<TDbContext>>();
        services.AddHostedService<OutboxPublisherBackgroundService<TDbContext>>();

        services.AddServiceDefaultsHealthChecks(databaseOptions, brokerOptions);

        return services;
    }

    /// <summary>
    /// Applies the standard middleware order (correlation id, then request logging) and maps
    /// the default health check endpoints. Call after routing/auth middleware is configured but
    /// before endpoint mapping, matching the gateway's <c>Program.cs</c> ordering.
    /// </summary>
    public static WebApplication UseServiceDefaults(this WebApplication app)
    {
        app.UseMiddleware<CorrelationIdMiddleware>();
        app.UseMiddleware<RequestLoggingMiddleware>();

        app.MapDefaultHealthCheckEndpoints();

        return app;
    }
}
