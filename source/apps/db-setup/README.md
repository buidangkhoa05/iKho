# db-setup

A developer CLI for managing PostgreSQL migrations and generating type-safe Go code from SQL queries. Part of the [iKho](../../README.md) monorepo.

## Overview

`db-setup` wraps two common database development workflows into a single binary:

| Command    | What it does                                                    |
| ---------- | --------------------------------------------------------------- |
| `migrate`  | Applies / rolls back / shows the status of SQL migrations       |
| `generate` | Re-generates Go code from SQL, splits models, and compile-checks |

The `migrate` command manages the PostgreSQL Docker container and runs migrations entirely in Go — no external scripts or CLI tools are needed.

---

## Prerequisites

| Tool                                                              | Purpose                              |
| ----------------------------------------------------------------- | ------------------------------------ |
| [Go 1.26+](https://go.dev/dl/)                                   | Build and run the CLI                |
| [Docker Desktop](https://www.docker.com/products/docker-desktop/) | Runs the PostgreSQL container        |
| [sqlc](https://sqlc.dev/)                                         | Generates type-safe Go from SQL      |

> **golang-migrate** is used as a Go library (bundled via `go.mod`) — you do **not** need the `migrate` CLI.

### Install sqlc

```bash
# macOS / Linux (Homebrew)
brew install sqlc

# Windows (Scoop)
scoop install sqlc

# Or download from https://sqlc.dev
```

---

## Getting Started

```bash
# 1. Navigate to the app directory
cd source/apps/db-setup

# 2. Download Go dependencies
go mod download

# 3. Build the CLI
go build -o db-setup.exe .      # Windows
go build -o db-setup .          # macOS / Linux

# 4. Apply all migrations (starts Postgres in Docker automatically)
./db-setup migrate up

# 5. Confirm the database is at the latest version
./db-setup migrate status

# 6. Generate type-safe Go from SQL
./db-setup generate
```

### Using Nx

All commands are available as Nx targets from the monorepo root (`source/`):

```bash
cd source

# Migrations
npx nx migrate:up db-setup           # Apply all pending migrations
npx nx migrate:down db-setup          # Roll back the last migration
npx nx migrate:status db-setup        # Show current migration version

# Code generation
npx nx generate db-setup              # sqlc generate + model split + compile-check

# Build / test / lint
npx nx build db-setup
npx nx test db-setup
npx nx lint db-setup
```

Pass extra flags with `--`:

```bash
npx nx migrate:down db-setup -- --steps 3
```

Override database config with environment variables:

```bash
DB_NAME=orders npx nx migrate:up db-setup
```

---

## Configuration

All database settings are read from **environment variables** with sensible defaults:

| Variable         | Default            | Description                       |
| ---------------- | ------------------ | --------------------------------- |
| `DB_HOST`        | `localhost`        | PostgreSQL host                   |
| `DB_PORT`        | `5432`             | PostgreSQL port                   |
| `DB_USER`        | `postgres`         | Database user                     |
| `DB_PASSWORD`    | `password`         | Database password                 |
| `DB_NAME`        | `mydb`             | Database name                     |
| `DB_SSLMODE`     | `disable`          | SSL mode                          |
| `CONTAINER_NAME` | `ikho-postgres`    | Docker container name             |
| `POSTGRES_IMAGE` | `postgres:16`      | Docker image for Postgres         |

**Example** — target a different database:

```bash
DB_NAME=orders DB_PORT=5433 ./db-setup migrate up
```

---

## CLI Reference

### `migrate`

```
./db-setup migrate <up|down|status> [flags]
```

| Sub-command | Description                          |
| ----------- | ------------------------------------ |
| `up`        | Apply all pending migrations         |
| `down`      | Roll back the last migration         |
| `status`    | Print the current migration version  |

**Flags**

| Flag      | Short | Default | Description                                        |
| --------- | ----- | ------- | -------------------------------------------------- |
| `--steps` | `-s`  | `1`     | Number of migrations to roll back (only with `down`) |

```bash
# Direct CLI
./db-setup migrate up
./db-setup migrate down --steps 3
./db-setup migrate status

# Via Nx (from source/)
npx nx migrate:up db-setup
npx nx migrate:down db-setup -- --steps 3
npx nx migrate:status db-setup
```

---

### `generate`

```
./db-setup generate
```

**Via Nx:**

```bash
npx nx generate db-setup
```

Runs three steps:

1. **`sqlc generate`** — reads `query.sql` + `migrations/` and regenerates `db/`
2. **Model split** — splits `db/models.go` into one `.go` file per struct in `db/models/`
3. **`go build ./...`** — compile-checks the project

---

## Adding a New Migration

Migrations follow the `golang-migrate` naming convention:

```
migrations/<version>_<description>.up.sql
migrations/<version>_<description>.down.sql
```

### Step 1 — Create migration files

```bash
touch migrations/000003_create_orders.up.sql
touch migrations/000003_create_orders.down.sql
```

### Step 2 — Apply

```bash
./db-setup migrate up
# or: npx nx migrate:up db-setup
```

### Step 3 — Regenerate Go models

```bash
./db-setup generate
```

---

## Adding New SQL Queries

### Step 1 — Write the query in `query.sql`

```sql
-- name: GetProductByID :one
SELECT id, name, price, created_at
FROM products
WHERE id = $1;
```

The `-- name: <FunctionName> :<mode>` comment is required by sqlc.

| Mode    | Returns                                    |
| ------- | ------------------------------------------ |
| `:one`  | A single row (error if not found)          |
| `:many` | A slice of rows                            |
| `:exec` | No rows (INSERT / UPDATE / DELETE)         |

### Step 2 — Regenerate

```bash
./db-setup generate
# or: npx nx generate db-setup
```

---

## Project Structure

```
.
├── main.go                   # Entry point
├── go.mod                    # Module definition
├── sqlc.yaml                 # sqlc configuration
├── query.sql                 # SQL queries -> Go functions
├── package.json              # Nx integration (scripts)
│
├── cmd/
│   ├── root.go               # Root cobra command
│   ├── config.go             # Environment-based DB configuration
│   ├── migrate.go            # migrate sub-command
│   └── generate.go           # generate sub-command
│
├── db/                       # Generated by sqlc — do not edit manually
│   ├── db.go
│   ├── models.go
│   ├── query.sql.go
│   └── models/
│       ├── category.go
│       └── product.go
│
├── migrations/
│   ├── 000001_create_categories.up.sql
│   ├── 000001_create_categories.down.sql
│   ├── 000002_create_products.up.sql
│   └── 000002_create_products.down.sql
│
└── internal/
    └── splitter/             # Splits db/models.go into per-struct files
        └── splitter.go
```

---

## Typical Development Workflow

```
Change schema?
  └─ 1. Add migration files in migrations/
     2. ./db-setup migrate up
     3. ./db-setup generate

Change queries only?
  └─ 1. Edit query.sql
     2. ./db-setup generate
```

---

## Troubleshooting

| Problem                          | Solution                                                                |
| -------------------------------- | ----------------------------------------------------------------------- |
| `Docker is not running`          | Start Docker Desktop and retry                                          |
| `sqlc: command not found`        | Install `sqlc` and ensure it is on your `PATH`                          |
| `go build failed after generation` | Check error output; usually a mismatch between `query.sql` and schema |
| Port 5432 already in use         | Stop local Postgres or set `DB_PORT` to another value                   |
