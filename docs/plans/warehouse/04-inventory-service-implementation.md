# Inventory Service Implementation

This document plans the implementation of `Ikho.WarehouseInventory`, the stock system of record for the platform.

## Goals

1. Own on-hand, available, reserved, and non-sellable stock state.
2. Support both lot tracking and serial tracking.
3. Maintain a stock ledger for every quantity-affecting operation.
4. Provide reservation and release capabilities for outbound execution.

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

1. `StockItem`
2. `StockBalance`
3. `StockLedgerEntry`
4. `Lot`
5. `SerialNumber`
6. `StockReservation`
7. `InventoryAdjustment`
8. `CycleCount`
9. `CycleCountLine`

## Database Scope

The Inventory database is the only source of truth for stock state. Other services may store stock snapshots, but they must not own the mutable stock truth.

## Initial API Surface

1. Receive stock commands from Inbound.
2. Put away stock into warehouse locations.
3. Reserve stock for outbound orders.
4. Release stock reservations.
5. Adjust stock.
6. Start and complete cycle counts.
7. Query inventory by product, warehouse, bin, lot, or serial.

## Events

Publishes:

1. `InventoryReceived`
2. `PutawayCompleted`
3. `StockReserved`
4. `StockReleased`
5. `StockAdjusted`
6. `CycleCountCompleted`

Consumes:

1. `ProductCreated`
2. `ProductUpdated`
3. `ProductTrackingPolicyChanged`
4. `WarehouseCreated`
5. `BinCreated`
6. `BinStatusChanged`

## Execution Steps

1. Define stock identity and quantity model.
2. Define lot and serial semantics.
3. Define ledger mutation rules and invariants.
4. Implement receive, putaway, reserve, release, and adjust flows.
5. Implement product and location projection consumers.
6. Publish stock events for downstream services.

## Dependencies

1. Foundation and platform plan complete.
2. Organization service available.
3. Catalog service available.

## Verification

1. Every stock-changing command creates ledger history.
2. Lot-controlled and serial-controlled products are enforced correctly.
3. Reservation behavior correctly impacts available stock without corrupting on-hand stock.
4. Inventory queries can filter by warehouse, bin, lot, and serial.

## Out Of Scope

1. Advanced replenishment optimization.
2. Automated slotting rules.
3. Inventory valuation unless separately planned.
