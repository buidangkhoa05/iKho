using System.CommandLine;
using SchemaManagement.Services;

namespace SchemaManagement.Commands;

/// <summary>
/// CLI command: Generate C# classes from JSON Schema files.
/// </summary>
public static class GenerateCommand
{
    public static Command Create()
    {
        var inputOption = new Option<string>(
            aliases: new[] { "--input", "-i" },
            description: "Path to a JSON Schema file (.schema.json)")
        { IsRequired = true };

        var outputOption = new Option<string>(
            aliases: new[] { "--output", "-o" },
            description: "Output directory for generated C# files")
        { IsRequired = false };
        outputOption.SetDefaultValue("Generated");

        var namespaceOption = new Option<string>(
            aliases: new[] { "--namespace", "-n" },
            description: "C# namespace for generated classes")
        { IsRequired = false };
        namespaceOption.SetDefaultValue("SchemaManagement.Generated");

        var recordsOption = new Option<bool>(
            aliases: new[] { "--records", "-r" },
            description: "Generate C# record types instead of classes")
        { IsRequired = false };
        recordsOption.SetDefaultValue(false);

        var allOption = new Option<bool>(
            aliases: new[] { "--all", "-a" },
            description: "Generate classes for all schema files in the input directory")
        { IsRequired = false };
        allOption.SetDefaultValue(false);

        var command = new Command("generate", "Generate C# classes from JSON Schema files")
        {
            inputOption,
            outputOption,
            namespaceOption,
            recordsOption,
            allOption
        };

        command.SetHandler(async (string input, string output, string ns, bool records, bool all) =>
        {
            var generator = new JsonSchemaCodeGenerator();
            var fileManager = new SchemaFileManager();

            if (all)
            {
                // Generate from all schema files in the directory
                var schemaFiles = fileManager.DiscoverSchemas(input);
                if (schemaFiles.Count == 0)
                {
                    Console.ForegroundColor = ConsoleColor.Yellow;
                    Console.WriteLine($"⚠ No schema files found in: {input}");
                    Console.ResetColor();
                    return;
                }

                Console.WriteLine($"📂 Found {schemaFiles.Count} schema file(s) in: {input}");
                Console.WriteLine();

                var successCount = 0;
                foreach (var schemaFile in schemaFiles)
                {
                    var result = await generator.GenerateFromFileAsync(schemaFile, output, ns, records);
                    if (result.Success)
                    {
                        Console.ForegroundColor = ConsoleColor.Green;
                        Console.WriteLine($"  ✅ {Path.GetFileName(schemaFile)} → {result.ClassName}.g.cs ({result.LinesGenerated} lines)");
                        Console.ResetColor();
                        successCount++;
                    }
                    else
                    {
                        Console.ForegroundColor = ConsoleColor.Red;
                        Console.WriteLine($"  ❌ {Path.GetFileName(schemaFile)}: {result.ErrorMessage}");
                        Console.ResetColor();
                    }
                }

                Console.WriteLine();
                Console.WriteLine($"Generated {successCount}/{schemaFiles.Count} classes in: {Path.GetFullPath(output)}");
            }
            else
            {
                // Generate from a single file
                Console.WriteLine($"🔄 Generating C# class from: {input}");
                var result = await generator.GenerateFromFileAsync(input, output, ns, records);

                if (result.Success)
                {
                    Console.ForegroundColor = ConsoleColor.Green;
                    Console.WriteLine($"✅ Generated: {result.OutputPath}");
                    Console.ResetColor();
                    Console.WriteLine($"   Class:     {result.Namespace}.{result.ClassName}");
                    Console.WriteLine($"   Lines:     {result.LinesGenerated}");
                    Console.WriteLine($"   Style:     {(records ? "record" : "POCO")}");
                }
                else
                {
                    Console.ForegroundColor = ConsoleColor.Red;
                    Console.WriteLine($"❌ {result.ErrorMessage}");
                    Console.ResetColor();
                    Environment.ExitCode = 1;
                }
            }
        }, inputOption, outputOption, namespaceOption, recordsOption, allOption);

        return command;
    }
}
