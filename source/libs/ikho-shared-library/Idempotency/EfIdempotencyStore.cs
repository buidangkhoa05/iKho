using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace Ikho.SharedLibrary.Idempotency;

/// <summary>
/// <see cref="IIdempotencyStore"/> implementation backed by EF Core. Resolves
/// <typeparamref name="TDbContext"/> from the current DI scope per call, so it is safe to
/// register as a scoped or singleton service.
/// </summary>
public sealed class EfIdempotencyStore<TDbContext>(IServiceScopeFactory scopeFactory) : IIdempotencyStore
    where TDbContext : DbContext, IHasProcessedMessages
{
    /// <inheritdoc />
    public async Task<bool> HasBeenProcessedAsync(string consumerName, string messageId, CancellationToken cancellationToken = default)
    {
        using var scope = scopeFactory.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<TDbContext>();

        return await dbContext.ProcessedMessages
            .AnyAsync(m => m.ConsumerName == consumerName && m.MessageId == messageId, cancellationToken);
    }

    /// <inheritdoc />
    public async Task MarkProcessedAsync(string consumerName, string messageId, CancellationToken cancellationToken = default)
    {
        using var scope = scopeFactory.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<TDbContext>();

        dbContext.ProcessedMessages.Add(new ProcessedMessage
        {
            ConsumerName = consumerName,
            MessageId = messageId,
        });

        try
        {
            await dbContext.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException)
        {
            // Unique index violation means another concurrent delivery already recorded this
            // message as processed - safe to ignore, the goal (recorded exactly once) is met.
        }
    }
}
