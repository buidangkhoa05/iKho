# iKho Monorepo

This is a **Bazel 8.5.1** monorepo designed for **Go**, **React/TypeScript**, and **.NET** applications.

## 🚀 Getting Started

### Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| Bazelisk | Latest | `npm i -g @bazel/bazelisk` |
| pnpm | 10+ | `npm i -g pnpm` |
| Go | 1.23+ | [golang.org](https://golang.org/dl/) |
| Node.js | 22+ | [nodejs.org](https://nodejs.org/) |
| .NET SDK | 10.0+ | [dotnet.microsoft.com](https://dotnet.microsoft.com/download) |

### Project Structure

```
source/
├── apps/       # Application code (services, web apps)
└── packages/   # Shared libraries
```

### Common Commands

```powershell
# Build everything
bazel build //...

# Run tests
bazel test //...

# Check build graph/deps
bazel mod graph
```

### Run Applications

```powershell
# Admin Frontend - Development server (http://localhost:3000)
bazel run //apps/admin-fe:dev

# Admin Frontend - Production build
bazel build //apps/admin-fe:build
```

### Useful Bazel Commands

| Command | Description |
|---------|-------------|
| `bazel build //...` | Build all targets |
| `bazel test //...` | Run all tests |
| `bazel run //apps/admin-fe:dev` | Run admin frontend dev server |
| `bazel query //...` | List all build targets |
| `bazel clean` | Clear build cache |
| `bazel clean --expunge` | Full cache reset |
