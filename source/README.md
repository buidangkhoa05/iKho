# iKho Monorepo

This is a **Bazel 8.5.1** monorepo designed for **Go**, **React/TypeScript**, and **.NET** applications.

## 🚀 Getting Started

### Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| Bazelisk | Latest | `npm i -g @bazel/bazelisk` |
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
