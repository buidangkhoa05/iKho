using System.Text.Json;
using SchemaManagement.Models;

namespace SchemaManagement.Services;

/// <summary>
/// Manages local schema files on disk — discovery, reading, writing, and config.
/// </summary>
public class SchemaFileManager
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        WriteIndented = true,
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        PropertyNameCaseInsensitive = true
    };

    /// <summary>
    /// Discover all JSON Schema files in a directory.
    /// </summary>
    /// <param name="directory">Directory to search</param>
    /// <param name="pattern">File glob pattern (default: *.schema.json)</param>
    /// <returns>List of absolute file paths</returns>
    public List<string> DiscoverSchemas(string directory, string pattern = "*.schema.json")
    {
        if (!Directory.Exists(directory))
            return new List<string>();

        return Directory.GetFiles(directory, pattern, SearchOption.AllDirectories)
            .OrderBy(f => f)
            .ToList();
    }

    /// <summary>
    /// Read a JSON Schema file and return its content.
    /// </summary>
    public async Task<string> ReadSchemaAsync(string filePath)
    {
        if (!File.Exists(filePath))
            throw new FileNotFoundException($"Schema file not found: {filePath}");

        return await File.ReadAllTextAsync(filePath);
    }

    /// <summary>
    /// Write a schema string to a file.
    /// </summary>
    public async Task WriteSchemaAsync(string filePath, string schemaJson)
    {
        var directory = Path.GetDirectoryName(filePath);
        if (!string.IsNullOrEmpty(directory))
            Directory.CreateDirectory(directory);

        // Pretty-print the JSON
        try
        {
            var jsonDoc = JsonDocument.Parse(schemaJson);
            var formatted = JsonSerializer.Serialize(jsonDoc, JsonOptions);
            await File.WriteAllTextAsync(filePath, formatted);
        }
        catch
        {
            // If JSON parsing fails, write as-is
            await File.WriteAllTextAsync(filePath, schemaJson);
        }
    }

    /// <summary>
    /// Load the schema-management configuration from a JSON file.
    /// </summary>
    public async Task<SchemaManagementConfig> LoadConfigAsync(string configPath)
    {
        if (!File.Exists(configPath))
            return new SchemaManagementConfig();

        var json = await File.ReadAllTextAsync(configPath);
        return JsonSerializer.Deserialize<SchemaManagementConfig>(json, JsonOptions)
               ?? new SchemaManagementConfig();
    }

    /// <summary>
    /// Save the schema-management configuration to a JSON file.
    /// </summary>
    public async Task SaveConfigAsync(string configPath, SchemaManagementConfig config)
    {
        var json = JsonSerializer.Serialize(config, JsonOptions);
        await File.WriteAllTextAsync(configPath, json);
    }

    /// <summary>
    /// Initialize a default configuration file if it doesn't exist.
    /// </summary>
    public async Task<string> InitConfigAsync(string directory)
    {
        var configPath = Path.Combine(directory, "schema-config.json");
        if (File.Exists(configPath))
            return configPath;

        var config = new SchemaManagementConfig
        {
            RegistryUrl = "http://localhost:8081",
            SchemasDirectory = "Schemas",
            OutputDirectory = "Generated",
            DefaultNamespace = "SchemaManagement.Generated",
            TopicBindings = new List<TopicSchemaBinding>
            {
                new()
                {
                    TopicName = "order-events",
                    Subject = "order-events-value",
                    SchemaFile = "Schemas/order-event.schema.json",
                    Namespace = "SchemaManagement.Generated"
                }
            }
        };

        await SaveConfigAsync(configPath, config);
        return configPath;
    }

    /// <summary>
    /// Extract the schema title/name from a JSON Schema file for display purposes.
    /// </summary>
    public string GetSchemaTitle(string schemaJson)
    {
        try
        {
            using var doc = JsonDocument.Parse(schemaJson);
            if (doc.RootElement.TryGetProperty("title", out var title))
                return title.GetString() ?? "Untitled";
        }
        catch { }
        return "Untitled";
    }
}
