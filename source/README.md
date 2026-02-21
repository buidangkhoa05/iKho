# iKho Monorepo

This is an **Nx** monorepo designed for **React/TypeScript** applications, with room for future **Go** and **.NET** services.

## Getting Started

### Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| Node.js | 22+ | [nodejs.org](https://nodejs.org/) |
| pnpm | 10+ | `npm i -g pnpm` |

### Install Dependencies

```powershell
cd source
pnpm install
```

### Project Structure

```
source/                     # Nx workspace root
├── nx.json                 # Nx configuration & caching rules
├── package.json            # Root deps (Nx, plugins) & convenience scripts
├── pnpm-workspace.yaml     # Workspace packages: apps/*, packages/*
├── tsconfig.base.json      # Shared TypeScript compiler options
├── apps/
│   └── admin-fe/           # React + TanStack Start frontend app
└── packages/               # Shared libraries (future)
```

### Common Commands

```powershell
# Start admin-fe dev server (http://localhost:3000)
pnpm nx dev admin-fe

# Production build
pnpm nx build admin-fe

# Run tests
pnpm nx test admin-fe

# Run all tasks across workspace
pnpm nx run-many -t build test

# Run only affected tasks (since last commit)
pnpm nx affected -t build test

# Visualize project dependency graph
pnpm nx graph
```

### Useful Nx Commands

| Command | Description |
|---------|-------------|
| `pnpm nx dev admin-fe` | Start admin frontend dev server |
| `pnpm nx build admin-fe` | Production build |
| `pnpm nx test admin-fe` | Run tests (Vitest) |
| `pnpm nx run-many -t build` | Build all projects |
| `pnpm nx affected -t test` | Test only affected projects |
| `pnpm nx graph` | Open project graph visualization |
| `pnpm nx show projects` | List all workspace projects |
| `pnpm nx show project admin-fe` | Show project targets & config |
| `pnpm nx reset` | Clear Nx cache |
