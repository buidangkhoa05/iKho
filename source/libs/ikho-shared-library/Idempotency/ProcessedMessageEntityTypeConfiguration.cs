using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Ikho.SharedLibrary.Idempotency;

/// <summary>
/// Shared EF Core mapping for <see cref="ProcessedMessage"/>. Consuming services apply this
/// via <c>modelBuilder.ApplyConfiguration(new ProcessedMessageEntityTypeConfiguration())</c>
/// so the deduplication table shape and unique index are identical across services.
/// </summary>
public sealed class ProcessedMessageEntityTypeConfiguration : IEntityTypeConfiguration<ProcessedMessage>
{
    /// <inheritdoc />
    public void Configure(EntityTypeBuilder<ProcessedMessage> builder)
    {
        builder.ToTable("ProcessedMessages");
        builder.HasKey(m => m.Id);
        builder.Property(m => m.ConsumerName).IsRequired().HasMaxLength(256);
        builder.Property(m => m.MessageId).IsRequired().HasMaxLength(256);

        // Enforces "at most once processed per consumer" even under concurrent delivery.
        builder.HasIndex(m => new { m.ConsumerName, m.MessageId }).IsUnique();
    }
}
