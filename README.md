# iKho

[![.NET](https://img.shields.io/badge/.NET-10-512BD4?style=flat-square&logo=dotnet)](https://dotnet.microsoft.com/)
[![Angular](https://img.shields.io/badge/Angular-19-DD0031?style=flat-square&logo=angular)](https://angular.dev/)
[![Nx](https://img.shields.io/badge/Nx-23-143055?style=flat-square&logo=nx)](https://nx.dev/)
[![pnpm](https://img.shields.io/badge/pnpm-10-F69220?style=flat-square&logo=pnpm)](https://pnpm.io/)
[![License](https://img.shields.io/badge/License-MIT-yellow?style=flat-square)](LICENSE)

> A warehouse and inventory management platform built on microservices, featuring a capability-based domain model and a shared API gateway.

[Overview](#overview) • [Architecture](#architecture) • [Tech Stack](#tech-stack) • [Prerequisites](#prerequisites) • [Getting Started](#getting-started) • [Project Structure](#project-structure) • [Common Commands](#common-commands)

---

## Overview

iKho is a full-stack warehouse management system built to handle the full operational lifecycle of a warehouse — from physical structure and product catalogues to inbound receiving, outbound fulfillment, inventory tracking, and billing.

The system is designed as a capability-based microservices platform with a vertical-slice architecture applied consistently across every service. Each service owns its own database and communicates through well-defined API contracts and versioned event schemas.

This repository is maintained by [@buidangkhoa05](https://github.com/buidangkhoa05).

## Architecture

iKho follows a C4-modelled layered approach. The complete architecture reference lives in [docs/architecture/](./docs/architecture/).

```
Browser → ikho-ui (Angular SPA)
            ↓ /api/* (dev proxy)
       Ikho.ApiGateway (YARP)
            ↓ route-matched forwarding
    ┌───────────────────────────────────┐
    │  Ikho.WarehouseOrganization :5151 │
    │  Ikho.WarehouseCatalog      :5152 │
    │  Ikho.WarehousePartner      :5153 │
    │  Ikho.WarehouseInventory    :5154 │
    │  Ikho.WarehouseInbound      :5155 │
    │  Ikho.WarehouseOutbound     :5156 │
    │  Ikho.WarehouseReturns      :5157 │
    │  Ikho.WarehouseBilling      :5158 │
    │  Ikho.WarehouseReporting    :5159 │
    └───────────────────────────────────┘
```

The gateway handles all cross-cutting concerns (CORS, JWT auth scaffolding, rate limiting, correlation IDs, request logging) so individual services stay focused on their domain.

## Tech Stack

### Why these choices?

| Technology | Role | Why |
|---|---|---|
| **Angular 19** | Frontend SPA | Standalone components, Signals-based reactivity, built-in SSR support, and strong typing with TypeScript make it a productive, long-term-maintainable choice. |
| **.NET 10 Minimal API** | Backend services | Minimal ceremony, fast cold-start, and first-class support for the result pattern. A natural fit for slim, single-purpose microservices. |
| **YARP** | API Gateway | A purpose-built .NET reverse proxy. Config-driven routing means new services can be onboarded without code changes. |
| **Nx 23 + pnpm** | Monorepo tooling | Intelligent task caching and dependency graph management across both Angular and .NET projects in a single workspace. |
| **PostgreSQL** | Per-service storage | Reliable, well-supported relational database. Each service gets its own isolated database — no cross-service foreign keys. |
| **Apache Kafka** | Event streaming | Decouples services for async workflows (e.g. stock events, outbox publishing). Runs in KRaft mode (no Zookeeper). |
| **Avro / Schema Management** | Contract versioning | Build-time code generation from versioned schemas ensures services share contracts without runtime coupling. |
| **Vertical Slice Architecture** | Code organisation | Features are self-contained vertical cuts through the codebase. No horizontal layer folders (`Services/`, `Repositories/`) — each feature owns everything it needs. |

### Frontend

- **Angular 19** (standalone components, `OnPush`, `inject()`, Signals)
- **`@ikho/shared-ui`** — buildable Angular library for shared components
- **vitest-angular** — unit testing via `@angular/build:unit-test`
- **ESBuild** — production bundling

### Backend

- **.NET 10 Minimal API** across all services
- **Entity Framework Core** with **Npgsql** provider
- **YARP** (Yet Another Reverse Proxy) for the API gateway
- **Outbox pattern** + idempotency store in `Ikho.SharedLibrary`
- **xUnit** + `WebApplicationFactory<Program>` for integration tests

### Infrastructure (local dev)

- **Docker Compose** — single-node Kafka (KRaft) + PostgreSQL
- **Nx** — unified build, test, lint, and serve targets across stacks

## Prerequisites

| Tool | Version |
|---|---|
| [Node.js](https://nodejs.org/) | 24+ |
| [pnpm](https://pnpm.io/) | 10+ |
| [.NET SDK](https://dotnet.microsoft.com/download) | 10+ |
| [Docker Desktop](https://www.docker.com/products/docker-desktop) | Latest (for local infrastructure) |

## Getting Started

### 1. Clone the repository

```sh
git clone https://github.com/buidangkhoa05/iKho.git
cd iKho/source
```

### 2. Install JS dependencies

```sh
pnpm install
# If pnpm asks to approve build scripts:
pnpm approve-builds
```

### 3. Start local infrastructure

From the `source` folder, spin up PostgreSQL and Kafka:

```sh
docker compose -f docker-compose.platform.yml up -d
```

### 4. Run the backend services

Open separate terminals in the `source` folder for each service you want to run:

```sh
# API Gateway (port 5080)
pnpm nx serve IkhoApiGateway

# Warehouse Organization service (port 5151)
pnpm nx serve IkhoWarehouseOrganization

# Warehouse Catalog service (port 5152)
pnpm nx serve IkhoWarehouseCatalog
```

> [!NOTE]
> The shared library (`IkhoSharedLibrary`) is a cross-cutting concerns library, not a standalone service. Warehouse services depend on it at build time.

### 5. Run the Angular frontend

```sh
pnpm nx serve ikho-ui
```

The app is available at `http://localhost:4200`. The Angular dev server proxies all `/api/*` requests to the gateway at `:5080`.

### Alternative: run the whole stack with Docker Compose

Instead of steps 3-5 above, [`source/docker-compose.yml`](./source/docker-compose.yml) builds and
runs every container in the diagram above - postgres, kafka, all nine warehouse services, the
gateway, and the UI - in one command:

```sh
cd source
docker compose up --build
```

- UI: `http://localhost:4200`
- API Gateway (docs at `/docs`): `http://localhost:5080`
- Each warehouse service is also reachable directly on its own port (see the
  [architecture doc](./docs/architecture/README.md#2-container-diagram)) for debugging.

```sh
docker compose up --build -d   # detached
docker compose down            # stop (keeps postgres/kafka volumes)
docker compose down -v         # stop and reset volumes
```

`docker-compose.platform.yml` still exists separately for infra-only local dev (just Kafka +
PostgreSQL, for running individual services with `pnpm nx serve`).

## Project Structure

```
iKho/
├── docs/
│   ├── architecture/          ← C4 diagrams, API gateway docs, domain model
│   └── plans/                 ← Service rollout and implementation plans
└── source/                    ← Nx monorepo (pnpm workspace)
    ├── apps/
    │   ├── ikho-ui/                       ← Angular 19 SPA
    │   ├── ikho-api-gateway/              ← .NET 10 YARP gateway (:5080)
    │   ├── ikho-warehouse-organization/   ← Organization service (:5151)
    │   ├── ikho-warehouse-catalog/        ← Catalog service (:5152)
    │   ├── ikho-warehouse-partner/        ← Partner service (:5153)
    │   ├── ikho-warehouse-inventory/      ← Inventory service (:5154)
    │   ├── ikho-warehouse-inbound/        ← Inbound service (:5155)
    │   ├── ikho-warehouse-outbound/       ← Outbound service (:5156)
    │   ├── ikho-warehouse-returns/        ← Returns service (:5157)
    │   ├── ikho-warehouse-billing/        ← Billing service (:5158)
    │   └── ikho-warehouse-reporting/      ← Reporting service (:5159)
    ├── docker/                            ← Shared Dockerfile + postgres init script
    ├── docker-compose.yml                 ← Whole stack in containers
    ├── docker-compose.platform.yml        ← Infra only (kafka + postgres), for `nx serve`
    └── libs/
        ├── ikho-shared-library/      ← Cross-cutting concerns (outbox, Kafka, idempotency)
        ├── ikho-schema-management/   ← Build-time Avro contract codegen
        └── ikho-shared-ui/           ← Shared Angular component library (@ikho/shared-ui)
```

Every .NET service follows the same Vertical Slice layout:

```
Features/{Feature}/
  {Feature}Endpoints.cs   ← Minimal API route mappings
  {Feature}Service.cs     ← Business logic
  {Feature}Repository.cs  ← Data access
  {Feature}Models.cs      ← Request/response DTOs (records)
```

## Common Commands

All commands run from the `source` folder.

```sh
# Serve (each warehouse-* service follows the same pattern on its own port, see table above)
pnpm nx serve ikho-ui                      # Angular dev server at :4200
pnpm nx serve IkhoApiGateway               # API gateway at :5080
pnpm nx serve IkhoWarehouseOrganization    # Organization service at :5151

# Build
pnpm nx build ikho-ui                      # Angular production build
pnpm nx build ikho-shared-ui               # Compile shared UI library
pnpm nx run-many -t build                  # Build all projects

# Test
pnpm nx test ikho-ui                       # Angular unit tests (vitest)

# Schema generation
pnpm nx run IkhoSchemaManagement:generate  # Regenerate C# contracts from Avro schemas

# Docker (every app/lib has a docker-build target; docker-compose.yml drives all of them together)
pnpm nx docker-build IkhoWarehouseOrganization   # Build just this service's image
pnpm nx run-many -t docker-build                 # Build every image

# Workspace
pnpm nx graph                              # Visualise project dependency graph
pnpm nx show projects                      # List all projects
```

## Documentation

- [Architecture overview](./docs/architecture/README.md) — C4 context, container, and component diagrams
- [API Gateway](./docs/architecture/api-gateway.md) — Gateway internals, YARP config, middleware pipeline
- [Warehouse domain model](./docs/architecture/warehouse-domain-model.md) — Bounded contexts and aggregate definitions
- [Microservices rollout plan](./docs/plans/warehouse-microservices-rollout-plan.md) — Service topology, execution order, and architecture rules
