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
    }

    Rel(user, ui, "Uses", "HTTPS")
    Rel(ui, sharedui, "Imports components from", "TS import")
    Rel(ui, gateway, "Calls /api/*", "HTTPS/JSON (dev: via proxy.conf.json)")
    Rel(gateway, api, "Forwards /api/* to shared-library-cluster", "HTTP/JSON")
    Rel(api, schema, "References generated contracts from", "Project reference")
```

| Container | Path | Port(s) |
|---|---|---|
| `ikho-ui` | [source/apps/ikho-ui](../../source/apps/ikho-ui) | 4200 (dev) |
| `ikho-shared-ui` | [source/libs/ikho-shared-ui](../../source/libs/ikho-shared-ui) | — (library, not deployed standalone) |
| `Ikho.ApiGateway` | [source/apps/ikho-api-gateway](../../source/apps/ikho-api-gateway) | 5080 / 7080 |
| `Ikho.SharedLibrary` | [source/libs/ikho-shared-library](../../source/libs/ikho-shared-library) | 5143 / 7270 |
| `Ikho.SchemaManagement` | [source/libs/ikho-schema-management](../../source/libs/ikho-schema-management) | — (build-time codegen, not a running service) |

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
- [docs/plans](../plans) — implementation plans for past/in-flight features
- [.github/copilot-instructions.md](../../.github/copilot-instructions.md) — repo-wide conventions for AI agents (and a useful quick-start for humans too)
