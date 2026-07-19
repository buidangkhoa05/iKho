using System.CodeDom.Compiler;
using System.Text;
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

var generationPlan = new SchemaGenerationPlan(
    JsonSchemas:
    [
        new JsonSchemaContract(
            SchemaPath: Path.Combine(libraryRoot, "schemas", "domains", "warehouse", "api", "v1", "StockReservedRequest.json"),
            OutputPath: Path.Combine(libraryRoot, "Generated", "Contracts", "Warehouse", "Api", "V1", "StockReservedRequest.cs"),
            Namespace: "Ikho.SchemaManagement.Contracts.Warehouse.Api.V1")
    ],
    AvroSchemas:
    [
        new AvroSchemaContract(
            SchemaPath: Path.Combine(libraryRoot, "schemas", "domains", "warehouse", "events", "v1", "InventoryReceived.avro"),
            OutputDirectory: Path.Combine(libraryRoot, "Generated", "Contracts", "Warehouse", "Events", "V1"))
    ]);

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