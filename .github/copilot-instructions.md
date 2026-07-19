# iKho – AI Agent Instructions

## Architecture

Monorepo at `source/` managed by **pnpm** + **Nx 23**. Two apps, one shared library.

| App / Lib | Stack | Purpose |
|-----------|-------|---------|
| `ikho-ui` | Angular 19 (standalone, esbuild, SSR) | Main SPA frontend |
| `IkhoSharedLibrary` | .NET 10 Minimal API | REST API backend |
| `ikho-shared-ui` | Angular 19 buildable library | Shared UI components (`@ikho/shared-ui`) |

**Universal pattern**: Vertical Slice Architecture across all languages.

**Proxy**: Angular dev server forwards `/api/*` → `http://localhost:5143` (.NET API)

## Build and Test

```sh
cd source
pnpm install                          # install all JS deps
pnpm nx serve ikho-ui                 # Angular dev server at :4200 (proxies /api to :5143)
pnpm nx serve IkhoSharedLibrary       # .NET API at :5143
pnpm nx build ikho-ui                 # Angular production build
pnpm nx build ikho-shared-ui          # buildable library compile
pnpm nx test ikho-ui                  # vitest-angular tests
pnpm nx run-many -t build             # build all projects
pnpm nx graph                         # visualise project dependency graph
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
  layouts/              ← Shell, Header, Sidebar, Footer
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

## .NET Backend Conventions (`IkhoSharedLibrary`)

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
- **Endpoint groups**: `app.MapGroup("/api/{feature}").MapFeatureEndpoints()`
- **Minimal API handlers**: top-level static methods or lambdas, no controllers
- **DTOs as records**: `record CreateXRequest(string Name, ...)` for immutable request models
- **Result pattern**: Return `TypedResults.Ok(...)` / `TypedResults.NotFound()` for typed responses
- **DI**: Constructor injection for services; register in `Program.cs` with `builder.Services.Add*`
- **Testing**: xUnit with `WebApplicationFactory<Program>` for integration tests

## Nx Workspace

- Run tasks: `pnpm nx <target> <project>`
- Cacheable: `build`, `test`, `lint`
- .NET projects detected via `.csproj` by `@nx/dotnet` plugin (no `project.json` required)
- `@ikho/*` scope for Angular shared packages; path mapped in `tsconfig.base.json`
