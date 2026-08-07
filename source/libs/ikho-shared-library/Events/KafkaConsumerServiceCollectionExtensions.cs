using Ikho.SharedLibrary.Idempotency;
using Ikho.SharedLibrary.Options;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Ikho.SharedLibrary.Events;

/// <summary>
/// Opt-in registration for consuming a Kafka topic into a service, separate from
/// <c>ServiceDefaultsExtensions.AddServiceDefaults{TDbContext}</c> (which every service calls
/// regardless of whether it consumes anything) so publish-only services are unaffected.
/// </summary>
public static class KafkaConsumerServiceCollectionExtensions
{
    /// <summary>
    /// Registers <typeparamref name="THandler"/> (scoped) and adds a
    /// <see cref="KafkaConsumerBackgroundService{TDbContext,TEvent,THandler}"/> hosted service
    /// that subscribes to <paramref name="topic"/> and dispatches to it. Requires
    /// <c>AddServiceDefaults{TDbContext}</c> to have already been called for the same
    /// <typeparamref name="TDbContext"/>, since the consumer resolves the
    /// <see cref="IIdempotencyStore"/> registered by that call.
    /// </summary>
    /// <remarks>
    /// Safe to call more than once for the same <typeparamref name="TEvent"/> with a different
    /// <typeparamref name="THandler"/> and <paramref name="consumerName"/> - each registration
    /// resolves its own concrete handler type and gets its own Kafka consumer group, so multiple
    /// independent projections of the same topic can coexist (see
    /// <see cref="KafkaConsumerBackgroundService{TDbContext,TEvent,THandler}"/>).
    /// </remarks>
    /// <param name="topic">The full Kafka topic name to subscribe to (e.g. <c>warehouse.inventory.InventoryReceived</c>).</param>
    /// <param name="eventType">The event type name for logging/diagnostics (matches the publishing side's <c>nameof(...)</c> value).</param>
    /// <param name="consumerName">Stable name identifying this consumer for idempotency bookkeeping and its Kafka consumer group (e.g. <c>WarehouseReporting.InventoryReceived</c>).</param>
    public static IServiceCollection AddKafkaConsumer<TDbContext, TEvent, THandler>(
        this IServiceCollection services,
        string topic,
        string eventType,
        string consumerName)
        where TDbContext : DbContext, IHasProcessedMessages
        where THandler : class, IIntegrationEventHandler<TEvent>
    {
        services.AddScoped<THandler>();

        services.AddSingleton<IHostedService>(sp => new KafkaConsumerBackgroundService<TDbContext, TEvent, THandler>(
            sp.GetRequiredService<IServiceScopeFactory>(),
            sp.GetRequiredService<IOptions<MessageBrokerOptions>>(),
            sp.GetRequiredService<ILogger<KafkaConsumerBackgroundService<TDbContext, TEvent, THandler>>>(),
            topic,
            eventType,
            consumerName));

        return services;
    }
}
