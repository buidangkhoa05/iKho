using System.CommandLine;
using SchemaManagement.Commands;

// ============================================================================
// Schema Management CLI
// Converts JSON Schema → .NET classes & manages Kafka topic schemas
// ============================================================================

var rootCommand = new RootCommand("Schema Management CLI — JSON Schema to .NET class generator and Kafka Schema Registry manager")
{
    GenerateCommand.Create(),
    RegisterCommand.Create(),
    ValidateCommand.Create(),
    ListCommand.Create(),
    PullCommand.Create(),
    CreateInitCommand()
};

return await rootCommand.InvokeAsync(args);

// ============================================================================
// Init command — initialize a default configuration file
// ============================================================================
static Command CreateInitCommand()
{
    var directoryOption = new Option<string>(
        aliases: new[] { "--directory", "-d" },
        description: "Directory to initialize the config in")
    { IsRequired = false };
    directoryOption.SetDefaultValue(".");

    var command = new Command("init", "Initialize a schema-management configuration file")
    {
        directoryOption
    };

    command.SetHandler(async (string directory) =>
    {
        var fileManager = new SchemaManagement.Services.SchemaFileManager();
        var configPath = await fileManager.InitConfigAsync(directory);

        Console.ForegroundColor = ConsoleColor.Green;
        Console.WriteLine($"✅ Configuration initialized: {Path.GetFullPath(configPath)}");
        Console.ResetColor();
        Console.WriteLine();
        Console.WriteLine("Edit schema-config.json to configure:");
        Console.WriteLine("  • Registry URL");
        Console.WriteLine("  • Schemas directory");
        Console.WriteLine("  • Output directory & namespace");
        Console.WriteLine("  • Topic-to-schema bindings");
    }, directoryOption);

    return command;
}
