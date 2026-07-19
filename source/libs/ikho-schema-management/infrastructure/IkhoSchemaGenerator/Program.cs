using System.CodeDom.Compiler;
using System.Text;
using System.Text.RegularExpressions;
using Avro;
using Microsoft.CSharp;
using NJsonSchema;
using NJsonSchema.CodeGeneration.CSharp;

if (args.Length != 1)
{
    Console.Error.WriteLine("Expected one argument: <library-root>.");
    return 1;
}

var libraryRoot = Path.GetFullPath(args[0]);

var generationPlan = SchemaGenerationPlanDiscovery.Discover(libraryRoot);

var generator = new SchemaContractGenerator();
await generator.GenerateAsync(generationPlan, CancellationToken.None);
return 0;

internal sealed record SchemaGenerationPlan(
    IReadOnlyList<JsonSchemaContract> JsonSchemas,
    IReadOnlyList<AvroSchemaContract> AvroSchemas);

internal sealed record JsonSchemaContract(
    string SchemaPath,
    string OutputPath,
    string Namespace);

internal sealed record AvroSchemaContract(
    string SchemaPath,
    string OutputDirectory);

/// <summary>
/// Discovers schema-backed contracts by convention from the <c>schemas/domains/{domain}/{api|events}/{version}</c>
/// folder layout, removing the need to manually register each new schema file.
/// </summary>
internal static class SchemaGenerationPlanDiscovery
{
    private const string RootNamespace = "Ikho.Contracts";
    private static readonly Regex VersionFolderPattern = new(@"^v(\d+)$", RegexOptions.IgnoreCase | RegexOptions.Compiled);

    /// <summary>
    /// Walks <c>schemas/domains</c> under the given library root and builds a <see cref="SchemaGenerationPlan"/>
    /// containing every recognized JSON Schema (<c>api</c>) and Avro (<c>events</c>) file found.
    /// </summary>
    public static SchemaGenerationPlan Discover(string libraryRoot)
    {
        var domainsRoot = Path.Combine(libraryRoot, "schemas", "domains");
        var jsonSchemas = new List<JsonSchemaContract>();
        var avroSchemas = new List<AvroSchemaContract>();

        if (!Directory.Exists(domainsRoot))
        {
            return new SchemaGenerationPlan(jsonSchemas, avroSchemas);
        }

        foreach (var domainDirectory in Directory.EnumerateDirectories(domainsRoot).OrderBy(path => path, StringComparer.Ordinal))
        {
            var domainName = ToPascalCase(Path.GetFileName(domainDirectory));

            DiscoverContractType(libraryRoot, domainDirectory, "api", domainName, jsonSchemas, avroSchemas);
            DiscoverContractType(libraryRoot, domainDirectory, "events", domainName, jsonSchemas, avroSchemas);
        }

        return new SchemaGenerationPlan(jsonSchemas, avroSchemas);
    }

    /// <summary>
    /// Discovers versioned schema files under a single <c>api</c> or <c>events</c> folder within a domain.
    /// </summary>
    private static void DiscoverContractType(
        string libraryRoot,
        string domainDirectory,
        string typeFolderName,
        string domainName,
        List<JsonSchemaContract> jsonSchemas,
        List<AvroSchemaContract> avroSchemas)
    {
        var typeDirectory = Path.Combine(domainDirectory, typeFolderName);

        if (!Directory.Exists(typeDirectory))
        {
            return;
        }

        var typeName = ToPascalCase(typeFolderName);

        foreach (var versionDirectory in Directory.EnumerateDirectories(typeDirectory).OrderBy(path => path, StringComparer.Ordinal))
        {
            var versionFolderName = Path.GetFileName(versionDirectory);
            var versionMatch = VersionFolderPattern.Match(versionFolderName);

            if (!versionMatch.Success)
            {
                continue;
            }

            var versionName = $"V{versionMatch.Groups[1].Value}";
            var @namespace = $"{RootNamespace}.{domainName}.{typeName}.{versionName}";

            foreach (var schemaPath in Directory.EnumerateFiles(versionDirectory, "*.json").OrderBy(path => path, StringComparer.Ordinal))
            {
                var fileName = Path.GetFileNameWithoutExtension(schemaPath);
                var outputPath = Path.Combine(libraryRoot, "Generated", "Contracts", domainName, typeName, versionName, $"{fileName}.cs");

                jsonSchemas.Add(new JsonSchemaContract(
                    SchemaPath: schemaPath,
                    OutputPath: outputPath,
                    Namespace: @namespace));
            }

            foreach (var schemaPath in Directory.EnumerateFiles(versionDirectory, "*.avro").OrderBy(path => path, StringComparer.Ordinal))
            {
                var outputDirectory = Path.Combine(libraryRoot, "Generated", "Contracts", domainName, typeName, versionName);

                avroSchemas.Add(new AvroSchemaContract(
                    SchemaPath: schemaPath,
                    OutputDirectory: outputDirectory));
            }
        }
    }

    /// <summary>
    /// Converts a lowercase or kebab-case folder name (e.g. <c>categories</c>, <c>purchase-orders</c>) into
    /// PascalCase (e.g. <c>Categories</c>, <c>PurchaseOrders</c>) for use in namespaces and output folder names.
    /// </summary>
    private static string ToPascalCase(string segment)
    {
        var parts = segment.Split('-', StringSplitOptions.RemoveEmptyEntries);
        return string.Concat(parts.Select(part => char.ToUpperInvariant(part[0]) + part[1..]));
    }
}

internal sealed class SchemaContractGenerator
{
    /// <summary>
    /// Generates all configured schema-backed C# contracts.
    /// </summary>
    public async Task GenerateAsync(SchemaGenerationPlan generationPlan, CancellationToken cancellationToken)
    {
        foreach (var jsonSchema in generationPlan.JsonSchemas)
        {
            await GenerateJsonSchemaContractAsync(jsonSchema, cancellationToken);
        }

        foreach (var avroSchema in generationPlan.AvroSchemas)
        {
            GenerateAvroContract(avroSchema);
        }
    }

    /// <summary>
    /// Generates a C# contract from a JSON Schema file using NJsonSchema.
    /// </summary>
    private static async Task GenerateJsonSchemaContractAsync(JsonSchemaContract jsonSchemaContract, CancellationToken cancellationToken)
    {
        EnsureParentDirectory(jsonSchemaContract.OutputPath);

        var schema = await JsonSchema.FromFileAsync(jsonSchemaContract.SchemaPath, cancellationToken).ConfigureAwait(false);
        var generatorSettings = new CSharpGeneratorSettings
        {
            Namespace = jsonSchemaContract.Namespace,
            ClassStyle = CSharpClassStyle.Record,
            JsonLibrary = CSharpJsonLibrary.SystemTextJson,
            GenerateNullableReferenceTypes = true
        };

        var generator = new CSharpGenerator(schema, generatorSettings);
        var code = NormalizeLineEndings(generator.GenerateFile());
        await File.WriteAllTextAsync(jsonSchemaContract.OutputPath, code, new UTF8Encoding(encoderShouldEmitUTF8Identifier: false), cancellationToken).ConfigureAwait(false);
    }

    /// <summary>
    /// Generates a C# contract from an Avro schema using Apache.Avro code generation.
    /// </summary>
    private static void GenerateAvroContract(AvroSchemaContract avroSchemaContract)
    {
        Directory.CreateDirectory(avroSchemaContract.OutputDirectory);

        var schemaText = File.ReadAllText(avroSchemaContract.SchemaPath);
        var schema = Schema.Parse(schemaText);
        var codeGenerator = new CodeGen();
        codeGenerator.AddSchema(schema);
        codeGenerator.GenerateCode();

        using var provider = new CSharpCodeProvider();
        using var writer = new StringWriter();

        provider.GenerateCodeFromCompileUnit(codeGenerator.CompileUnit, writer, new CodeGeneratorOptions());

        var recordName = Path.GetFileNameWithoutExtension(avroSchemaContract.SchemaPath);
        var outputPath = Path.Combine(avroSchemaContract.OutputDirectory, $"{recordName}.cs");
        var code = NormalizeLineEndings(writer.ToString());
        File.WriteAllText(outputPath, code, new UTF8Encoding(encoderShouldEmitUTF8Identifier: false));
    }

    /// <summary>
    /// Ensures the directory for a generated file exists before writing output.
    /// </summary>
    private static void EnsureParentDirectory(string outputPath)
    {
        var parentDirectory = Path.GetDirectoryName(outputPath);

        if (string.IsNullOrWhiteSpace(parentDirectory))
        {
            throw new InvalidOperationException($"Could not resolve parent directory for '{outputPath}'.");
        }

        Directory.CreateDirectory(parentDirectory);
    }

    /// <summary>
    /// Normalizes generated code to CRLF line endings for consistency in the repository.
    /// </summary>
    private static string NormalizeLineEndings(string source)
    {
        return source.Replace("\r\n", "\n", StringComparison.Ordinal).Replace("\n", "\r\n", StringComparison.Ordinal);
    }
}