# Task Manager Monorepo Example

A production-ready **Bazel monorepo** demonstrating **Go**, **React/TypeScript**, and **.NET** working together.

## 🚀 Quick Start

### Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| Bazelisk | Latest | `npm i -g @bazel/bazelisk` or [GitHub](https://github.com/bazelbuild/bazelisk) |
| Go | 1.23+ | [golang.org](https://golang.org/dl/) |
| Node.js | 22+ | [nodejs.org](https://nodejs.org/) |
| .NET SDK | 10.0+ | [dotnet.microsoft.com](https://dotnet.microsoft.com/download) |

### Build Everything

```powershell
bazel build //...
```

### Run Services

```powershell
# Terminal 1: Go Task API (http://localhost:8080)
bazel run //apps/task-api:task-api

# Terminal 2: .NET User API (http://localhost:5000)
dotnet run --project apps/user-api

# Terminal 3: React Frontend (http://localhost:5173)
cd apps/web-app && npm install && npm run dev
```

---

## 📁 Project Structure

```
example/
├── apps/
│   ├── task-api/       # Go - Task CRUD API
│   ├── user-api/       # .NET 10 - User management
│   └── web-app/        # React - Task Manager UI
└── packages/
    └── shared-types/   # Shared TypeScript types
```

---

## 🔧 Development Workflow

### Adding a New Go Service

```powershell
mkdir apps/my-service
# Copy apps/task-api as template
# Edit BUILD.bazel with new target name
bazel build //apps/my-service:my-service
```

### Adding a New .NET Service

```powershell
dotnet new webapi -o apps/my-dotnet-api
# Packages auto-managed via Directory.Packages.props
bazel build //apps/my-dotnet-api:my-dotnet-api
```

### Adding a New React App

```powershell
cd apps && npm create vite@latest my-app -- --template react-ts
# Add BUILD.bazel from web-app template
```

---

## 📋 Useful Bazel Commands

| Command | Description |
|---------|-------------|
| `bazel build //...` | Build all targets |
| `bazel test //...` | Run all tests |
| `bazel run //apps/task-api:task-api` | Run Go service |
| `bazel query //...` | List all build targets |
| `bazel clean` | Clear build cache |
| `bazel clean --expunge` | Full cache reset |

---

## 🏗️ Architecture

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   React UI   │────▶│  Go Task API │────▶│ .NET User API│
│  :5173       │     │  :8080       │     │  :5000       │
└──────────────┘     └──────────────┘     └──────────────┘
```

---

## 📦 .NET Centralized Package Management

All NuGet packages are defined in `Directory.Packages.props`:

```xml
<!-- Add new packages here -->
<PackageVersion Include="PackageName" Version="1.0.0" />
```

Then reference in `*.csproj` without version:

```xml
<PackageReference Include="PackageName" />
```
