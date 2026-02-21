# Product Catalog Service

Centralized reference data service for products (SKUs, barcodes, dimensions, weights, hazard classes). Other services keep a read-only cache of this data.

## Tech Stack

- **Go 1.24+** — standard language
- **Echo v4** — HTTP framework (routing, middleware, JSON binding)
- **Nx** — monorepo task orchestration

## Quick Start

```bash
# From the workspace root (source/)
pnpm nx dev product-catalog    # Starts server on :8080
pnpm nx build product-catalog  # Builds binary to apps/product-catalog/dist/
pnpm nx test product-catalog   # Runs go test ./...
pnpm nx lint product-catalog   # Runs go vet ./...
```

Or run directly from `apps/product-catalog/`:
```bash
go run ./cmd/server
go test ./...
```

## API Endpoints

| Method | Path                      | Description            |
|--------|---------------------------|------------------------|
| GET    | `/health`                 | Health check           |
| GET    | `/api/v1/products`        | List all products      |
| GET    | `/api/v1/products/:id`    | Get product by ID      |
| POST   | `/api/v1/products`        | Create a product       |
| PUT    | `/api/v1/products/:id`    | Update a product       |
| DELETE | `/api/v1/products/:id`    | Delete a product       |
| GET    | `/api/v1/categories`      | List all categories    |
| GET    | `/api/v1/categories/:id`  | Get category by ID     |
| POST   | `/api/v1/categories`      | Create a category      |

## Project Structure (Vertical Slice Architecture)

```
apps/product-catalog/
├── cmd/
│   └── server/
│       └── main.go                         # Entrypoint: wiring, config, HTTP server
├── internal/
│   ├── domain/
│   │   └── product.go                      # Shared domain types (Product, Category, Dimensions, Weight)
│   ├── shared/
│   │   └── response.go                     # JSON helpers, error responses
│   └── features/
│       ├── products/                       # Products feature slice
│       │   ├── handler.go                  # HTTP handlers + RegisterRoutes
│       │   ├── service.go                  # Business logic
│       │   ├── repository.go               # Repository interface
│       │   ├── memory_repository.go        # In-memory implementation
│       │   ├── models.go                   # Request/response DTOs
│       │   ├── validation.go               # Input validation
│       │   └── products_test.go            # Tests
│       └── categories/                     # Categories feature slice
│           ├── handler.go
│           ├── service.go
│           ├── repository.go
│           ├── memory_repository.go
│           └── models.go
├── go.mod
├── go.sum
├── package.json                            # Nx project definition
└── README.md
```

## Architecture Notes

- **Vertical Slice**: Each feature (products, categories) owns its handler, service, repository, models, and validation — all co-located in one package.
- **No cross-slice imports**: Feature slices communicate only through shared domain types in `internal/domain/`.
- **In-memory repository**: The template uses a map-based store. Swap with PostgreSQL, Redis, etc. by implementing the `Repository` interface.
- **Template only**: Handlers and services are functional stubs. Extend with real business logic as needed.
