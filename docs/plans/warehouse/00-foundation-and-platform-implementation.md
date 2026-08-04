# Foundation And Platform Implementation

This document defines the cross-cutting platform work that should be completed before the warehouse services are implemented in earnest. It exists to prevent each service from inventing its own routing, observability, schema, and messaging patterns.

## Objectives

1. Standardize service creation and naming.
2. Extend the API Gateway for multi-service routing.
3. Define shared event and contract governance.
4. Establish baseline observability, health checks, and authentication scaffolding.
5. Choose transaction-to-event publishing patterns before Inventory, Inbound, and Outbound are built.

## Planned Deliverables

1. Service naming convention finalized around `Ikho.Warehouse*`.
2. New .NET service templates or conventions for future warehouse services.
3. Gateway route and cluster naming pattern documented and ready for incremental adoption.
4. Shared service bootstrapping guidance for configuration, middleware, DI, and health endpoints.
5. Schema folder plan under `source/libs/ikho-schema-management/schemas/domains/`.
6. Outbox and consumer idempotency strategy.

## Execution Steps

1. Define the standard service layout, following **Vertical Slice Architecture** (mandatory
   for every `Ikho.Warehouse*` service — see
   [csharp.instructions.md](../../../.github/instructions/csharp.instructions.md) and
   [warehouse-service-template.md](../../architecture/warehouse-service-template.md)).
   - `Program.cs`
   - `Features/{Feature}/` — each feature owns its endpoint, service, repository, DTOs, and
     validator; no `Controllers/`, `Services/`, or `Repositories/` layer folders
   - `Shared/` for cross-cutting service-local concerns
   - `Domain/` for shared domain/value types
   - configuration and launch settings
2. Define a gateway routing pattern.
   - `/api/warehouse/catalog/*`
   - `/api/warehouse/inventory/*`
   - `/api/warehouse/inbound/*`
3. Define service configuration sections.
   - database connection strings
   - message broker settings
   - auth configuration placeholders
   - retry and timeout policy defaults
4. Standardize middleware order.
   - correlation ID
   - request logging
   - CORS
   - authentication and authorization
   - rate limiting
5. Choose an event transport and delivery contract.
6. Define the outbox record shape and publisher workflow.
7. Define consumer idempotency rules and dead-letter handling expectations.
8. Define health check and readiness endpoint standards.
9. Define versioned schema conventions for warehouse APIs and events.

## Dependencies

1. Existing `Ikho.ApiGateway` routing model.
2. Existing `Ikho.SchemaManagement` generation rules.
3. Decision on message broker technology.

## Verification

1. A new warehouse service can be scaffolded with the agreed structure without rediscovery.
2. Gateway route naming is consistent across at least three planned services.
3. Contract folder naming is documented and matches code generation rules.
4. Health checks, logging, and correlation behavior are specified consistently.

## Out Of Scope

1. Full production hosting strategy.
2. Identity provider selection and final auth enforcement.
3. Concrete business endpoints for any specific service.
