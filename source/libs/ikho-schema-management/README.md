# Ikho Schema Management

This library owns schema definitions, code-generation infrastructure, and tracked generated C# contracts for the iKho monorepo.

## Layout

- `schemas/`: canonical JSON Schema and Avro inputs.
- `infrastructure/`: generator scripts and container image definition.
- `Generated/Contracts/`: generated C# output committed to Git.

## Schema Folder Convention

The generator auto-discovers schema files by convention — there is no manual registration step. Adding a new domain, contract, or version is just a matter of dropping files into the right folder:

```text
schemas/domains/{domain}/{api|events}/v{n}/{SchemaFile}.{json|avro}
```

- `{domain}`: a lowercase (or kebab-case, e.g. `purchase-orders`) folder name. Converted to PascalCase for the generated namespace and output folder (e.g. `categories` → `Categories`, `purchase-orders` → `PurchaseOrders`).
- `{api|events}`: only these two type folders are recognized. `api` folders contain JSON Schema (`.json`) files generated with NJsonSchema; `events` folders contain Avro (`.avro`) files generated with Apache Avro codegen. Any other folder name under a domain is ignored.
- `v{n}`: a version folder matching `v` followed by digits (`v1`, `v2`, ...). Folders that don't match this pattern are skipped.
- Each `.json`/`.avro` file becomes one generated contract, written to `Generated/Contracts/{Domain}/{Api|Events}/V{n}/{SchemaFile}.cs` under the namespace `Ikho.SchemaManagement.Contracts.{Domain}.{Api|Events}.V{n}`.

Example:

```text
schemas/domains/warehouse/api/v1/StockReservedRequest.json
  → Generated/Contracts/Warehouse/Api/V1/StockReservedRequest.cs
  → namespace Ikho.SchemaManagement.Contracts.Warehouse.Api.V1
```

Domains with no schema files yet (empty `api`/`events` folders, or no folders at all) are simply skipped by the generator.

## Versioning Rules

1. Use major versions only: `v1`, `v2`, `v3`, and so on.
2. Treat committed major-version schema folders as immutable.
3. Create a new major version folder for any structural contract change.

## Local Generation

Run the PowerShell generator from the `source/` folder:

```powershell
pwsh ./libs/ikho-schema-management/infrastructure/generate.ps1
```

Or use the Nx targets from the `source/` folder:

```powershell
pnpm nx run IkhoSchemaManagement:generate
pnpm nx run IkhoSchemaManagement:generate-container
```

The generator scans `schemas/domains/**` on every run, so re-running it after adding new schema files (or new domains) picks them up automatically without any code changes. It can also be run through the containerized image described in `infrastructure/Dockerfile.generator`.
