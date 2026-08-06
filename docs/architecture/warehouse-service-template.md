# Warehouse Service Template

> Living document — update whenever `Ikho.SharedLibrary`'s bootstrap helpers or the standard
> service layout changes. Part of the wider system architecture — see [README.md](./README.md)
> for the C4 overview and [api-gateway.md](./api-gateway.md) for gateway routing conventions.

## Overview

Every `Ikho.Warehouse*` service follows the same project layout and bootstraps the same
cross-cutting concerns via the shared `Ikho.SharedLibrary` project
(`source/libs/ikho-shared-library`), so correlation ids, request logging, health checks,
event publishing, the outbox pattern, and consumer idempotency behave identically across
services without each one reinventing them. Each warehouse service adds a `ProjectReference`
to `Ikho.SharedLibrary.csproj`, the same way it already references `Ikho.SchemaManagement`.

## Standard project layout

```
source/apps/ikho-warehouse-{capability}/
  Ikho.Warehouse{Capability}.csproj
  Program.cs                     # composition root
  appsettings.json                # Database, MessageBroker, Cors, Jwt sections
  appsettings.Development.json
  Properties/launchSettings.json
  project.json                    # Nx docker-build target (see "Local development infrastructure")
  Features/{Feature}/             # vertical slice per feature (endpoint, service, repository, DTOs)
  Domain/                         # shared domain/value types
  Shared/                         # cross-feature concerns local to this service
```

`project.json` only needs to declare the `docker-build` target — every other Nx target
(`build`, `serve`, `test`, ...) is inferred automatically from the `.csproj` by the
`@nx/dotnet` plugin. Don't add a plain `appsettings*.json` or `project.json` file to
`Ikho.SharedLibrary` without checking [its `.csproj`](../../source/libs/ikho-shared-library/Ikho.SharedLibrary.csproj)
and [`Directory.Build.targets`](../../source/Directory.Build.targets) first — both files rely
on those exclusions to avoid an `NETSDK1152` publish conflict between the library and every
service that references it.

## `Program.cs` bootstrap

```csharp
using Ikho.SharedLibrary;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddDbContext<CatalogDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("Default")));

builder.Services.AddServiceDefaults<CatalogDbContext>(builder.Configuration);

var app = builder.Build();

app.UseServiceDefaults(); // correlation id -> request logging -> health check endpoints

// app.MapCatalogEndpoints(); etc.

app.Run();
```

`AddServiceDefaults<TDbContext>` requires `TDbContext` to implement
`IHasOutboxMessages` and `IHasProcessedMessages` (apply
`OutboxEntityTypeConfiguration`/`ProcessedMessageEntityTypeConfiguration` in
`OnModelCreating`) so the outbox publisher and idempotency store can query the tables without
depending on each service's concrete `DbContext` type.

## Required `appsettings.json` sections

```jsonc
{
  "Database": {
    "ConnectionString": "Host=localhost;Database=ikho_warehouse_catalog;Username=ikho;Password=ikho"
  },
  "MessageBroker": {
    "BootstrapServers": "localhost:9092",
    "ClientId": "ikho-warehouse-catalog",
    "TopicPrefix": "warehouse.catalog"
  }
}
```

`Jwt`/`Cors`/`RateLimiting` sections are not required per service — those cross-cutting
concerns are handled once at `Ikho.ApiGateway`, not duplicated in each backend service.

## Outbox usage pattern

Write the business change and the outbox row in the same transaction, using the injected
`IOutboxWriter`:

```csharp
public sealed class CreateProductService(CatalogDbContext db, IOutboxWriter outbox)
{
    public async Task<Guid> HandleAsync(CreateProductRequest request, string? correlationId, CancellationToken ct)
    {
        var product = new Product(request.Sku, request.Name);
        db.Products.Add(product);

        var payload = JsonSerializer.Serialize(new ProductCreated(product.Id, product.Sku));
        db.OutboxMessages.Add(outbox.Enqueue(nameof(ProductCreated), payload, correlationId));

        await db.SaveChangesAsync(ct); // product row + outbox row commit atomically

        return product.Id;
    }
}
```

`OutboxPublisherBackgroundService<TDbContext>` (registered automatically by
`AddServiceDefaults`) polls unprocessed rows every 5 seconds and publishes them via
`IEventPublisher` (Kafka), marking each row processed or recording the error/retry count.

## Idempotency usage pattern

Kafka delivery is at-least-once, so consumers must guard against redelivery using
`IIdempotencyStore` before applying a message:

```csharp
public sealed class ReserveStockOnOrderPlacedConsumer(IIdempotencyStore idempotency, /* ... */)
{
    private const string ConsumerName = nameof(ReserveStockOnOrderPlacedConsumer);

    public async Task HandleAsync(string messageId, OrderPlaced @event, CancellationToken ct)
    {
        if (await idempotency.HasBeenProcessedAsync(ConsumerName, messageId, ct))
        {
            return; // already handled this delivery
        }

        // ... apply business logic ...

        await idempotency.MarkProcessedAsync(ConsumerName, messageId, ct);
    }
}
```

## Health checks

`AddServiceDefaults` registers PostgreSQL and Kafka health checks (tagged `ready`);
`UseServiceDefaults` maps:

- `GET /health/live` — process is running, no dependency checks.
- `GET /health/ready` — all `ready`-tagged checks (database, broker) must pass.

## Local development infrastructure

A shared Kafka + PostgreSQL stack for local development lives at
[`source/docker-compose.platform.yml`](../../source/docker-compose.platform.yml):

```sh
cd source
docker compose -f docker-compose.platform.yml up -d
```

Each service should create its own database inside the shared PostgreSQL instance
(database-per-service still applies — only the server process is shared locally). New
databases need a matching entry in
[`docker/postgres/init-databases.sql`](../../source/docker/postgres/init-databases.sql) so the
full-stack compose file (below) provisions them too.

To run the new service itself in a container alongside everything else, use
[`source/docker-compose.yml`](../../source/docker-compose.yml) instead — it builds every
app/lib via the shared [`docker/dotnet.Dockerfile`](../../source/docker/dotnet.Dockerfile)
(parameterized by `PROJECT_PATH`/`ASSEMBLY_NAME`, no new Dockerfile needed per service). Add
the new service as a compose service following the pattern of the existing `warehouse-*`
entries: `Database__ConnectionString`/`MessageBroker__BootstrapServers` env overrides pointing
at `postgres`/`kafka:29092`, a `depends_on` health gate, and — if it calls other services — the
matching `Services__*` env overrides pointing at their container hostnames on port 8080. Also
add a `docker-build` Nx target to its `project.json` (see any existing `warehouse-*`
`project.json` for the pattern) and a cluster/route entry in the gateway's
`ReverseProxy__Clusters__*` env overrides.

## Gateway routing

See [api-gateway.md](./api-gateway.md#reverse-proxy-routing-yarp) for the `/api/warehouse/{capability}/*`
route/cluster naming convention. Routes and clusters for all nine warehouse services already
exist in [appsettings.json](../../source/apps/ikho-api-gateway/appsettings.json), pointing at
each service's `localhost` dev port. When running the gateway via
[`docker-compose.yml`](../../source/docker-compose.yml), those destination addresses are
overridden per-container with `ReverseProxy__Clusters__{id}__Destinations__destination1__Address`
environment variables instead (container hostname, port 8080) — see the `api-gateway` service
there for the full list.

## Out of scope

- Concrete business endpoints for any specific warehouse service (see the per-service plans
  under `docs/plans/warehouse/`).
- Real schema/contract definitions (see
  [10-contracts-and-events-implementation.md](../plans/warehouse/10-contracts-and-events-implementation.md)).
- Identity provider selection and `[Authorize]` enforcement.
