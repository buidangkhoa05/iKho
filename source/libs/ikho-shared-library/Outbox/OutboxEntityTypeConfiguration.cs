using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Ikho.SharedLibrary.Outbox;

/// <summary>
/// Shared EF Core mapping for <see cref="OutboxMessage"/>. Consuming services apply this via
/// <c>modelBuilder.ApplyConfiguration(new OutboxEntityTypeConfiguration())</c> in their own
/// <c>DbContext.OnModelCreating</c> so the outbox table shape is identical across services.
/// </summary>
public sealed class OutboxEntityTypeConfiguration : IEntityTypeConfiguration<OutboxMessage>
{
    /// <inheritdoc />
    public void Configure(EntityTypeBuilder<OutboxMessage> builder)
    {
        builder.ToTable("OutboxMessages");
        builder.HasKey(m => m.Id);
        builder.Property(m => m.Type).IsRequired().HasMaxLength(256);
        builder.Property(m => m.Payload).IsRequired();
        builder.Property(m => m.CorrelationId).HasMaxLength(64);

        // Speeds up the background publisher's "find unprocessed rows" poll query.
        builder.HasIndex(m => m.ProcessedAtUtc);
    }
}
