---
description: 'Instructions for Nx monorepo workspace configuration and usage'
applyTo: '**/nx.json, **/project.json, **/workspace.json'
---

# Nx Monorepo Development Instructions

Instructions for building, maintaining, and scaling the iKho Nx monorepo, following official Nx documentation at https://nx.dev.

## Project Context

- **Nx** as the monorepo build orchestration and task execution framework
- Package-based monorepo: Nx infers project targets from `package.json` scripts
- **pnpm workspaces** for dependency management (`pnpm-workspace.yaml`)
- Apps live under `apps/`, shared libraries under `packages/`
- Frontend apps built with **Vite** (via `@nx/vite` plugin)
- TypeScript-first with shared `tsconfig.base.json` at workspace root

## Workspace Structure

```
source/                     # Nx workspace root
├── nx.json                 # Nx configuration
├── package.json            # Root package.json with Nx devDependency + scripts
├── pnpm-workspace.yaml     # pnpm workspace packages: apps/*, packages/*
├── tsconfig.base.json      # Shared TypeScript compiler options
├── apps/
│   └── admin-fe/           # React + TanStack Start frontend app
│       ├── package.json    # App-level deps and scripts (Nx infers targets)
│       ├── vite.config.ts  # Vite config (Nx @nx/vite plugin reads this)
│       └── tsconfig.json   # Extends ../../tsconfig.base.json
└── packages/               # Shared libraries (empty for now)
```

## Development Standards

### Monorepo Architecture

- Follow Nx conventions: `apps/` for deployable applications, `packages/` (or `libs/`) for shared libraries
- Enforce strict dependency boundaries between projects using Nx module boundary rules
- Keep projects focused and small to maximize caching effectiveness
- Never allow circular dependencies between projects
- Use `@ikho/*` scope for shared packages (mapped in `tsconfig.base.json` paths)

### Nx Configuration

- Use **package-based** project inference: Nx discovers projects from `package.json` files in workspace packages
- Use `@nx/vite` plugin for automatic target inference from `vite.config.ts`
- Define `targetDefaults` in `nx.json` for consistent behavior across projects:
  - `build` depends on `^build` (builds dependencies first)
  - `test` and `lint` are cacheable
- Use `namedInputs` to define input sets for cache invalidation (e.g., `production` excludes test files)
- Set `defaultBase: "main"` for affected commands

### Task Execution

- Run tasks with `nx <target> <project>`:
  - `nx dev admin-fe` — start dev server
  - `nx build admin-fe` — production build
  - `nx test admin-fe` — run tests
- Run tasks across all projects: `nx run-many -t build`
- Run only affected tasks: `nx affected -t test`
- Visualize project graph: `nx graph`
- List all projects: `nx show projects`
- Show project details: `nx show project admin-fe`

### Caching

- Nx caches task results locally in `.nx/cache` (gitignored)
- Cache is keyed by: task target, project files (via `namedInputs`), environment, and dependencies
- Mark tasks as `"cache": true` in `targetDefaults` to enable caching
- Use `nx reset` to clear the local cache when needed
- Consider Nx Cloud for distributed caching in CI

### Adding New Projects

#### New App
1. Create directory under `apps/<app-name>/`
2. Add `package.json` with name, scripts (`dev`, `build`, `test`)
3. Add `vite.config.ts` (or other build config)
4. Add `tsconfig.json` extending `../../tsconfig.base.json`
5. Nx auto-discovers the project — verify with `nx show projects`

#### New Shared Library
1. Create directory under `packages/<lib-name>/`
2. Add `package.json` with `"name": "@ikho/<lib-name>"`
3. Add `src/index.ts` as the public API entry point
4. Add `tsconfig.json` extending `../../tsconfig.base.json`
5. Add path mapping in root `tsconfig.base.json`: `"@ikho/<lib-name>": ["packages/<lib-name>/src/index.ts"]`
6. Import in consuming apps via `@ikho/<lib-name>`

### Dependency Management

- Use **pnpm** as the package manager for all projects
- Install workspace-wide dev tools (Nx, linters) at the root `package.json`
- Install project-specific dependencies in each project's `package.json`
- Run `pnpm install` from workspace root to install all dependencies
- Use `pnpm -F <project-name> add <package>` to add deps to a specific project

### Testing

- Use Vitest as the test runner for all frontend projects
- Run tests through Nx for caching: `nx test <project>`
- Run all tests: `nx run-many -t test`
- Run affected tests only: `nx affected -t test`

### Code Quality

- Format code consistently (Prettier, ESLint)
- Run linting through Nx: `nx lint <project>`
- Integrate quality checks into CI using `nx affected`

## Implementation Process

1. Define project structure under `apps/` or `packages/`
2. Add `package.json` with appropriate name and scripts
3. Add build configuration (`vite.config.ts`, `tsconfig.json`)
4. Install dependencies with `pnpm install`
5. Verify project discovery: `nx show projects`
6. Run tasks: `nx build <project>`, `nx test <project>`
7. Check project graph: `nx graph`

## Additional Guidelines

- Keep `nx.json` clean and well-organized
- Use `nx show project <name>` to inspect inferred targets and their configuration
- Prefer Nx task orchestration over manual `pnpm run` for consistent caching
- Document custom executors or generators if created
- Use `nx migrate` to update Nx and its plugins to newer versions
- Maintain a clean git history; use `nx affected` in CI to only build/test changed projects
