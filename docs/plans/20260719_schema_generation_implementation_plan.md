# Implementation Plan: iKho Schema Registry and In-Repo C# Code Generation Pipeline

This document updates the schema-generation approach so it matches the current iKho monorepo structure and naming conventions.

The repository is organized under `source/`, with shared code living in `source/libs/`. To stay consistent with that layout, all schema-management assets should live in a dedicated library folder under `source/libs/`, and the generated C# contracts should be produced there as tracked source code.

This plan also keeps the strict contract-versioning rule: schemas do not support minor versions. Any structural change requires a new major version folder.

---

## Compatibility Review

The original plan does not fit the current repository conventions in a few important ways:

1. It assumes top-level `/schemas` and `/src/BuildingBlocks` folders, but the actual monorepo uses `source/` as the working root and `source/libs/` for shared assets.
2. It places generated contracts in a `BuildingBlocks/Contracts` structure that does not exist in this repository.
3. It uses a standalone root-level layout instead of a library-centric Nx monorepo layout.
4. It uses a Linux shell-first workflow (`build.sh`) even though the active development environment and repo usage should support PowerShell-first execution.
5. It uses `iKho.*` namespace examples, while the existing .NET project naming follows `Ikho*` PascalCase conventions.

---

## Phase 1: Repository and Structural Setup

### 1.1 Target Library Placement

Create a dedicated schema-management library folder under `source/libs/`.

Recommended folder:

```text
source/libs/ikho-schema-management/
```

This folder becomes the single place for:

1. Raw schema files.
2. Containerized code-generation infrastructure.
3. Generated C# contracts.
4. Supporting documentation for schema ownership and versioning.

### 1.2 Directory Architecture

The schema-management library should own both schema definitions and generated outputs.

```text
/iKho
  /docs
    /plans
      20260719_schema_generation_implementation_plan.md
  /source
    /libs
      /ikho-schema-management
        IkhoSchemaManagement.csproj
        /README.md
        /schemas
          /domains
            /warehouse
              /api
                /v1
                  StockReservedRequest.json
                /v2
                  StockReservedRequest.json
              /events
                /v1
                  InventoryReceived.avro
        /infrastructure
          Dockerfile.generator
          generate.ps1
          generate.sh
        /Generated
          /Contracts
            /Warehouse
              /Api
                /V1
                  StockReservedRequest.cs
                /V2
              /Events
                /V1
                  InventoryReceived.cs
      /ikho-shared-library
        IkhoSharedLibrary.csproj
        Program.cs
```

### 1.3 Why This Layout Fits The Repo

This structure is compatible with the current source code conventions because:

1. Shared backend artifacts live under `source/libs/`.
2. Schema-management concerns are isolated in their own library folder instead of being scattered across the repo root.
3. Generated contracts remain versioned source files inside the monorepo.
4. `IkhoSharedLibrary` can consume contracts through a standard project reference instead of owning generated files directly.

### 1.4 Strict Versioning Policy

1. No minor versions: use `v1`, `v2`, `v3`, and so on.
2. Immutability: once a major version folder is merged, it is locked.
3. Any schema change, including additive changes, must create a new major version folder.
4. Generated C# namespaces must mirror the major version folder exactly.

---

## Phase 2: Schema-Management Library Design

### 2.1 Library Responsibility

`source/libs/ikho-schema-management` should be a dedicated .NET class library that owns generated contracts and exposes them to consuming services.

Primary responsibilities:

1. Store canonical schema files.
2. Generate versioned DTO contracts as C# source.
3. Provide a stable assembly reference for backend services.
4. Centralize schema-generation tooling and documentation.

### 2.2 Consumption Model

`IkhoSharedLibrary` should reference `IkhoSchemaManagement.csproj` and consume the generated contracts from that library.

That keeps `Program.cs` and feature slices in `ikho-shared-library` focused on API behavior, while the schema-management library owns contract generation.

### 2.3 Namespace Convention

Generated namespaces should follow PascalCase and align with the .NET naming already present in the repo.

Examples:

```csharp
Ikho.SchemaManagement.Contracts.Warehouse.Api.V1
Ikho.SchemaManagement.Contracts.Warehouse.Events.V1
```

This is preferred over `iKho.Contracts.*` because it matches the repo's current .NET naming style.

---

## Phase 3: Containerized Code Generation Engine

To guarantee deterministic output across machines, run code generation inside a container, but mount the monorepo's `source/` folder so generated files are written back into `source/libs/ikho-schema-management/Generated/Contracts/`.

### 3.1 Generator Dockerfile

Store the Dockerfile here:

```text
source/libs/ikho-schema-management/infrastructure/Dockerfile.generator
```

Use a .NET SDK version aligned with the repository.

```dockerfile
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS generator
WORKDIR /workspace
RUN dotnet tool install -g Confluent.Apache.Avro.AvroGen
RUN dotnet tool install -g NJsonSchema.CodeGeneration.CLI
ENV PATH="$PATH:/root/.dotnet/tools"
```

### 3.2 Automation Scripts

Use PowerShell as the primary local script because it fits the current developer environment and works well on Windows.

Primary script location:

```text
source/libs/ikho-schema-management/infrastructure/generate.ps1
```

Optional Linux CI wrapper:

```text
source/libs/ikho-schema-management/infrastructure/generate.sh
```

### 3.3 Script Responsibilities

The generation script should:

1. Resolve paths relative to the `source/` folder.
2. Generate JSON schema DTOs into `Generated/Contracts/...`.
3. Generate Avro contracts into the matching versioned folders.
4. Fail immediately when a schema input or output path is invalid.
5. Keep generation idempotent so CI can detect drift reliably.

### 3.4 Example Generation Mapping

```powershell
# WAREHOUSE API - V1
njsonschema j2cs `
  /input:/workspace/source/libs/ikho-schema-management/schemas/domains/warehouse/api/v1/StockReservedRequest.json `
  /classname:StockReservedRequest `
  /namespace:Ikho.SchemaManagement.Contracts.Warehouse.Api.V1 `
  /generateRecords:true `
  /output:/workspace/source/libs/ikho-schema-management/Generated/Contracts/Warehouse/Api/V1/StockReservedRequest.cs

# WAREHOUSE EVENTS - V1
avrogen -s `
  /workspace/source/libs/ikho-schema-management/schemas/domains/warehouse/events/v1/InventoryReceived.avro `
  /namespace:Ikho.SchemaManagement.Contracts.Warehouse.Events.V1 `
  /output:/workspace/source/libs/ikho-schema-management/Generated/Contracts/Warehouse/Events/V1/
```

---

## Phase 4: Project Integration

### 4.1 Add A Project Reference

`source/libs/ikho-shared-library/IkhoSharedLibrary.csproj` should reference the schema-management library.

Conceptually:

```xml
<ItemGroup>
  <ProjectReference Include="..\ikho-schema-management\IkhoSchemaManagement.csproj" />
</ItemGroup>
```

### 4.2 Service Usage Pattern

Backend feature slices inside `ikho-shared-library` should consume the generated contracts through namespaces from the schema-management library.

```csharp
using Ikho.SchemaManagement.Contracts.Warehouse.Events.V1;

public sealed class ReceiveInventoryHandler
{
    public Task HandleAsync(InventoryReceived integrationEvent)
    {
        var sku = integrationEvent.Sku;
        return Task.CompletedTask;
    }
}
```

### 4.3 Boundary Rule

`ikho-shared-library` should not own raw schema files or generated DTO sources directly. It should only reference and consume them.

This keeps schema-management concerns isolated and avoids mixing API host responsibilities with contract-generation responsibilities.

---

## Phase 5: Pipeline Integration and Verification

Because generated C# files are committed to Git, CI should verify that committed outputs are exactly reproducible.

### 5.1 CI Verification Flow

Run the generation process from the `source/` folder.

```bash
# 1. Build the generator image
docker build -t ikho-schema-codegen -f libs/ikho-schema-management/infrastructure/Dockerfile.generator .

# 2. Run code generation against the checked-out source tree
docker run --rm -v $(pwd):/workspace/source ikho-schema-codegen pwsh /workspace/source/libs/ikho-schema-management/infrastructure/generate.ps1

# 3. Fail if generated contracts drifted
if [ -n "$(git status --porcelain libs/ikho-schema-management/Generated/Contracts/)" ]; then
  echo "CRITICAL ERROR: Generated contracts do not match the committed schema definitions."
  echo "Run the generation script and commit the updated generated files."
  git diff -- libs/ikho-schema-management/Generated/Contracts/
  exit 1
fi
```

### 5.2 Registry Synchronization

After merge to `main`, the CI pipeline can publish event schemas from:

```text
source/libs/ikho-schema-management/schemas/domains/*/events/*
```

This keeps the file-system registry and the external schema registry synchronized from a single source of truth.

---

## Phase 6: Version Evolution

When a warehouse contract changes:

1. Add a new schema under a new major version folder such as `schemas/domains/warehouse/events/v2/`.
2. Generate a new C# namespace such as `Ikho.SchemaManagement.Contracts.Warehouse.Events.V2`.
3. Allow `ikho-shared-library` features to support `V1` and `V2` side by side during migration.
4. Remove older versions only after all consumers have been explicitly migrated.

---

## Recommended Final Direction

To align with the current repository conventions, the implementation should move from a root-level schema registry layout to a dedicated shared library layout under `source/libs/ikho-schema-management`.

That gives the repo a cleaner ownership model:

1. `ikho-schema-management` owns schemas, generator infrastructure, and generated contracts.
2. `ikho-shared-library` consumes contracts through a normal project reference.
3. CI validates generated output for drift.
4. Versioned contracts remain explicit, immutable, and easy to audit in Git.
