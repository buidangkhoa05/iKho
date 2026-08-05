# Warehouse Microservices Rollout Plan

This document is the master planning reference for the warehouse management domain in iKho. It defines service boundaries, execution order, architecture rules, and the set of future implementation plans that should be executed over time.

The target architecture is a capability-based microservices platform behind the existing API Gateway. Each service owns its own database and communicates with other services through APIs, IDs, snapshots, and versioned events. Direct cross-database joins and foreign keys are out of bounds.

## Goals

1. Build warehouse management capabilities incrementally without collapsing back into a shared database.
2. Establish clear bounded contexts so entity ownership remains unambiguous.
3. Use the existing `Ikho.ApiGateway` as the single entry point for the frontend and external clients.
4. Use `Ikho.SchemaManagement` to version API and event contracts before broad service integration starts.
5. Keep implementation plans small enough to execute slice-by-slice without rediscovery.

## Scope

The initial planning scope covers these warehouse capabilities:

1. Organization
2. Catalog
3. Partner
4. Inventory
5. Inbound
6. Outbound
7. Returns
8. Billing
9. Reporting

The planning assumptions currently in effect are:

1. Both lot tracking and serial tracking are required.
2. The system supports multi-company and multi-warehouse operation.
3. Outbound demand may originate from internal workflows and external integrations.
4. The current priority is domain model clarity, API skeletons, database ownership, and event contracts.

## Service Topology

The recommended service naming convention uses warehouse-qualified service names to avoid ambiguity as the platform grows beyond warehouse workflows.

| Capability | Proposed Service | Primary Responsibility | Execution Priority |
|---|---|---|---|
| Identity / Access | `Ikho.Identity` | Users, roles, authentication, authorization | Existing / separate concern |
| Organization | `Ikho.WarehouseOrganization` | Companies, warehouses, location hierarchy | Early |
| Catalog | `Ikho.WarehouseCatalog` | Product master data and classification | Early |
| Partner | `Ikho.WarehousePartner` | Suppliers, customers, contacts, addresses | Early |
| Inventory | `Ikho.WarehouseInventory` | Stock truth, lot, serial, reservations, ledger | Core |
| Inbound | `Ikho.WarehouseInbound` | ASN, purchase receiving, putaway | Core |
| Outbound | `Ikho.WarehouseOutbound` | Allocation, picking, packing, shipment | Core |
| Returns | `Ikho.WarehouseReturns` | Reverse logistics, inspection, disposition | Later |
| Billing | `Ikho.WarehouseBilling` | Invoices, credit notes, financial snapshots | Later |
| Reporting | `Ikho.WarehouseReporting` | Read models, projections, analytics | Later |

## Architecture Rules

1. Each service owns one database and is the only writer to that database.
2. Each business entity has exactly one owning service.
3. Cross-service relationships use IDs, denormalized snapshots, synchronous lookups, or asynchronous events.
4. No direct foreign keys across service databases.
5. Distributed transactions are not allowed between services.
6. Services publishing integration events should use an outbox pattern.
7. Reporting is projection-only and does not own transactional truth.
8. Shared schemas belong in `source/libs/ikho-schema-management` and use major versions only.
9. Every independently deployable .NET service belongs in `source/apps/`. Libraries consumed by
   multiple services (cross-cutting concerns, codegen) belong in `source/libs/`. Never place a
   runnable microservice under `source/libs/`.
10. Every service is built using **Vertical Slice Architecture** — features live under
   `Features/{Feature}/`, owning their endpoint, service, repository, DTOs, and validator; no
   `Controllers/`, `Services/`, or `Repositories/` layer folders. See
   [csharp.instructions.md](../../.github/instructions/csharp.instructions.md) and
   [warehouse-service-template.md](../architecture/warehouse-service-template.md) for the
   standard layout and `Ikho.SharedLibrary` bootstrap.

## Recommended Execution Order

The service implementation documents should be executed in dependency order.

### Phase 0: Foundation

1. Establish service template conventions.
2. Expand API Gateway routing patterns.
3. Define contract folders and schema governance.
4. Standardize correlation IDs, request logging, health checks, and auth scaffolding.
5. Choose event publishing and consumption patterns.

### Phase 1: Master Data Services

1. `Ikho.WarehouseOrganization`
2. `Ikho.WarehouseCatalog`
3. `Ikho.WarehousePartner`

These services can progress in parallel after the foundation work is complete.

### Phase 2: Stock System Of Record

1. `Ikho.WarehouseInventory`

Inventory must be established before inbound and outbound flows can stabilize because it owns the ledger, availability, lot, serial, and reservation model.

### Phase 3: Operational Flow Services

1. `Ikho.WarehouseInbound`
2. `Ikho.WarehouseOutbound`

Inbound depends on Organization, Catalog, Partner, and Inventory. Outbound depends on Organization, Catalog, Partner, and Inventory, and should follow once allocation and reservation semantics are stable.

### Phase 4: Secondary Transaction Services

1. `Ikho.WarehouseReturns`
2. `Ikho.WarehouseBilling`

These can progress once the forward operational flows are sufficiently stable.

### Phase 5: Read Models And Analytics

1. `Ikho.WarehouseReporting`

Reporting should be implemented after event contracts are stable enough to avoid churn in projections.

## Core Entity Ownership Summary

| Service | Core Aggregates |
|---|---|
| `Ikho.WarehouseOrganization` | Company, Warehouse, Zone, Aisle, Bin, Dock |
| `Ikho.WarehouseCatalog` | Product, Category, Brand, ProductVariant, Barcode, UnitOfMeasure |
| `Ikho.WarehousePartner` | Supplier, Customer, Address, Contact |
| `Ikho.WarehouseInventory` | StockItem, StockBalance, StockLedgerEntry, Lot, SerialNumber, StockReservation, InventoryAdjustment, CycleCount |
| `Ikho.WarehouseInbound` | PurchaseOrder, PurchaseOrderLine, AdvancedShippingNotice, Receipt, ReceiptLine, PutawayTask |
| `Ikho.WarehouseOutbound` | SalesOrder, SalesOrderLine, Allocation, PickWave, PickTask, PackingOrder, Package, Shipment |
| `Ikho.WarehouseReturns` | ReturnOrder, ReturnOrderLine, ReturnReceipt, Inspection, Disposition |
| `Ikho.WarehouseBilling` | Invoice, InvoiceLine, CreditNote, Payment |
| `Ikho.WarehouseReporting` | InventoryPositionReadModel, InboundStatusReadModel, OutboundStatusReadModel, FulfillmentKpiReadModel |

See [../architecture/warehouse-domain-model.md](../architecture/warehouse-domain-model.md) for entity relationships and [../architecture/warehouse-db-relationships.md](../architecture/warehouse-db-relationships.md) for ownership and reference rules.

## Integration Style

Use synchronous APIs for:

1. Commands that mutate the owning aggregate.
2. Validation lookups where fresh state is required.
3. Administrative or back-office querying inside the owning service.

Use asynchronous events for:

1. State propagation across service boundaries.
2. Reporting projections.
3. Notifications of stock movement, receiving, shipment, return, and billing state changes.

Representative event families:

1. `ProductCreated`, `ProductUpdated`, `ProductStatusChanged`
2. `SupplierCreated`, `CustomerCreated`
3. `WarehouseCreated`, `BinActivated`
4. `InventoryReceived`, `PutawayCompleted`
5. `StockReserved`, `StockReleased`, `StockAdjusted`
6. `PickCompleted`, `ShipmentDispatched`
7. `ReturnReceived`, `DispositionCompleted`
8. `InvoiceIssued`, `CreditNoteIssued`

## Planned Document Set

This rollout plan is supported by the following detailed implementation documents:

1. [warehouse/00-foundation-and-platform-implementation.md](./warehouse/00-foundation-and-platform-implementation.md)
2. [warehouse/01-organization-service-implementation.md](./warehouse/01-organization-service-implementation.md)
3. [warehouse/02-catalog-service-implementation.md](./warehouse/02-catalog-service-implementation.md)
4. [warehouse/03-partner-service-implementation.md](./warehouse/03-partner-service-implementation.md)
5. [warehouse/04-inventory-service-implementation.md](./warehouse/04-inventory-service-implementation.md)
6. [warehouse/05-inbound-service-implementation.md](./warehouse/05-inbound-service-implementation.md)
7. [warehouse/06-outbound-service-implementation.md](./warehouse/06-outbound-service-implementation.md)
8. [warehouse/07-returns-service-implementation.md](./warehouse/07-returns-service-implementation.md)
9. [warehouse/08-billing-service-implementation.md](./warehouse/08-billing-service-implementation.md)
10. [warehouse/09-reporting-service-implementation.md](./warehouse/09-reporting-service-implementation.md)
11. [warehouse/10-contracts-and-events-implementation.md](./warehouse/10-contracts-and-events-implementation.md)

## Progress Checklist

Use this checklist to track execution progress across the full warehouse rollout. Update it as work starts, completes, or is intentionally deferred.

### Planning Baseline

- [x] Master rollout plan created
- [x] Warehouse domain model documented
- [x] Centralized database relationship document created
- [x] Service-by-service implementation plans created
- [x] Architecture entrypoint updated
- [x] API Gateway planning document updated
- [x] Schema management guidance updated

### Foundation And Platform

- [x] Finalize service naming and repository conventions
- [x] Define service bootstrap/template for future warehouse services
- [x] Define gateway route and cluster naming conventions
- [x] Decide message broker for integration events
- [x] Define outbox pattern and event publishing workflow
- [x] Define consumer idempotency and retry policy
- [x] Standardize health checks, readiness checks, and logging
- [ ] Define warehouse schema folder structure under `Ikho.SchemaManagement`

### Master Data Services

- [x] Implement `Ikho.WarehouseOrganization`
- [x] Implement `Ikho.WarehouseCatalog`
- [x] Implement `Ikho.WarehousePartner`
- [x] Publish initial master-data events
- [ ] Validate downstream snapshot requirements

### Core Stock Platform

- [ ] Implement `Ikho.WarehouseInventory`
- [ ] Finalize lot tracking rules
- [ ] Finalize serial tracking rules
- [ ] Implement reservation and release flow
- [ ] Validate stock ledger invariants

### Operational Services

- [ ] Implement `Ikho.WarehouseInbound`
- [ ] Integrate inbound receipt flow with Inventory
- [ ] Implement `Ikho.WarehouseOutbound`
- [ ] Integrate outbound allocation flow with Inventory
- [ ] Validate shipment and putaway event contracts

### Secondary Services

- [ ] Implement `Ikho.WarehouseReturns`
- [ ] Integrate return disposition flow with Inventory
- [ ] Implement `Ikho.WarehouseBilling`
- [ ] Confirm billing source-of-truth boundary

### Reporting And Contracts

- [ ] Create v1 warehouse API schemas
- [ ] Create v1 warehouse event schemas
- [ ] Generate contracts from warehouse schemas
- [ ] Implement `Ikho.WarehouseReporting`
- [ ] Build first operational read models

### Final Readiness

- [ ] Verify each entity has a single owning service
- [ ] Verify no cross-service foreign keys or direct DB joins exist
- [ ] Verify gateway routes match service ownership boundaries
- [ ] Verify core integrations are evented or explicitly synchronous by design
- [ ] Verify architecture documents still match implemented topology

## Open Questions

These questions remain important but do not block the planning documents:

1. What inventory valuation model will be required, if any?
2. Are expiration dates and FEFO allocation required for lot-controlled items?
3. Will unit-of-measure conversion be authoritative inside Catalog or Inventory?
4. Is Billing an internal source of truth or an integration boundary to ERP?
5. What message broker will be used for cross-service events?
