# iKho Architecture

> **Start here.** This is the entry point for understanding how the iKho system fits
> together. Diagrams use the [C4 model](https://c4model.com/) (Context → Container →
> Component) rendered with Mermaid. Keep this document up to date as containers/components
> are added or change — it is the map new team members use to orient themselves.

## How to read this doc

| Level | Diagram | Shows |
|---|---|---|
| 1 | [System Context](#1-system-context) | iKho as a black box and who/what interacts with it |
| 2 | [Container](#2-container-diagram) | The deployable apps/services that make up iKho and how they talk to each other |
| 3 | [Component](#3-component-diagrams) | The internals of an individual container |

Detailed, container-specific docs live alongside this file (e.g.
[api-gateway.md](./api-gateway.md)) — link them from the relevant section below as they're
written.

## 1. System Context

```mermaid
C4Context
    title System Context diagram for iKho

    Person(user, "End User", "A person using the iKho application via a browser")

    System(ikho, "iKho System", "Warehouse / inventory management platform")

    System_Ext(idp, "Identity Provider", "Not yet selected (Entra ID / Auth0 / custom). Will issue JWTs once chosen.")

    Rel(user, ikho, "Uses", "HTTPS")
    Rel(ikho, idp, "Validates tokens against (planned, not wired up yet)", "OIDC/JWT")

    UpdateRelStyle(ikho, idp, $offsetY="-10")
```

- The **Identity Provider** is aspirational — the API Gateway has JWT validation scaffolding
  in place, but no provider has been selected yet (see
  [api-gateway.md § Open questions](./api-gateway.md#open-questions)).

## 2. Container Diagram

```mermaid
C4Container
    title Container diagram for iKho

    Person(user, "End User", "A person using the iKho application via a browser")

    System_Boundary(ikho, "iKho System") {
        Container(ui, "ikho-ui", "Angular 19 SPA (standalone, SSR)", "Frontend web application")
        Container(sharedui, "ikho-shared-ui", "Angular 19 buildable library", "Reusable UI components consumed by ikho-ui (@ikho/shared-ui)")
        Container(gateway, "Ikho.ApiGateway", ".NET 10 / YARP", "Single entry point: routing, CORS, JWT auth scaffolding, rate limiting, correlation IDs, request logging")
        Container(api, "Ikho.SharedLibrary", ".NET 10 Minimal API", "Backend REST API (Vertical Slice Architecture)")
        Container(schema, "Ikho.SchemaManagement", ".NET library + codegen CLI", "Generates C# contracts from JSON Schema/Avro definitions, referenced by Ikho.SharedLibrary at build time")
        Container(orgsvc, "Ikho.WarehouseOrganization", ".NET 10 Minimal API", "Warehouse structure service owning companies, warehouses, bins, and docks")
        Container(catalogsvc, "Ikho.WarehouseCatalog", ".NET 10 Minimal API", "Product master-data service for products, categories, brands, UOMs, and barcodes")
        Container(partnersvc, "Ikho.WarehousePartner", ".NET 10 Minimal API", "Supplier and customer master-data service")
        Container(inventorysvc, "Ikho.WarehouseInventory", ".NET 10 Minimal API", "Stock system of record owning ledger, lots, serials, and reservations")
        Container(inboundsvc, "Ikho.WarehouseInbound", ".NET 10 Minimal API", "Receiving and putaway workflow service")
        Container(outboundsvc, "Ikho.WarehouseOutbound", ".NET 10 Minimal API", "Allocation, picking, packing, and shipping workflow service")
        Container(returnssvc, "Ikho.WarehouseReturns", ".NET 10 Minimal API", "Reverse-logistics and disposition service")
        Container(billingsvc, "Ikho.WarehouseBilling", ".NET 10 Minimal API", "Billing and financial snapshot service")
        Container(reportingsvc, "Ikho.WarehouseReporting", ".NET 10 Minimal API", "Kafka-driven projection/read-model service for dashboards and analytics")
    }

    Rel(user, ui, "Uses", "HTTPS")
    Rel(ui, sharedui, "Imports components from", "TS import")
    Rel(ui, gateway, "Calls /api/*", "HTTPS/JSON (dev: via proxy.conf.json)")
    Rel(gateway, api, "Forwards /api/* to shared-library-cluster (catch-all fallback)", "HTTP/JSON")
    Rel(api, schema, "References generated contracts from", "Project reference")
    Rel(gateway, orgsvc, "/api/warehouse/organization/*", "HTTP/JSON")
    Rel(gateway, catalogsvc, "/api/warehouse/catalog/*", "HTTP/JSON")
    Rel(gateway, partnersvc, "/api/warehouse/partner/*", "HTTP/JSON")
    Rel(gateway, inventorysvc, "/api/warehouse/inventory/*", "HTTP/JSON")
    Rel(gateway, inboundsvc, "/api/warehouse/inbound/*", "HTTP/JSON")
    Rel(gateway, outboundsvc, "/api/warehouse/outbound/*", "HTTP/JSON")
    Rel(gateway, returnssvc, "/api/warehouse/returns/*", "HTTP/JSON")
    Rel(gateway, billingsvc, "/api/warehouse/billing/*", "HTTP/JSON")
    Rel(gateway, reportingsvc, "/api/warehouse/reporting/*", "HTTP/JSON")
    Rel(schema, orgsvc, "Contract reference", "Project reference")
    Rel(schema, catalogsvc, "Contract reference", "Project reference")
    Rel(schema, partnersvc, "Contract reference", "Project reference")
    Rel(schema, inventorysvc, "Contract reference", "Project reference")
    Rel(schema, inboundsvc, "Contract reference", "Project reference")
    Rel(schema, outboundsvc, "Contract reference", "Project reference")
    Rel(schema, returnssvc, "Contract reference", "Project reference")
    Rel(schema, billingsvc, "Contract reference", "Project reference")
    Rel(schema, reportingsvc, "Contract reference", "Project reference")
```

| Container | Path | Port(s) |
|---|---|---|
| `ikho-ui` | [source/apps/ikho-ui](../../source/apps/ikho-ui) | 4200 (dev) |
| `ikho-shared-ui` | [source/libs/ikho-shared-ui](../../source/libs/ikho-shared-ui) | — (library, not deployed standalone) |
| `Ikho.ApiGateway` | [source/apps/ikho-api-gateway](../../source/apps/ikho-api-gateway) | 5080 / 7080 |
| `Ikho.SharedLibrary` | [source/libs/ikho-shared-library](../../source/libs/ikho-shared-library) | 5143 / 7270 |
| `Ikho.SchemaManagement` | [source/libs/ikho-schema-management](../../source/libs/ikho-schema-management) | — (build-time codegen, not a running service) |
| `Ikho.WarehouseOrganization` | [source/apps/ikho-warehouse-organization](../../source/apps/ikho-warehouse-organization) | 5151 |
| `Ikho.WarehouseCatalog` | [source/apps/ikho-warehouse-catalog](../../source/apps/ikho-warehouse-catalog) | 5152 |
| `Ikho.WarehousePartner` | [source/apps/ikho-warehouse-partner](../../source/apps/ikho-warehouse-partner) | 5153 |
| `Ikho.WarehouseInventory` | [source/apps/ikho-warehouse-inventory](../../source/apps/ikho-warehouse-inventory) | 5154 |
| `Ikho.WarehouseInbound` | [source/apps/ikho-warehouse-inbound](../../source/apps/ikho-warehouse-inbound) | 5155 |
| `Ikho.WarehouseOutbound` | [source/apps/ikho-warehouse-outbound](../../source/apps/ikho-warehouse-outbound) | 5156 |
| `Ikho.WarehouseReturns` | [source/apps/ikho-warehouse-returns](../../source/apps/ikho-warehouse-returns) | 5157 |
| `Ikho.WarehouseBilling` | [source/apps/ikho-warehouse-billing](../../source/apps/ikho-warehouse-billing) | 5158 |
| `Ikho.WarehouseReporting` | [source/apps/ikho-warehouse-reporting](../../source/apps/ikho-warehouse-reporting) | 5159 |

### Running the containers

Every container above (postgres, kafka, and all services listed) can be run in Docker via
[`source/docker-compose.yml`](../../source/docker-compose.yml):

```sh
cd source
docker compose up --build
```

For infra-only local dev (running individual services with `pnpm nx serve`), use
[`source/docker-compose.platform.yml`](../../source/docker-compose.platform.yml) instead - it
starts just Kafka and PostgreSQL.

## 3. Component Diagrams

### 3.1 Ikho.ApiGateway

```mermaid
C4Component
    title Component diagram for Ikho.ApiGateway

    Container(client, "ikho-ui", "Angular SPA", "Sends /api/* requests")

    Container_Boundary(gateway, "Ikho.ApiGateway") {
        Component(correlation, "CorrelationIdMiddleware", "Middleware", "Propagates/generates X-Correlation-Id, pushes into logging scope")
        Component(reqlog, "RequestLoggingMiddleware", "Middleware", "Logs method/path/status/elapsed per request")
        Component(cors, "CorsExtensions", "Middleware + config", "Applies GatewayCors policy from Cors:AllowedOrigins")
        Component(auth, "JwtAuthenticationExtensions", "Middleware + config", "JWT bearer validation (placeholder Authority/Audience)")
        Component(ratelimit, "RateLimitingExtensions", "Middleware + config", "Fixed-window limiter (GatewayFixedWindow), 429 on breach")
        Component(yarp, "YARP Reverse Proxy Core", "Yarp.ReverseProxy", "Routes matched paths to configured clusters (ReverseProxy config section)")
    }

    Container(api, "Ikho.SharedLibrary", ".NET 10 Minimal API", "Backend REST API")

    Rel(client, correlation, "HTTPS request")
    Rel(correlation, reqlog, "next()")
    Rel(reqlog, cors, "next()")
    Rel(cors, auth, "next()")
    Rel(auth, ratelimit, "next()")
    Rel(ratelimit, yarp, "next()")
    Rel(yarp, api, "Forwards via shared-library-cluster", "HTTP/JSON")
```

Full detail: [api-gateway.md](./api-gateway.md).

### 3.2 Ikho.SharedLibrary

Not yet implemented beyond a template `Program.cs` — no feature slices exist yet. Once
features are added under `Features/{Feature}/` (per
[csharp.instructions.md](../../.github/instructions/csharp.instructions.md)), add a component
diagram here showing the endpoint/service/repository slices.

### 3.3 Planned Warehouse Domain Decomposition

The current architecture is evolving from a single shared backend into multiple capability-based warehouse services. The planned service boundaries, entity ownership, and execution order are documented here:

1. [warehouse-domain-model.md](./warehouse-domain-model.md)
2. [warehouse-db-relationships.md](./warehouse-db-relationships.md)
3. [../plans/warehouse-microservices-rollout-plan.md](../plans/warehouse-microservices-rollout-plan.md)

## Adding a new container or component

When adding a new deployable app/service:

1. Add it to the **Container Diagram** above with its relationships to existing containers.
2. If it has non-trivial internals (multiple middleware/services worth documenting), add a
   **Component Diagram** under [§3](#3-component-diagrams).
3. If it warrants deeper documentation (config reference, ports, decisions), create a
   sibling doc (e.g. `docs/architecture/<container-name>.md`) and link it from the relevant
   row/section here.
4. Keep this file as the single jumping-off point — don't let container-specific detail pile
   up here; push it into the linked docs instead.

## Related documents

- [api-gateway.md](./api-gateway.md) — API Gateway deep dive (config, pipeline, open questions)
- [warehouse-domain-model.md](./warehouse-domain-model.md) — logical domain map for warehouse bounded contexts and entities
- [warehouse-db-relationships.md](./warehouse-db-relationships.md) — centralized logical database ownership and relationship rules
- [../plans/warehouse-microservices-rollout-plan.md](../plans/warehouse-microservices-rollout-plan.md) — master rollout and sequencing plan for warehouse microservices
- [docs/plans](../plans) — implementation plans for past/in-flight features
- [.github/copilot-instructions.md](../../.github/copilot-instructions.md) — repo-wide conventions for AI agents (and a useful quick-start for humans too)
