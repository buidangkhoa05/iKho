using Ikho.SharedLibrary.Idempotency;
using Ikho.SharedLibrary.Outbox;
using Ikho.Warehouse.Inventory.Domain;
using Microsoft.EntityFrameworkCore;

namespace Ikho.Warehouse.Inventory.Shared;

/// <summary>
/// EF Core database context for the Inventory service. Implements
/// <see cref="IHasOutboxMessages"/> and <see cref="IHasProcessedMessages"/> so
/// <c>Ikho.SharedLibrary</c>'s outbox publisher and idempotency store can operate against this
/// database without depending on this concrete type.
/// </summary>
public sealed class InventoryDbContext(DbContextOptions<InventoryDbContext> options)
    : DbContext(options), IHasOutboxMessages, IHasProcessedMessages
{
    /// <summary>Per-location stock records — the atomic unit of on-hand/reserved/damaged/quarantine quantity.</summary>
    public DbSet<StockItem> StockItems => Set<StockItem>();

    /// <summary>Materialized per-(product, warehouse) quantity rollups.</summary>
    public DbSet<StockBalance> StockBalances => Set<StockBalance>();

    /// <summary>Append-only history of every quantity-affecting operation.</summary>
    public DbSet<StockLedgerEntry> StockLedgerEntries => Set<StockLedgerEntry>();

    /// <summary>Receiving batches for lot-controlled products.</summary>
    public DbSet<Lot> Lots => Set<Lot>();

    /// <summary>Individual serialized units for serial-controlled products.</summary>
    public DbSet<SerialNumber> SerialNumbers => Set<SerialNumber>();

    /// <summary>Holds against available stock taken on behalf of outbound execution.</summary>
    public DbSet<StockReservation> StockReservations => Set<StockReservation>();

    /// <summary>Audit trail of manual on-hand quantity corrections.</summary>
    public DbSet<InventoryAdjustment> InventoryAdjustments => Set<InventoryAdjustment>();

    /// <inheritdoc />
    public DbSet<OutboxMessage> OutboxMessages => Set<OutboxMessage>();

    /// <inheritdoc />
    public DbSet<ProcessedMessage> ProcessedMessages => Set<ProcessedMessage>();

    /// <inheritdoc />
    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.ApplyConfiguration(new OutboxEntityTypeConfiguration());
        modelBuilder.ApplyConfiguration(new ProcessedMessageEntityTypeConfiguration());

        modelBuilder.Entity<StockItem>(entity =>
        {
            entity.HasKey(x => x.Id);
            entity.Property(x => x.OnHandQuantity).HasPrecision(18, 4);
            entity.Property(x => x.ReservedQuantity).HasPrecision(18, 4);
            entity.Property(x => x.DamagedQuantity).HasPrecision(18, 4);
            entity.Property(x => x.QuarantineQuantity).HasPrecision(18, 4);

            // Getter-only computed property with no backing field — not mapped by EF Core
            // convention, but ignored explicitly here for defense-in-depth.
            entity.Ignore(x => x.AvailableQuantity);

            // See the caveat on StockItem: NULL != NULL in Postgres means this index does not
            // fully prevent duplicates when LotId/SerialNumberId are both null. Application code
            // must always look up the matching row before creating a new one.
            entity.HasIndex(x => new { x.ProductId, x.WarehouseId, x.BinId, x.LotId, x.SerialNumberId }).IsUnique();

            // Optimistic concurrency: this row is read-then-mutated by several features
            // (reservations, receipts, adjustments) without app-level locking, so concurrent
            // requests against the same stock item must fail loudly (DbUpdateConcurrencyException)
            // rather than silently lose one side's update (e.g. oversell via two concurrent
            // reservations both reading the same available quantity). Maps to Postgres's native
            // "xmin" system column rather than a real table column/migration.
            entity.Property<uint>("xmin").IsRowVersion();
        });

        modelBuilder.Entity<StockBalance>(entity =>
        {
            entity.HasKey(x => x.Id);
            entity.Property(x => x.OnHandQuantity).HasPrecision(18, 4);
            entity.Property(x => x.ReservedQuantity).HasPrecision(18, 4);
            entity.Property(x => x.DamagedQuantity).HasPrecision(18, 4);
            entity.Property(x => x.QuarantineQuantity).HasPrecision(18, 4);
            entity.HasIndex(x => new { x.ProductId, x.WarehouseId }).IsUnique();

            // See the concurrency remarks on StockItem above — the same read-then-mutate race
            // applies to this per-(product, warehouse) rollup.
            entity.Property<uint>("xmin").IsRowVersion();
        });

        modelBuilder.Entity<StockLedgerEntry>(entity =>
        {
            entity.HasKey(x => x.Id);
            entity.Property(x => x.QuantityDelta).HasPrecision(18, 4);
            entity.Property(x => x.MovementType).HasConversion<string>().HasMaxLength(32);
            entity.Property(x => x.ReasonCode).HasMaxLength(64);
            entity.Property(x => x.ReferenceType).HasMaxLength(64);
            entity.Property(x => x.ReferenceId).HasMaxLength(64);
            entity.Property(x => x.CorrelationId).HasMaxLength(64);

            // Speeds up the ledger-history query behind GET /stock-items/{id}/ledger.
            entity.HasIndex(x => new { x.StockItemId, x.OccurredOnUtc });
        });

        modelBuilder.Entity<Lot>(entity =>
        {
            entity.HasKey(x => x.Id);
            entity.Property(x => x.LotNumber).IsRequired().HasMaxLength(64);
            entity.HasIndex(x => new { x.ProductId, x.LotNumber }).IsUnique();
        });

        modelBuilder.Entity<SerialNumber>(entity =>
        {
            entity.HasKey(x => x.Id);
            entity.Property(x => x.SerialValue).IsRequired().HasMaxLength(128);
            entity.Property(x => x.Status).HasConversion<string>().HasMaxLength(32);
            entity.HasIndex(x => new { x.ProductId, x.SerialValue }).IsUnique();
        });

        modelBuilder.Entity<StockReservation>(entity =>
        {
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Quantity).HasPrecision(18, 4);
            entity.Property(x => x.Status).HasConversion<string>().HasMaxLength(32);
            entity.Property(x => x.ReferenceType).HasMaxLength(64);
            entity.Property(x => x.ReferenceId).HasMaxLength(64);
            entity.HasIndex(x => x.StockItemId);
        });

        modelBuilder.Entity<InventoryAdjustment>(entity =>
        {
            entity.HasKey(x => x.Id);
            entity.Property(x => x.QuantityDelta).HasPrecision(18, 4);
            entity.Property(x => x.ReasonCode).IsRequired().HasMaxLength(64);
            entity.Property(x => x.Notes).HasMaxLength(1024);
            entity.Property(x => x.CorrelationId).HasMaxLength(64);
            entity.HasIndex(x => x.StockItemId);
        });
    }
}
