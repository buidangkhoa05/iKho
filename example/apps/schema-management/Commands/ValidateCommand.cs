using System.CommandLine;
using SchemaManagement.Services;

namespace SchemaManagement.Commands;

/// <summary>
/// CLI command: Validate a JSON document against a JSON Schema.
/// </summary>
public static class ValidateCommand
{
    public static Command Create()
    {
        var schemaOption = new Option<string>(
            aliases: new[] { "--schema", "-s" },
            description: "Path to the JSON Schema file")
        { IsRequired = true };

        var dataOption = new Option<string>(
            aliases: new[] { "--data", "-d" },
            description: "Path to the JSON data file to validate")
        { IsRequired = true };

        var command = new Command("validate", "Validate a JSON document against a JSON Schema")
        {
            schemaOption,
            dataOption
        };

        command.SetHandler(async (string schemaPath, string dataPath) =>
        {
            Console.WriteLine($"🔍 Validating data against schema...");
            Console.WriteLine($"   Schema: {schemaPath}");
            Console.WriteLine($"   Data:   {dataPath}");
            Console.WriteLine();

            var generator = new JsonSchemaCodeGenerator();
            var result = await generator.ValidateAsync(schemaPath, dataPath);

            if (result.IsValid)
            {
                Console.ForegroundColor = ConsoleColor.Green;
                Console.WriteLine("✅ Validation PASSED — data conforms to the schema.");
                Console.ResetColor();
            }
            else
            {
                Console.ForegroundColor = ConsoleColor.Red;
                Console.WriteLine($"❌ Validation FAILED — {result.Errors.Count} error(s) found:");
                Console.ResetColor();

                foreach (var error in result.Errors)
                {
                    Console.ForegroundColor = ConsoleColor.Yellow;
                    Console.WriteLine($"   • {error}");
                    Console.ResetColor();
                }

                Environment.ExitCode = 1;
            }
        }, schemaOption, dataOption);

        return command;
    }
}
