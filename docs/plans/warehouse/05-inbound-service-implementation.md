# Inbound Service Implementation

This document plans the implementation of `Ikho.WarehouseInbound`, the service that owns receiving workflow.

## Goals

1. Manage purchase-order-driven receiving and ASN workflows.
2. Record receipts and receipt lines before stock becomes available.
3. Initiate putaway work and hand off stock commands to Inventory.

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

1. `PurchaseOrder`
2. `PurchaseOrderLine`
3. `AdvancedShippingNotice`
4. `Receipt`
5. `ReceiptLine`
6. `PutawayTask`

## Database Scope

The Inbound database stores inbound workflow history. It does not own stock balances or product master data.

## Initial API Surface

1. Create and update purchase orders.
2. Receive ASN notifications.
3. Start and complete receipts.
4. Create and complete putaway tasks.
5. Query inbound status by purchase order or receipt.

## Events

Publishes:

1. `PurchaseOrderCreated`
2. `PurchaseOrderApproved`
3. `ReceiptStarted`
4. `ReceiptCompleted`
5. `PutawayTaskCreated`
6. `PutawayTaskCompleted`

Consumes:

1. `SupplierCreated`
2. `SupplierUpdated`
3. `ProductCreated`
4. `ProductUpdated`
5. `WarehouseCreated`
6. `DockCreated` or equivalent location events

## Execution Steps

1. Define purchase order and receipt aggregates.
2. Implement supplier, product, and warehouse validation during order and receipt creation.
3. Capture required product and supplier snapshots.
4. Integrate receipt completion with Inventory receive commands.
5. Create putaway workflows and publish completion events.

## Dependencies

1. Foundation and platform plan complete.
2. Organization service available.
3. Catalog service available.
4. Partner service available.
5. Inventory service command interface available.

## Verification

1. Receipt completion drives stock creation in Inventory through the chosen integration pattern.
2. Purchase orders preserve partner and product snapshots.
3. Putaway status is traceable from receipt through Inventory handoff.

## Out Of Scope

1. Procurement approval matrix.
2. Supplier portal.
3. Freight cost accounting.
