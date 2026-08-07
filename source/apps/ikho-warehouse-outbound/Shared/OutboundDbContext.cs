using Ikho.SharedLibrary.Idempotency;
using Ikho.SharedLibrary.Outbox;
using Ikho.Warehouse.Outbound.Domain;
using Microsoft.EntityFrameworkCore;

namespace Ikho.Warehouse.Outbound.Shared;

/// <summary>
/// EF Core database context for the Outbound service. Implements
/// <see cref="IHasOutboxMessages"/> and <see cref="IHasProcessedMessages"/> so
/// <c>Ikho.SharedLibrary</c>'s outbox publisher and idempotency store can operate against this
/// database without depending on this concrete type.
/// </summary>
public sealed class OutboundDbContext(DbContextOptions<OutboundDbContext> options)
    : DbContext(options), IHasOutboxMessages, IHasProcessedMessages
{
    /// <summary>Customer requests to ship product from a warehouse.</summary>
    public DbSet<SalesOrder> SalesOrders => Set<SalesOrder>();

    /// <summary>Per-product lines on a <see cref="SalesOrder"/>.</summary>
    public DbSet<SalesOrderLine> SalesOrderLines => Set<SalesOrderLine>();

    /// <summary>Links between sales order lines and the stock reservations Inventory holds for them.</summary>
    public DbSet<Allocation> Allocations => Set<Allocation>();

    /// <summary>Dispatched shipments.</summary>
    public DbSet<Shipment> Shipments => Set<Shipment>();

    /// <summary>Per-allocation lines on a <see cref="Shipment"/>.</summary>
    public DbSet<ShipmentLine> ShipmentLines => Set<ShipmentLine>();

    /// <inheritdoc />
    public DbSet<OutboxMessage> OutboxMessages => Set<OutboxMessage>();

    /// <inheritdoc />
    public DbSet<ProcessedMessage> ProcessedMessages => Set<ProcessedMessage>();

    /// <inheritdoc />
    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.ApplyConfiguration(new OutboxEntityTypeConfiguration());
        modelBuilder.ApplyConfiguration(new ProcessedMessageEntityTypeConfiguration());

        modelBuilder.Entity<SalesOrder>(entity =>
        {
            entity.HasKey(x => x.Id);
            entity.Property(x => x.CustomerCodeSnapshot).IsRequired().HasMaxLength(64);
            entity.Property(x => x.CustomerNameSnapshot).IsRequired().HasMaxLength(256);
            entity.Property(x => x.Status).HasConversion<string>().HasMaxLength(32);
            entity.HasMany(x => x.Lines).WithOne().HasForeignKey(x => x.SalesOrderId).OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<SalesOrderLine>(entity =>
        {
            entity.HasKey(x => x.Id);
            entity.Property(x => x.SkuSnapshot).IsRequired().HasMaxLength(64);
            entity.Property(x => x.ProductNameSnapshot).IsRequired().HasMaxLength(256);
            entity.Property(x => x.Quantity).HasPrecision(18, 4);
            entity.HasIndex(x => x.SalesOrderId);
        });

        modelBuilder.Entity<Allocation>(entity =>
        {
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Quantity).HasPrecision(18, 4);
            entity.Property(x => x.Status).HasConversion<string>().HasMaxLength(32);
            entity.HasIndex(x => x.SalesOrderLineId).IsUnique();
        });

        modelBuilder.Entity<Shipment>(entity =>
        {
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Status).HasConversion<string>().HasMaxLength(32);
            entity.HasIndex(x => x.SalesOrderId);
            entity.HasMany(x => x.Lines).WithOne().HasForeignKey(x => x.ShipmentId).OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<ShipmentLine>(entity =>
        {
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Quantity).HasPrecision(18, 4);
            entity.HasIndex(x => x.ShipmentId);
            entity.HasIndex(x => x.AllocationId);
        });
    }
}
