# Schema Management CLI

A .NET 10 command-line tool that **converts JSON Schema to C# classes** and **manages Kafka topic schemas** via [Confluent Schema Registry](https://docs.confluent.io/platform/current/schema-registry/index.html).

---

## 🚀 Quick Start

### Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| .NET SDK | 10.0+ | [dotnet.microsoft.com](https://dotnet.microsoft.com/download) |
| Schema Registry | *(optional)* | [Confluent Platform](https://docs.confluent.io/platform/current/installation/overview.html) or Docker |

### Build

```powershell
dotnet build
```

### Run

```powershell
# Show help
dotnet run -- --help

# Generate C# class from a JSON Schema
dotnet run -- generate --input Schemas/order-event.schema.json --output Generated

# Generate all schemas in a directory
dotnet run -- generate --input Schemas --output Generated --all

# Validate a JSON file against a schema
dotnet run -- validate --schema Schemas/order-event.schema.json --data sample-data.json
```

---

## 📋 Commands

### `generate` — JSON Schema → C# Classes

Convert JSON Schema files into strongly-typed C# classes using [NJsonSchema](https://github.com/RicoSuter/NJsonSchema).

```powershell
# Single file
dotnet run -- generate -i Schemas/order-event.schema.json -o Generated -n MyApp.Models

# All schemas in a directory
dotnet run -- generate -i Schemas -o Generated -n MyApp.Models --all

# Generate records instead of POCOs
dotnet run -- generate -i Schemas/order-event.schema.json -o Generated --records
```

| Option | Alias | Description | Default |
|--------|-------|-------------|---------|
| `--input` | `-i` | Schema file or directory path | *(required)* |
| `--output` | `-o` | Output directory for `.g.cs` files | `Generated` |
| `--namespace` | `-n` | C# namespace for generated classes | `SchemaManagement.Generated` |
| `--records` | `-r` | Generate `record` types instead of `class` | `false` |
| `--all` | `-a` | Process all `.schema.json` files in the directory | `false` |

**Output**: Generated files are named `{SchemaTitle}.g.cs` (e.g., `OrderEvent.g.cs`).

---

### `register` — Push Schema to Kafka Schema Registry

Register a JSON Schema as the value schema for a Kafka topic in Confluent Schema Registry.

```powershell
# Register by topic name (auto-generates subject: "order-events-value")
dotnet run -- register -s Schemas/order-event.schema.json --topic order-events

# Register with an explicit subject name
dotnet run -- register -s Schemas/order-event.schema.json --subject my-custom-subject

# Use a different registry URL
dotnet run -- register -s Schemas/order-event.schema.json --topic order-events -r http://registry:8081

# Skip compatibility check
dotnet run -- register -s Schemas/order-event.schema.json --topic order-events -c false
```

| Option | Alias | Description | Default |
|--------|-------|-------------|---------|
| `--schema` | `-s` | Path to the JSON Schema file | *(required)* |
| `--topic` | `-t` | Kafka topic name (generates `{topic}-value` subject) | — |
| `--subject` | — | Explicit Schema Registry subject name | — |
| `--registry-url` | `-r` | Schema Registry URL | `http://localhost:8081` |
| `--check-compatibility` | `-c` | Check compatibility before registering | `true` |

> **Note**: You must specify either `--topic` or `--subject` (not both).

---

### `validate` — Validate JSON Against Schema

Validate a JSON data file against a JSON Schema to check conformance.

```powershell
dotnet run -- validate -s Schemas/order-event.schema.json -d test-data/valid-order.json
```

| Option | Alias | Description |
|--------|-------|-------------|
| `--schema` | `-s` | Path to the JSON Schema file |
| `--data` | `-d` | Path to the JSON data file to validate |

**Output**: Reports validation errors with JSON paths and error descriptions.

---

### `list` — List Registered Schemas

List all subjects registered in the Schema Registry.

```powershell
# Simple list
dotnet run -- list -r http://localhost:8081

# Verbose — shows schema ID, versions, and preview
dotnet run -- list -r http://localhost:8081 --verbose
```

| Option | Alias | Description | Default |
|--------|-------|-------------|---------|
| `--registry-url` | `-r` | Schema Registry URL | `http://localhost:8081` |
| `--verbose` | `-v` | Show detailed info (ID, versions, schema preview) | `false` |

---

### `pull` — Download Schema from Registry

Pull a registered schema and save it as a local `.schema.json` file.

```powershell
# Pull latest version
dotnet run -- pull -s order-events-value -o Schemas/order-event-from-registry.schema.json

# Pull a specific version
dotnet run -- pull -s order-events-value -v 2 -o Schemas/order-event-v2.schema.json
```

| Option | Alias | Description | Default |
|--------|-------|-------------|---------|
| `--subject` | `-s` | Schema Registry subject name | *(required)* |
| `--output` | `-o` | Output file path | `{subject}.schema.json` |
| `--version` | `-v` | Specific version to pull | latest |
| `--registry-url` | `-r` | Schema Registry URL | `http://localhost:8081` |

---

### `init` — Initialize Configuration

Create a default `schema-config.json` configuration file.

```powershell
dotnet run -- init
dotnet run -- init -d ./my-project
```

---

## ⚙️ Configuration

Run `dotnet run -- init` to generate a `schema-config.json` file:

```json
{
  "registryUrl": "http://localhost:8081",
  "schemasDirectory": "Schemas",
  "outputDirectory": "Generated",
  "defaultNamespace": "SchemaManagement.Generated",
  "topicBindings": [
    {
      "topicName": "order-events",
      "subject": "order-events-value",
      "schemaFile": "Schemas/order-event.schema.json",
      "namespace": "SchemaManagement.Generated",
      "schemaType": "JSON"
    }
  ]
}
```

### Configuration Fields

| Field | Description |
|-------|-------------|
| `registryUrl` | Confluent Schema Registry URL |
| `schemasDirectory` | Directory containing `.schema.json` files |
| `outputDirectory` | Output directory for generated C# classes |
| `defaultNamespace` | Default C# namespace for generated code |
| `topicBindings` | Array of Kafka topic → schema file mappings |

---

## 📁 Project Structure

```
apps/schema-management/
├── Program.cs                            # CLI entry point
├── schema-management.csproj              # Project file
├── BUILD.bazel                           # Bazel build target
│
├── Commands/
│   ├── GenerateCommand.cs                # generate command
│   ├── RegisterCommand.cs                # register command
│   ├── ValidateCommand.cs                # validate command
│   ├── ListCommand.cs                    # list command
│   └── PullCommand.cs                    # pull command
│
├── Services/
│   ├── JsonSchemaCodeGenerator.cs        # JSON Schema → C# code generation
│   ├── KafkaSchemaRegistryService.cs     # Schema Registry client wrapper
│   └── SchemaFileManager.cs             # Local file management
│
├── Models/
│   └── SchemaMetadata.cs                 # Data models & records
│
├── Schemas/                              # Example JSON Schema files
│   ├── order-event.schema.json
│   ├── user-activity.schema.json
│   └── payment-processed.schema.json
│
└── Generated/                            # Output for generated .cs files
```

---

## 🐳 Schema Registry with Docker

To test registry commands locally, spin up a Schema Registry with Docker Compose:

```yaml
# docker-compose.yml
version: "3.8"
services:
  zookeeper:
    image: confluentinc/cp-zookeeper:7.5.0
    environment:
      ZOOKEEPER_CLIENT_PORT: 2181

  kafka:
    image: confluentinc/cp-kafka:7.5.0
    depends_on:
      - zookeeper
    ports:
      - "9092:9092"
    environment:
      KAFKA_BROKER_ID: 1
      KAFKA_ZOOKEEPER_CONNECT: zookeeper:2181
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://localhost:9092
      KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: 1

  schema-registry:
    image: confluentinc/cp-schema-registry:7.5.0
    depends_on:
      - kafka
    ports:
      - "8081:8081"
    environment:
      SCHEMA_REGISTRY_HOST_NAME: schema-registry
      SCHEMA_REGISTRY_KAFKASTORE_BOOTSTRAP_SERVERS: kafka:9092
      SCHEMA_REGISTRY_LISTENERS: http://0.0.0.0:8081
```

```powershell
docker compose up -d

# Then register schemas
dotnet run -- register -s Schemas/order-event.schema.json --topic order-events
dotnet run -- register -s Schemas/user-activity.schema.json --topic user-activity
dotnet run -- register -s Schemas/payment-processed.schema.json --topic payment-processed

# List registered schemas
dotnet run -- list --verbose
```

---

## 🔄 Typical Workflow

1. **Define** your Kafka message schema as a `.schema.json` file in `Schemas/`
2. **Generate** C# classes from the schema:
   ```powershell
   dotnet run -- generate -i Schemas/order-event.schema.json -o Generated -n MyApp.Kafka.Models
   ```
3. **Register** the schema in Schema Registry for your Kafka topic:
   ```powershell
   dotnet run -- register -s Schemas/order-event.schema.json --topic order-events
   ```
4. **Validate** sample messages against the schema:
   ```powershell
   dotnet run -- validate -s Schemas/order-event.schema.json -d test-data/sample-order.json
   ```
5. **Pull** schemas from registry to keep local files in sync:
   ```powershell
   dotnet run -- pull -s order-events-value -o Schemas/order-event.schema.json
   ```

---

## 📦 Dependencies

All package versions are managed centrally via `Directory.Packages.props`:

| Package | Purpose |
|---------|---------|
| [NJsonSchema](https://github.com/RicoSuter/NJsonSchema) | JSON Schema parsing |
| [NJsonSchema.CodeGeneration.CSharp](https://github.com/RicoSuter/NJsonSchema) | C# code generation |
| [Confluent.SchemaRegistry](https://github.com/confluentinc/confluent-kafka-dotnet) | Kafka Schema Registry client |
| [System.CommandLine](https://github.com/dotnet/command-line-api) | CLI framework |
| [System.Text.Json](https://learn.microsoft.com/en-us/dotnet/api/system.text.json) | JSON serialization |
