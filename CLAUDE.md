# iKho – Instructions for Claude

## Architecture

Monorepo at `source/` managed by **pnpm** + **Nx 23**.

### `source/apps/` — Deployable services

| App | Stack | Purpose |
|-----|-------|---------|
| `ikho-ui` | Angular 19 (standalone, esbuild, SSR) | Main SPA frontend |
| `ikho-api-gateway` | .NET 10 / YARP | Reverse proxy — single entry point |
| `ikho-warehouse-organization` | .NET 10 Minimal API | Warehouse structure service (companies, warehouses, location hierarchy) |
| `ikho-warehouse-catalog` | .NET 10 Minimal API | Warehouse catalog service |

### `source/libs/` — Shared libraries (not independently deployable)

| Lib | Stack | Purpose |
|-----|-------|---------|
| `ikho-shared-library` | .NET 10 | Cross-cutting concerns: outbox, idempotency, Kafka, health checks, middleware |
| `ikho-schema-management` | .NET library + codegen | Generates C# contracts from Avro schemas; build-time only |
| `ikho-shared-ui` | Angular 19 buildable library | Shared UI components (`@ikho/shared-ui`) |

**Rule**: Only libraries that are consumed by multiple apps (or that are build-time tools with no HTTP port) belong in `libs/`. Every independently deployable .NET service belongs in `apps/`.

**Universal pattern**: Vertical Slice Architecture across all languages.

**Proxy**: Angular dev server forwards `/api/*` → `http://localhost:5143` (.NET API)

Further architecture docs live under `docs/architecture/` (API gateway, warehouse domain model, warehouse DB relationships, warehouse service template).

## Build and Test

```sh
cd source
pnpm install                               # install all JS deps
pnpm nx serve ikho-ui                      # Angular dev server at :4200 (proxies /api to :5143)
pnpm nx serve Ikho.SharedLibrary           # .NET shared lib API at :5143
pnpm nx serve Ikho.Warehouse.Organization  # Organization service at :5151
pnpm nx build ikho-ui                      # Angular production build
pnpm nx build ikho-shared-ui               # buildable library compile
pnpm nx test ikho-ui                       # vitest-angular tests
pnpm nx run-many -t build                  # build all projects
pnpm nx affected -t test                   # run tests only for affected projects
pnpm nx graph                              # visualise project dependency graph
```

## Angular Frontend Conventions

### File Structure (`ikho-ui`)
```
src/app/features/{feature}/
  index.ts              ← barrel exports (named only, no default exports)
  types.ts              ← domain types
  components/           ← feature-specific components
  services/             ← feature-scoped Angular services
src/app/shared/
  components/           ← reusable UI components (from ikho-shared-ui)
  layouts/               ← Shell, Header, Sidebar, Footer
src/app/core/
  types.ts              ← shared domain types
  interceptors/         ← HTTP interceptors (auth, error)
```

### Key Patterns
- **Path alias**: `@ikho/shared-ui` → `libs/ikho-shared-ui/src/index.ts` (set in `tsconfig.base.json`)
- **HTTP**: Angular `HttpClient` in feature services. All API calls under `/api/*` (proxied to .NET)
- **State**: Angular Signals for reactive state; avoid RxJS where Signals suffice
- **Routing**: `provideRouter()` with lazy-loaded feature routes via `loadComponent()`
- **Testing**: `vitest-angular` via `@angular/build:unit-test`. Test files colocated (`.spec.ts`)
- **Standalone**: All components, directives, pipes use `standalone: true` (Angular 19 default)

### Angular Component Rules
- Standalone components only — no `NgModule`
- `export` the component class (named export)
- Use `inject()` function for dependency injection inside components
- `OnPush` change detection strategy

## .NET Backend Conventions

### File Structure
```
Features/{Feature}/
  {Feature}Endpoints.cs    ← Minimal API endpoint mappings (.MapGroup)
  {Feature}Service.cs      ← business logic
  {Feature}Repository.cs   ← repository interface
  {Feature}Models.cs       ← request/response DTOs (records)
Domain/                    ← core domain models
Shared/                    ← response helpers, extensions
Program.cs                 ← app builder, DI registration, route mapping
```

### Key Patterns
- **Vertical Slice Architecture**: organize by feature, not by technical layer. A slice owns its endpoint, service, repository, DTOs and (when used) validator/mapping, all co-located under `Features/{Feature}/`. Slices don't reference each other directly — use shared contracts or domain events for cross-feature communication.
- **Workspace placement rule**: every independently deployable .NET service (owns a port, a database, a `Program.cs`) belongs in `source/apps/`. Only libraries consumed by multiple services, or build-time-only tools, belong in `source/libs/`. Never place a runnable microservice under `source/libs/`.
- **Endpoint groups**: `app.MapGroup("/api/{feature}").MapFeatureEndpoints()`
- **Minimal API handlers**: top-level static methods or lambdas, no controllers
- **DTOs as records**: `record CreateXRequest(string Name, ...)` for immutable request models
- **Result pattern**: Return `TypedResults.Ok(...)` / `TypedResults.NotFound()` for typed responses
- **DI**: Constructor injection for services; register in `Program.cs` with `builder.Services.Add*`
- **Nullable reference types**: declare variables non-nullable, check `is null` / `is not null` (not `== null`) at entry points; don't add redundant null checks where the type system already guarantees non-null.
- **Naming**: PascalCase for types/methods/public members, camelCase for private fields/locals, `I`-prefixed interfaces (e.g. `IUserService`).
- **Formatting**: follow `.editorconfig`; file-scoped namespaces; newline before opening braces; prefer pattern matching and switch expressions; use `nameof` instead of string literals for member names.
- **Testing**: xUnit with `WebApplicationFactory<Program>` for integration tests. Use Arrange/Act/Assert comments and match the naming/capitalization style of nearby test files.

## Nx Workspace

- Run tasks: `pnpm nx <target> <project>`
- Cacheable: `build`, `test`, `lint`
- .NET projects detected via `.csproj` by `@nx/dotnet` plugin (no `project.json` required)
- `@ikho/*` scope for Angular shared packages; path mapped in `tsconfig.base.json`
- Use `pnpm nx affected -t <target>` in CI/local checks to only run tasks for changed projects
- `pnpm nx graph` to inspect the project dependency graph before large refactors

## Available skills and agents

- `.claude/agents/expert-dotnet-software-engineer.md` — subagent for deep .NET/C# design, architecture and testing guidance.
- `.claude/skills/create-readme/` — regenerates a project README following this repo's house style.
- `.claude/skills/dotnet-design-pattern-review/` — read-only review of C#/.NET code against the design-pattern checklist below.
