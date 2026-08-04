# Outbound Service Implementation

This document plans the implementation of `Ikho.WarehouseOutbound`, the service that owns fulfillment workflow.

## Goals

1. Manage sales-order-driven warehouse fulfillment.
2. Allocate and release stock through Inventory.
3. Support picking, packing, and shipment workflows.

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

1. `SalesOrder`
2. `SalesOrderLine`
3. `Allocation`
4. `PickWave`
5. `PickTask`
6. `PackingOrder`
7. `Package`
8. `Shipment`

## Database Scope

The Outbound database stores fulfillment workflow state. It does not own stock truth, partner master data, or product master data.

## Initial API Surface

1. Create and update sales orders.
2. Request inventory allocation.
3. Release or reallocate inventory.
4. Create pick waves and pick tasks.
5. Complete picking and packing.
6. Create and dispatch shipments.
7. Query fulfillment status by order or shipment.

## Events

Publishes:

1. `SalesOrderCreated`
2. `AllocationRequested`
3. `AllocationConfirmed`
4. `PickWaveCreated`
5. `PickCompleted`
6. `PackageCreated`
7. `ShipmentDispatched`

Consumes:

1. `CustomerCreated`
2. `CustomerUpdated`
3. `ProductCreated`
4. `ProductUpdated`
5. `WarehouseCreated`
6. `StockReserved`
7. `StockReleased`

## Execution Steps

1. Define sales order and fulfillment aggregates.
2. Capture product and customer snapshots.
3. Integrate allocation and release commands with Inventory.
4. Add pick, pack, and shipment flows.
5. Publish shipment events for Billing, Returns, and Reporting.

## Dependencies

1. Foundation and platform plan complete.
2. Organization service available.
3. Catalog service available.
4. Partner service available.
5. Inventory service reservation interface available.

## Verification

1. Allocation requests and releases stay consistent with Inventory responses.
2. Shipment creation is traceable from order through package level.
3. Published shipment events include enough context for Billing and Returns.

## Out Of Scope

1. Route optimization.
2. Carrier marketplace integration.
3. Advanced wave planning heuristics.
