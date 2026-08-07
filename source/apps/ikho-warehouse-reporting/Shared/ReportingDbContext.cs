using Ikho.SharedLibrary.Idempotency;
using Ikho.SharedLibrary.Outbox;
using Ikho.Warehouse.Reporting.Domain;
using Microsoft.EntityFrameworkCore;

namespace Ikho.Warehouse.Reporting.Shared;

/// <summary>
/// EF Core database context for the Reporting service. Implements <see cref="IHasOutboxMessages"/>
/// and <see cref="IHasProcessedMessages"/> so <c>Ikho.SharedLibrary</c>'s outbox publisher and
/// idempotency store can operate against this database without depending on this concrete type.
/// Reporting never publishes events (see the rollout plan's Reporting service section), so
/// <see cref="OutboxMessages"/> is wired for consistency with every other service but is never
/// written to - only <see cref="IIdempotencyStore"/> (backed by <see cref="ProcessedMessages"/>)
/// is actually exercised, by the Kafka consumers that maintain the read models below.
/// </summary>
public sealed class ReportingDbContext(DbContextOptions<ReportingDbContext> options)
    : DbContext(options), IHasOutboxMessages, IHasProcessedMessages
{
    /// <summary>Per-(product, warehouse) stock position rollup, projected from Inventory events.</summary>
    public DbSet<InventoryPositionReadModel> InventoryPositions => Set<InventoryPositionReadModel>();

    /// <summary>Per-purchase-order inbound execution progress, projected from Inbound events.</summary>
    public DbSet<InboundStatusReadModel> InboundStatuses => Set<InboundStatusReadModel>();

    /// <summary>Per-sales-order outbound execution progress, projected from Outbound events.</summary>
    public DbSet<OutboundStatusReadModel> OutboundStatuses => Set<OutboundStatusReadModel>();

    /// <summary>Per-day platform-wide fulfillment counters, projected from Inbound/Outbound events.</summary>
    public DbSet<FulfillmentKpiReadModel> FulfillmentKpis => Set<FulfillmentKpiReadModel>();

    /// <inheritdoc />
    public DbSet<OutboxMessage> OutboxMessages => Set<OutboxMessage>();

    /// <inheritdoc />
    public DbSet<ProcessedMessage> ProcessedMessages => Set<ProcessedMessage>();

    /// <inheritdoc />
    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.ApplyConfiguration(new OutboxEntityTypeConfiguration());
        modelBuilder.ApplyConfiguration(new ProcessedMessageEntityTypeConfiguration());

        modelBuilder.Entity<InventoryPositionReadModel>(entity =>
        {
            entity.HasKey(x => x.Id);
            entity.Property(x => x.OnHandQuantity).HasPrecision(18, 4);
            entity.Property(x => x.ReservedQuantity).HasPrecision(18, 4);
            entity.Property(x => x.QuarantineQuantity).HasPrecision(18, 4);
            entity.Property(x => x.DamagedQuantity).HasPrecision(18, 4);

            // Getter-only computed property with no backing field - not mapped by EF Core
            // convention, but ignored explicitly here for defense-in-depth.
            entity.Ignore(x => x.AvailableQuantity);

            entity.HasIndex(x => new { x.ProductId, x.WarehouseId }).IsUnique();
        });

        modelBuilder.Entity<InboundStatusReadModel>(entity =>
        {
            entity.HasKey(x => x.Id);
            entity.HasIndex(x => x.PurchaseOrderId).IsUnique();
        });

        modelBuilder.Entity<OutboundStatusReadModel>(entity =>
        {
            entity.HasKey(x => x.Id);
            entity.HasIndex(x => x.SalesOrderId).IsUnique();
        });

        modelBuilder.Entity<FulfillmentKpiReadModel>(entity =>
        {
            entity.HasKey(x => x.Id);
            entity.HasIndex(x => x.Date).IsUnique();
        });
    }
}
