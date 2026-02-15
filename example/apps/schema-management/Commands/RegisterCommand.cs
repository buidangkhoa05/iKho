using System.CommandLine;
using SchemaManagement.Services;

namespace SchemaManagement.Commands;

/// <summary>
/// CLI command: Register a JSON Schema to Confluent Schema Registry.
/// </summary>
public static class RegisterCommand
{
    public static Command Create()
    {
        var schemaOption = new Option<string>(
            aliases: new[] { "--schema", "-s" },
            description: "Path to the JSON Schema file to register")
        { IsRequired = true };

        var subjectOption = new Option<string>(
            aliases: new[] { "--subject" },
            description: "Schema Registry subject name (e.g., 'order-events-value')")
        { IsRequired = false };

        var topicOption = new Option<string>(
            aliases: new[] { "--topic", "-t" },
            description: "Kafka topic name (auto-generates subject as '{topic}-value')")
        { IsRequired = false };

        var registryOption = new Option<string>(
            aliases: new[] { "--registry-url", "-r" },
            description: "Schema Registry URL")
        { IsRequired = false };
        registryOption.SetDefaultValue("http://localhost:8081");

        var compatibilityCheckOption = new Option<bool>(
            aliases: new[] { "--check-compatibility", "-c" },
            description: "Check compatibility before registering")
        { IsRequired = false };
        compatibilityCheckOption.SetDefaultValue(true);

        var command = new Command("register", "Register a JSON Schema to Confluent Schema Registry")
        {
            schemaOption,
            subjectOption,
            topicOption,
            registryOption,
            compatibilityCheckOption
        };

        command.SetHandler(async (string schemaPath, string? subject, string? topic, string registryUrl, bool checkCompat) =>
        {
            // Determine subject name
            var resolvedSubject = ResolveSubject(subject, topic);
            if (resolvedSubject == null)
            {
                Console.ForegroundColor = ConsoleColor.Red;
                Console.WriteLine("❌ You must provide either --subject or --topic");
                Console.ResetColor();
                Environment.ExitCode = 1;
                return;
            }

            if (!File.Exists(schemaPath))
            {
                Console.ForegroundColor = ConsoleColor.Red;
                Console.WriteLine($"❌ Schema file not found: {schemaPath}");
                Console.ResetColor();
                Environment.ExitCode = 1;
                return;
            }

            var schemaJson = await File.ReadAllTextAsync(schemaPath);

            Console.WriteLine($"📤 Registering schema to: {registryUrl}");
            Console.WriteLine($"   Subject:  {resolvedSubject}");
            Console.WriteLine($"   Schema:   {Path.GetFileName(schemaPath)}");
            Console.WriteLine();

            try
            {
                using var registry = new KafkaSchemaRegistryService(registryUrl);

                // Check compatibility first if requested
                if (checkCompat)
                {
                    try
                    {
                        var isCompatible = await registry.TestCompatibilityAsync(resolvedSubject, schemaJson);
                        if (!isCompatible)
                        {
                            Console.ForegroundColor = ConsoleColor.Red;
                            Console.WriteLine("❌ Schema is NOT compatible with the existing version.");
                            Console.WriteLine("   Use --check-compatibility false to skip this check.");
                            Console.ResetColor();
                            Environment.ExitCode = 1;
                            return;
                        }
                        Console.ForegroundColor = ConsoleColor.Green;
                        Console.WriteLine("   ✅ Compatibility check passed");
                        Console.ResetColor();
                    }
                    catch
                    {
                        // Subject might not exist yet — that's fine, skip compatibility check
                        Console.ForegroundColor = ConsoleColor.DarkYellow;
                        Console.WriteLine("   ⚠ No existing schema found, skipping compatibility check");
                        Console.ResetColor();
                    }
                }

                var schemaId = await registry.RegisterSchemaAsync(resolvedSubject, schemaJson);

                Console.ForegroundColor = ConsoleColor.Green;
                Console.WriteLine($"✅ Schema registered successfully!");
                Console.ResetColor();
                Console.WriteLine($"   Schema ID: {schemaId}");
                Console.WriteLine($"   Subject:   {resolvedSubject}");
            }
            catch (Exception ex)
            {
                Console.ForegroundColor = ConsoleColor.Red;
                Console.WriteLine($"❌ Registration failed: {ex.Message}");
                Console.ResetColor();
                Environment.ExitCode = 1;
            }
        }, schemaOption, subjectOption, topicOption, registryOption, compatibilityCheckOption);

        return command;
    }

    private static string? ResolveSubject(string? subject, string? topic)
    {
        if (!string.IsNullOrWhiteSpace(subject))
            return subject;
        if (!string.IsNullOrWhiteSpace(topic))
            return KafkaSchemaRegistryService.TopicValueSubject(topic);
        return null;
    }
}
