using System.CommandLine;
using SchemaManagement.Services;

namespace SchemaManagement.Commands;

/// <summary>
/// CLI command: List all subjects from the Schema Registry.
/// </summary>
public static class ListCommand
{
    public static Command Create()
    {
        var registryOption = new Option<string>(
            aliases: new[] { "--registry-url", "-r" },
            description: "Schema Registry URL")
        { IsRequired = false };
        registryOption.SetDefaultValue("http://localhost:8081");

        var verboseOption = new Option<bool>(
            aliases: new[] { "--verbose", "-v" },
            description: "Show detailed schema info for each subject")
        { IsRequired = false };
        verboseOption.SetDefaultValue(false);

        var command = new Command("list", "List all subjects registered in the Schema Registry")
        {
            registryOption,
            verboseOption
        };

        command.SetHandler(async (string registryUrl, bool verbose) =>
        {
            Console.WriteLine($"📋 Listing schemas from: {registryUrl}");
            Console.WriteLine();

            try
            {
                using var registry = new KafkaSchemaRegistryService(registryUrl);
                var subjects = await registry.ListSubjectsAsync();

                if (subjects.Count == 0)
                {
                    Console.ForegroundColor = ConsoleColor.Yellow;
                    Console.WriteLine("   No subjects found in the registry.");
                    Console.ResetColor();
                    return;
                }

                Console.WriteLine($"   Found {subjects.Count} subject(s):");
                Console.WriteLine();

                foreach (var subject in subjects)
                {
                    if (verbose)
                    {
                        try
                        {
                            var metadata = await registry.GetLatestSchemaAsync(subject);
                            var versions = await registry.GetVersionsAsync(subject);

                            Console.ForegroundColor = ConsoleColor.Cyan;
                            Console.Write($"   📌 {subject}");
                            Console.ResetColor();
                            Console.WriteLine($"  (ID: {metadata.Id}, Versions: {string.Join(", ", versions)}, Type: {metadata.SchemaType})");

                            // Show a truncated schema preview
                            var preview = metadata.Schema.Length > 120
                                ? metadata.Schema[..120] + "..."
                                : metadata.Schema;
                            Console.ForegroundColor = ConsoleColor.DarkGray;
                            Console.WriteLine($"      {preview}");
                            Console.ResetColor();
                            Console.WriteLine();
                        }
                        catch (Exception ex)
                        {
                            Console.ForegroundColor = ConsoleColor.Red;
                            Console.WriteLine($"   📌 {subject}  (error: {ex.Message})");
                            Console.ResetColor();
                        }
                    }
                    else
                    {
                        Console.WriteLine($"   • {subject}");
                    }
                }
            }
            catch (Exception ex)
            {
                Console.ForegroundColor = ConsoleColor.Red;
                Console.WriteLine($"❌ Failed to connect to registry: {ex.Message}");
                Console.ResetColor();
                Environment.ExitCode = 1;
            }
        }, registryOption, verboseOption);

        return command;
    }
}
