using Ikho.SharedLibrary.Idempotency;
using Ikho.SharedLibrary.Outbox;
using Ikho.Warehouse.Inbound.Domain;
using Microsoft.EntityFrameworkCore;

namespace Ikho.Warehouse.Inbound.Shared;

/// <summary>
/// EF Core database context for the Inbound service. Implements
/// <see cref="IHasOutboxMessages"/> and <see cref="IHasProcessedMessages"/> so
/// <c>Ikho.SharedLibrary</c>'s outbox publisher and idempotency store can operate against this
/// database without depending on this concrete type.
/// </summary>
public sealed class InboundDbContext(DbContextOptions<InboundDbContext> options)
    : DbContext(options), IHasOutboxMessages, IHasProcessedMessages
{
    /// <summary>Purchase orders raised against suppliers.</summary>
    public DbSet<PurchaseOrder> PurchaseOrders => Set<PurchaseOrder>();

    /// <summary>Ordered lines belonging to purchase orders.</summary>
    public DbSet<PurchaseOrderLine> PurchaseOrderLines => Set<PurchaseOrderLine>();

    /// <summary>Receiving events recorded against purchase orders.</summary>
    public DbSet<Receipt> Receipts => Set<Receipt>();

    /// <summary>Lines received as part of a receipt.</summary>
    public DbSet<ReceiptLine> ReceiptLines => Set<ReceiptLine>();

    /// <summary>Putaway tasks created for received quantities.</summary>
    public DbSet<PutawayTask> PutawayTasks => Set<PutawayTask>();

    /// <inheritdoc />
    public DbSet<OutboxMessage> OutboxMessages => Set<OutboxMessage>();

    /// <inheritdoc />
    public DbSet<ProcessedMessage> ProcessedMessages => Set<ProcessedMessage>();

    /// <inheritdoc />
    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.ApplyConfiguration(new OutboxEntityTypeConfiguration());
        modelBuilder.ApplyConfiguration(new ProcessedMessageEntityTypeConfiguration());

        modelBuilder.Entity<PurchaseOrder>(entity =>
        {
            entity.HasKey(x => x.Id);
            entity.Property(x => x.SupplierCodeSnapshot).IsRequired().HasMaxLength(64);
            entity.Property(x => x.SupplierNameSnapshot).IsRequired().HasMaxLength(256);
            entity.Property(x => x.Status).HasConversion<string>().HasMaxLength(32);

            entity.HasMany(x => x.Lines)
                .WithOne()
                .HasForeignKey(x => x.PurchaseOrderId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<PurchaseOrderLine>(entity =>
        {
            entity.HasKey(x => x.Id);
            entity.Property(x => x.SkuSnapshot).IsRequired().HasMaxLength(64);
            entity.Property(x => x.ProductNameSnapshot).IsRequired().HasMaxLength(256);
            entity.Property(x => x.OrderedQuantity).HasPrecision(18, 4);
            entity.Property(x => x.ReceivedQuantity).HasPrecision(18, 4);
            entity.HasIndex(x => x.PurchaseOrderId);

            // Optimistic concurrency: ReceivedQuantity is read-then-incremented by
            // ReceiptsService.CompleteAsync without app-level locking, so two concurrent receipts
            // against the same line must fail loudly (DbUpdateConcurrencyException) rather than
            // both silently pass the "would exceed ordered quantity" check. Maps to Postgres's
            // native "xmin" system column rather than a real table column/migration.
            entity.Property<uint>("xmin").IsRowVersion();
        });

        modelBuilder.Entity<Receipt>(entity =>
        {
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Status).HasConversion<string>().HasMaxLength(32);
            entity.HasIndex(x => x.PurchaseOrderId);

            entity.HasMany(x => x.Lines)
                .WithOne()
                .HasForeignKey(x => x.ReceiptId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<ReceiptLine>(entity =>
        {
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Quantity).HasPrecision(18, 4);
            entity.Property(x => x.LotNumber).HasMaxLength(64);
            entity.HasIndex(x => x.ReceiptId);
            entity.HasIndex(x => x.PurchaseOrderLineId);
        });

        modelBuilder.Entity<PutawayTask>(entity =>
        {
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Quantity).HasPrecision(18, 4);
            entity.Property(x => x.Status).HasConversion<string>().HasMaxLength(32);

            // One putaway task per receipt line in this slice — see the remarks on PutawayTask.
            entity.HasIndex(x => x.ReceiptLineId).IsUnique();
        });
    }
}
