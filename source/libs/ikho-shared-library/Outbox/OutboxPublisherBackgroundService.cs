using Ikho.SharedLibrary.Events;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace Ikho.SharedLibrary.Outbox;

/// <summary>
/// Polls the outbox table for unprocessed rows on a fixed interval and publishes them via
/// <see cref="IEventPublisher"/>, marking each row processed on success or recording the
/// error and incrementing the retry count on failure. Requires <typeparamref name="TDbContext"/>
/// to implement <see cref="IHasOutboxMessages"/>.
/// </summary>
public sealed class OutboxPublisherBackgroundService<TDbContext>(
    IServiceScopeFactory scopeFactory,
    IEventPublisher publisher,
    ILogger<OutboxPublisherBackgroundService<TDbContext>> logger) : BackgroundService
    where TDbContext : DbContext, IHasOutboxMessages
{
    private static readonly TimeSpan PollInterval = TimeSpan.FromSeconds(5);
    private const int BatchSize = 50;

    /// <inheritdoc />
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await PublishPendingBatchAsync(stoppingToken);
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Outbox publisher failed to process the pending batch.");
            }

            try
            {
                await Task.Delay(PollInterval, stoppingToken);
            }
            catch (OperationCanceledException)
            {
                // Expected during shutdown when stoppingToken is cancelled.
            }
        }
    }

    private async Task PublishPendingBatchAsync(CancellationToken cancellationToken)
    {
        using var scope = scopeFactory.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<TDbContext>();

        var pending = await dbContext.OutboxMessages
            .Where(m => m.ProcessedAtUtc == null)
            .OrderBy(m => m.OccurredAtUtc)
            .Take(BatchSize)
            .ToListAsync(cancellationToken);

        foreach (var message in pending)
        {
            try
            {
                await publisher.PublishAsync(message.Type, message.Payload, message.CorrelationId, cancellationToken);
                message.ProcessedAtUtc = DateTimeOffset.UtcNow;
                message.Error = null;
            }
            catch (Exception ex)
            {
                message.RetryCount++;
                message.Error = ex.Message;
                logger.LogWarning(ex, "Failed to publish outbox message {OutboxMessageId} (attempt {RetryCount}).", message.Id, message.RetryCount);
            }
        }

        await dbContext.SaveChangesAsync(cancellationToken);
    }
}
