# iKho Monorepo

Nx monorepo using pnpm with:

- Angular app: `ikho-ui`
- Angular buildable library: `ikho-shared-ui` (`@ikho/shared-ui`)
- .NET Minimal API: `IkhoSharedLibrary`
- .NET schema management library: `IkhoSchemaManagement`

## Prerequisites

- Node.js 24+
- pnpm 10+
- .NET SDK 10+

## Install

From the `source` folder:

```sh
pnpm install
```

If pnpm asks to approve build scripts:

```sh
pnpm approve-builds
```

## Run The Project

Open two terminals in the `source` folder.

1. Start the .NET API:

```sh
pnpm nx serve IkhoSharedLibrary
```

The API runs on `http://localhost:5143`.

1. Start the Angular app:

```sh
pnpm nx serve ikho-ui
```

The UI runs on `http://localhost:4200`.

### API Proxy

Angular dev server proxies `/api/*` to `http://localhost:5143`, so frontend calls can use `/api/...` paths directly.

## Run everything with Docker

`docker-compose.yml` builds and runs the whole workspace - postgres, kafka, every .NET
app/lib, and the Angular UI - in containers, as an alternative to running each `pnpm nx serve`
individually:

```sh
docker compose up --build
```

UI at `http://localhost:4200`, API gateway at `http://localhost:5080`. `docker-compose.platform.yml`
still exists separately for infra-only local dev (just kafka + postgres).

## Common Commands

```sh
pnpm nx build ikho-ui
pnpm nx build ikho-shared-ui
pnpm nx build IkhoSchemaManagement
pnpm nx build IkhoSharedLibrary
pnpm nx test ikho-ui
pnpm nx run-many -t build
pnpm nx docker-build IkhoSharedLibrary
pnpm nx run-many -t docker-build
pnpm nx graph
pnpm nx show projects
pnpm nx show project IkhoSharedLibrary
```

## Schema Generation

From the `source` folder, run:

```powershell
pwsh ./libs/ikho-schema-management/infrastructure/generate.ps1
```

Or run it through Nx:

```powershell
pnpm nx run IkhoSchemaManagement:generate
pnpm nx run IkhoSchemaManagement:generate-container
```

Generated contracts are committed under `libs/ikho-schema-management/Generated/Contracts/`.
