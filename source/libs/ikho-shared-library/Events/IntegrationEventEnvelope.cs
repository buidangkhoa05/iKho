namespace Ikho.SharedLibrary.Events;

/// <summary>
/// Mirrors the shape of the private <c>EventEnvelope</c> record <see cref="KafkaEventPublisher"/>
/// serializes onto every topic (<c>EventType</c>, <c>OccurredAtUtc</c>, <c>CorrelationId</c>,
/// <c>Payload</c>). Kept as a small internal type of its own rather than making the publisher's
/// record non-private, so publish-side code is untouched. Property names/casing must stay in
/// sync with <see cref="KafkaEventPublisher"/>'s envelope for JSON round-tripping to work.
/// </summary>
internal sealed record IntegrationEventEnvelope(string EventType, DateTimeOffset OccurredAtUtc, string? CorrelationId, string Payload);
