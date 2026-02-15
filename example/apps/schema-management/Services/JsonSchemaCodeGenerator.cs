using NJsonSchema;
using NJsonSchema.CodeGeneration.CSharp;
using SchemaManagement.Models;

namespace SchemaManagement.Services;

/// <summary>
/// Generates C# classes from JSON Schema files using NJsonSchema.
/// </summary>
public class JsonSchemaCodeGenerator
{
    /// <summary>
    /// Generate a C# class from a JSON Schema file.
    /// </summary>
    /// <param name="schemaPath">Path to the .schema.json file</param>
    /// <param name="outputDirectory">Directory to write the generated .cs file</param>
    /// <param name="namespaceName">C# namespace for the generated class</param>
    /// <param name="generateRecords">If true, generates record types instead of classes</param>
    /// <returns>A GenerationResult with details about the operation</returns>
    public async Task<GenerationResult> GenerateFromFileAsync(
        string schemaPath,
        string outputDirectory,
        string namespaceName = "SchemaManagement.Generated",
        bool generateRecords = false)
    {
        try
        {
            if (!File.Exists(schemaPath))
            {
                return new GenerationResult
                {
                    Success = false,
                    ErrorMessage = $"Schema file not found: {schemaPath}"
                };
            }

            var schemaJson = await File.ReadAllTextAsync(schemaPath);
            return await GenerateFromStringAsync(schemaJson, outputDirectory, namespaceName, generateRecords);
        }
        catch (Exception ex)
        {
            return new GenerationResult
            {
                Success = false,
                ErrorMessage = $"Failed to generate code: {ex.Message}"
            };
        }
    }

    /// <summary>
    /// Generate a C# class from a JSON Schema string.
    /// </summary>
    public async Task<GenerationResult> GenerateFromStringAsync(
        string schemaJson,
        string outputDirectory,
        string namespaceName = "SchemaManagement.Generated",
        bool generateRecords = false)
    {
        try
        {
            var schema = await JsonSchema.FromJsonAsync(schemaJson);

            var settings = new CSharpGeneratorSettings
            {
                Namespace = namespaceName,
                GenerateDataAnnotations = true,
                GenerateJsonMethods = true,
                ClassStyle = generateRecords ? CSharpClassStyle.Record : CSharpClassStyle.Poco,
                JsonLibrary = CSharpJsonLibrary.SystemTextJson,
                GenerateNullableReferenceTypes = true,
            };

            var generator = new CSharpGenerator(schema, settings);
            var code = generator.GenerateFile();

            // Determine class name from schema title or fallback
            var className = schema.Title ?? "GeneratedSchema";
            className = SanitizeClassName(className);

            // Ensure output directory exists
            Directory.CreateDirectory(outputDirectory);

            var outputPath = Path.Combine(outputDirectory, $"{className}.g.cs");
            await File.WriteAllTextAsync(outputPath, code);

            var lineCount = code.Split('\n').Length;

            return new GenerationResult
            {
                Success = true,
                OutputPath = outputPath,
                ClassName = className,
                Namespace = namespaceName,
                LinesGenerated = lineCount
            };
        }
        catch (Exception ex)
        {
            return new GenerationResult
            {
                Success = false,
                ErrorMessage = $"Code generation failed: {ex.Message}"
            };
        }
    }

    /// <summary>
    /// Validate a JSON document against a JSON Schema.
    /// </summary>
    public async Task<ValidationResult> ValidateAsync(string schemaPath, string dataPath)
    {
        try
        {
            var schemaJson = await File.ReadAllTextAsync(schemaPath);
            var dataJson = await File.ReadAllTextAsync(dataPath);

            var schema = await JsonSchema.FromJsonAsync(schemaJson);
            var errors = schema.Validate(dataJson);

            return new ValidationResult
            {
                IsValid = errors.Count == 0,
                Errors = errors.Select(e => $"[{e.Path}] {e.Kind}: {e.Property}").ToList(),
                SchemaSource = schemaPath,
                DataSource = dataPath
            };
        }
        catch (Exception ex)
        {
            return new ValidationResult
            {
                IsValid = false,
                Errors = new List<string> { $"Validation error: {ex.Message}" },
                SchemaSource = schemaPath,
                DataSource = dataPath
            };
        }
    }

    /// <summary>
    /// Validate a JSON string against a JSON Schema string.
    /// </summary>
    public async Task<ValidationResult> ValidateFromStringsAsync(string schemaJson, string dataJson)
    {
        try
        {
            var schema = await JsonSchema.FromJsonAsync(schemaJson);
            var errors = schema.Validate(dataJson);

            return new ValidationResult
            {
                IsValid = errors.Count == 0,
                Errors = errors.Select(e => $"[{e.Path}] {e.Kind}: {e.Property}").ToList(),
                SchemaSource = "(inline)",
                DataSource = "(inline)"
            };
        }
        catch (Exception ex)
        {
            return new ValidationResult
            {
                IsValid = false,
                Errors = new List<string> { $"Validation error: {ex.Message}" },
                SchemaSource = "(inline)",
                DataSource = "(inline)"
            };
        }
    }

    private static string SanitizeClassName(string name)
    {
        // Remove non-alphanumeric characters, PascalCase
        var sanitized = new string(name
            .Replace("-", " ")
            .Replace("_", " ")
            .Split(' ', StringSplitOptions.RemoveEmptyEntries)
            .Select(word => char.ToUpper(word[0]) + word[1..])
            .SelectMany(c => c)
            .Where(c => char.IsLetterOrDigit(c))
            .ToArray());

        return string.IsNullOrEmpty(sanitized) ? "GeneratedSchema" : sanitized;
    }
}
