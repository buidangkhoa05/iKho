# Contracts And Events Implementation

This document plans the versioned API and event contract work that underpins the warehouse microservices rollout.

## Goals

1. Define consistent versioned API and event schemas for warehouse services.
2. Keep generated contracts aligned with service boundaries.
3. Prevent contract drift during parallel service development.

## Contract Naming Strategy

Use capability-specific domain folders under `source/libs/ikho-schema-management/schemas/domains/`.

Recommended structure:

```text
schemas/domains/warehouse-organization/{api|events}/v1/
schemas/domains/warehouse-catalog/{api|events}/v1/
schemas/domains/warehouse-partner/{api|events}/v1/
schemas/domains/warehouse-inventory/{api|events}/v1/
schemas/domains/warehouse-inbound/{api|events}/v1/
schemas/domains/warehouse-outbound/{api|events}/v1/
schemas/domains/warehouse-returns/{api|events}/v1/
schemas/domains/warehouse-billing/{api|events}/v1/
schemas/domains/warehouse-reporting/{api|events}/v1/
```

This keeps generated namespaces aligned with service boundaries while staying compatible with the existing schema generator rules.

## First-Wave Contracts

### Organization

1. `CreateWarehouseRequest`
2. `WarehouseResponse`
3. `BinResponse`
4. `WarehouseCreated`
5. `BinStatusChanged`

### Catalog

1. `CreateProductRequest`
2. `ProductResponse`
3. `ProductCreated`
4. `ProductUpdated`
5. `ProductStatusChanged`
6. `ProductTrackingPolicyChanged`
7. `CategoryCreated`, `CategoryUpdated`
8. `BrandCreated`, `BrandUpdated`

### Partner

1. `CreateSupplierRequest`
2. `SupplierResponse`
3. `CreateCustomerRequest`
4. `CustomerCreated`

### Inventory

1. `ReceiveInventoryCommand`
2. `ReserveStockCommand`
3. `ReleaseStockCommand`
4. `InventoryBalanceResponse`
5. `InventoryReceived`
6. `StockReserved`

### Inbound

1. `CreatePurchaseOrderRequest`
2. `CompleteReceiptRequest`
3. `ReceiptResponse`
4. `ReceiptCompleted`
5. `PutawayTaskCompleted`

### Outbound

1. `CreateSalesOrderRequest`
2. `RequestAllocationCommand`
3. `ShipmentResponse`
4. `AllocationConfirmed`
5. `ShipmentDispatched`

## Execution Steps

1. Create capability-specific schema folders.
2. Define v1 API contracts for early services.
3. Define v1 event contracts for master data and stock flows.
4. Generate C# contracts and commit them.
5. Reference generated contracts from future services.
6. Add validation in CI to detect schema or generated-code drift.

## Dependencies

1. Foundation and platform plan complete.
2. Service names and boundary decisions stable.

## Verification

1. Schema files generate contracts into predictable namespaces.
2. Service plans and contracts use consistent names.
3. Version folders remain major-only and immutable after merge.

## Out Of Scope

1. Detailed payload definitions for every later feature.
2. Non-warehouse schemas.
