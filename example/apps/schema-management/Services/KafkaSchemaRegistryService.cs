using Confluent.SchemaRegistry;
using SchemaManagement.Models;

namespace SchemaManagement.Services;

/// <summary>
/// Manages schemas in Confluent Schema Registry for Kafka topics.
/// </summary>
public class KafkaSchemaRegistryService : IDisposable
{
    private readonly CachedSchemaRegistryClient _client;
    private readonly string _registryUrl;

    public KafkaSchemaRegistryService(string registryUrl)
    {
        _registryUrl = registryUrl;
        var config = new SchemaRegistryConfig
        {
            Url = registryUrl
        };
        _client = new CachedSchemaRegistryClient(config);
    }

    /// <summary>
    /// Register a JSON schema for a given subject (typically "{topic}-value" or "{topic}-key").
    /// </summary>
    /// <param name="subject">Schema Registry subject name</param>
    /// <param name="schemaJson">The JSON Schema content</param>
    /// <returns>The registered schema ID</returns>
    public async Task<int> RegisterSchemaAsync(string subject, string schemaJson)
    {
        var schema = new Schema(schemaJson, SchemaType.Json);
        var schemaId = await _client.RegisterSchemaAsync(subject, schema);
        return schemaId;
    }

    /// <summary>
    /// Get all registered subjects.
    /// </summary>
    public async Task<List<string>> ListSubjectsAsync()
    {
        var subjects = await _client.GetAllSubjectsAsync();
        return subjects.ToList();
    }

    /// <summary>
    /// Get the latest schema for a subject.
    /// </summary>
    public async Task<SchemaMetadata> GetLatestSchemaAsync(string subject)
    {
        var registered = await _client.GetLatestSchemaAsync(subject);
        return new SchemaMetadata
        {
            Subject = subject,
            Version = registered.Version,
            Id = registered.Id,
            SchemaType = registered.SchemaType.ToString(),
            Schema = registered.SchemaString
        };
    }

    /// <summary>
    /// Get a specific version of a schema for a subject.
    /// </summary>
    public async Task<SchemaMetadata> GetSchemaAsync(string subject, int version)
    {
        var schemaString = await _client.GetRegisteredSchemaAsync(subject, version);
        return new SchemaMetadata
        {
            Subject = subject,
            Version = version,
            Id = schemaString.Id,
            SchemaType = schemaString.SchemaType.ToString(),
            Schema = schemaString.SchemaString
        };
    }

    /// <summary>
    /// Check if a schema is compatible with the latest version registered under a subject.
    /// </summary>
    public async Task<bool> TestCompatibilityAsync(string subject, string schemaJson)
    {
        var schema = new Schema(schemaJson, SchemaType.Json);
        var isCompatible = await _client.IsCompatibleAsync(subject, schema);
        return isCompatible;
    }

    /// <summary>
    /// Get all versions for a subject.
    /// </summary>
    public async Task<List<int>> GetVersionsAsync(string subject)
    {
        var versions = await _client.GetSubjectVersionsAsync(subject);
        return versions.ToList();
    }

    /// <summary>
    /// Convenience: build the conventional subject name for a Kafka topic's value schema.
    /// </summary>
    public static string TopicValueSubject(string topicName) => $"{topicName}-value";

    /// <summary>
    /// Convenience: build the conventional subject name for a Kafka topic's key schema.
    /// </summary>
    public static string TopicKeySubject(string topicName) => $"{topicName}-key";

    public void Dispose()
    {
        _client?.Dispose();
        GC.SuppressFinalize(this);
    }
}
