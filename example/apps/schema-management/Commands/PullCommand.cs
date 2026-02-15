using System.CommandLine;
using SchemaManagement.Services;

namespace SchemaManagement.Commands;

/// <summary>
/// CLI command: Pull a schema from the Schema Registry and save locally.
/// </summary>
public static class PullCommand
{
    public static Command Create()
    {
        var subjectOption = new Option<string>(
            aliases: new[] { "--subject", "-s" },
            description: "Schema Registry subject name to pull")
        { IsRequired = true };

        var outputOption = new Option<string>(
            aliases: new[] { "--output", "-o" },
            description: "Output file path to save the schema")
        { IsRequired = false };

        var versionOption = new Option<int?>(
            aliases: new[] { "--version", "-v" },
            description: "Specific schema version to pull (default: latest)")
        { IsRequired = false };

        var registryOption = new Option<string>(
            aliases: new[] { "--registry-url", "-r" },
            description: "Schema Registry URL")
        { IsRequired = false };
        registryOption.SetDefaultValue("http://localhost:8081");

        var command = new Command("pull", "Pull a schema from the Schema Registry and save locally")
        {
            subjectOption,
            outputOption,
            versionOption,
            registryOption
        };

        command.SetHandler(async (string subject, string? output, int? version, string registryUrl) =>
        {
            Console.WriteLine($"📥 Pulling schema from: {registryUrl}");
            Console.WriteLine($"   Subject: {subject}");
            if (version.HasValue)
                Console.WriteLine($"   Version: {version.Value}");
            else
                Console.WriteLine($"   Version: latest");
            Console.WriteLine();

            try
            {
                using var registry = new KafkaSchemaRegistryService(registryUrl);
                var fileManager = new SchemaFileManager();

                Models.SchemaMetadata metadata;
                if (version.HasValue)
                {
                    metadata = await registry.GetSchemaAsync(subject, version.Value);
                }
                else
                {
                    metadata = await registry.GetLatestSchemaAsync(subject);
                }

                // Determine output path
                var outputPath = output ?? $"{subject}.schema.json";

                await fileManager.WriteSchemaAsync(outputPath, metadata.Schema);

                Console.ForegroundColor = ConsoleColor.Green;
                Console.WriteLine($"✅ Schema saved to: {Path.GetFullPath(outputPath)}");
                Console.ResetColor();
                Console.WriteLine($"   Subject:   {metadata.Subject}");
                Console.WriteLine($"   Version:   {metadata.Version}");
                Console.WriteLine($"   Schema ID: {metadata.Id}");
                Console.WriteLine($"   Type:      {metadata.SchemaType}");
            }
            catch (Exception ex)
            {
                Console.ForegroundColor = ConsoleColor.Red;
                Console.WriteLine($"❌ Failed to pull schema: {ex.Message}");
                Console.ResetColor();
                Environment.ExitCode = 1;
            }
        }, subjectOption, outputOption, versionOption, registryOption);

        return command;
    }
}
