# Reporting Service Implementation

This document plans the implementation of `Ikho.WarehouseReporting`, the service that owns cross-service read models and analytics.

## Goals

1. Build query-oriented projections across warehouse services.
2. Avoid turning reporting into a transactional dependency.
3. Support operational dashboards and later KPI expansion.

## Architecture

This service follows **Vertical Slice Architecture** (mandatory for all `Ikho.Warehouse*`
services — see [csharp.instructions.md](../../../.github/instructions/csharp.instructions.md)
and [warehouse-service-template.md](../../architecture/warehouse-service-template.md)):

1. Each feature lives under `Features/{Feature}/`, owning its endpoint, service, repository,
   request/response DTOs, and validator — no `Controllers/`, `Services/`, or `Repositories/`
   layer folders.
2. Cross-cutting/local concerns live in `Shared/`; shared domain types live in `Domain/`.
3. Bootstraps via `Ikho.SharedLibrary` (`AddServiceDefaults<TDbContext>()` /
   `UseServiceDefaults()`) for correlation ids, request logging, health checks, outbox
   publishing, and idempotency.

## Owned Entities

1. `InventoryPositionReadModel`
2. `InboundStatusReadModel`
3. `OutboundStatusReadModel`
4. `FulfillmentKpiReadModel`
5. Additional dashboard projections as needed

## Database Scope

The Reporting database stores denormalized read models rebuilt from events. It should never be the source of truth for operational workflows.

## Initial API Surface

1. Query inventory position dashboards.
2. Query inbound operational status.
3. Query outbound operational status.
4. Query warehouse KPI summaries.

## Events

Consumes:

1. Organization events
2. Catalog events
3. Partner events
4. Inventory events
5. Inbound events
6. Outbound events
7. Returns events
8. Billing events

Publishes:

1. None required initially.

## Execution Steps

1. Define the first set of read models and dashboards.
2. Subscribe to core operational events.
3. Build projection rebuild and replay capability.
4. Expose read-only APIs optimized for UI and analytics consumers.

## Dependencies

1. Foundation and platform plan complete.
2. Stable event contracts from upstream services.

## Verification

1. Reporting APIs do not call transactional services during normal reads.
2. Read models can be rebuilt from historical events.
3. Projection lag and failure handling are observable.

## Out Of Scope

1. Direct transactional writes.
2. Ad hoc BI tooling.
3. Long-term data lake strategy.
