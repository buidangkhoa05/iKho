namespace SchemaManagement.Models;

/// <summary>
/// Represents metadata about a schema registered in the Schema Registry.
/// </summary>
public record SchemaMetadata
{
    public string Subject { get; init; } = string.Empty;
    public int Version { get; init; }
    public int Id { get; init; }
    public string SchemaType { get; init; } = "JSON";
    public string Schema { get; init; } = string.Empty;
    public string Compatibility { get; init; } = "BACKWARD";
}

/// <summary>
/// Represents a topic-schema binding for local management.
/// </summary>
public record TopicSchemaBinding
{
    public string TopicName { get; init; } = string.Empty;
    public string Subject { get; init; } = string.Empty;
    public string SchemaFile { get; init; } = string.Empty;
    public string Namespace { get; init; } = "Generated";
    public string SchemaType { get; init; } = "JSON";
}

/// <summary>
/// Configuration for the schema management tool.
/// </summary>
public record SchemaManagementConfig
{
    public string RegistryUrl { get; init; } = "http://localhost:8081";
    public string SchemasDirectory { get; init; } = "Schemas";
    public string OutputDirectory { get; init; } = "Generated";
    public string DefaultNamespace { get; init; } = "SchemaManagement.Generated";
    public List<TopicSchemaBinding> TopicBindings { get; init; } = new();
}

/// <summary>
/// Result of a code generation operation.
/// </summary>
public record GenerationResult
{
    public bool Success { get; init; }
    public string OutputPath { get; init; } = string.Empty;
    public string ClassName { get; init; } = string.Empty;
    public string Namespace { get; init; } = string.Empty;
    public string? ErrorMessage { get; init; }
    public int LinesGenerated { get; init; }
}

/// <summary>
/// Result of a schema validation operation.
/// </summary>
public record ValidationResult
{
    public bool IsValid { get; init; }
    public List<string> Errors { get; init; } = new();
    public string SchemaSource { get; init; } = string.Empty;
    public string DataSource { get; init; } = string.Empty;
}
