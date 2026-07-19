# Ikho Schema Management

This library owns schema definitions, code-generation infrastructure, and tracked generated C# contracts for the iKho monorepo.

## Layout

- `schemas/`: canonical JSON Schema and Avro inputs.
- `infrastructure/`: generator scripts and container image definition.
- `Generated/Contracts/`: generated C# output committed to Git.

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

The script is self-contained for the current schema set and can also be run through the containerized image described in `infrastructure/Dockerfile.generator`.
