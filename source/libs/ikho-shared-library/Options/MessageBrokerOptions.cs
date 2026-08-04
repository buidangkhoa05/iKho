namespace Ikho.SharedLibrary.Options;

/// <summary>
/// Kafka connection and topic naming settings, bound from the <c>MessageBroker</c>
/// configuration section. Every warehouse service shares this shape so cluster
/// configuration and topic naming stay consistent across services.
/// </summary>
public sealed class MessageBrokerOptions
{
    /// <summary>
    /// The configuration section name this options type binds to.
    /// </summary>
    public const string SectionName = "MessageBroker";

    /// <summary>
    /// Comma-separated list of Kafka broker addresses (e.g. <c>localhost:9092</c>).
    /// </summary>
    public string BootstrapServers { get; set; } = string.Empty;

    /// <summary>
    /// The Kafka client id reported to the broker, typically the owning service name.
    /// </summary>
    public string ClientId { get; set; } = string.Empty;

    /// <summary>
    /// Prefix prepended to every published topic name (e.g. <c>warehouse.organization</c>),
    /// so topics stay namespaced per owning service.
    /// </summary>
    public string TopicPrefix { get; set; } = string.Empty;
}
