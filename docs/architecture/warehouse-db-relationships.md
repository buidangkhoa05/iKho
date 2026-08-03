# Warehouse Database Relationships

This document centralizes logical database relationships for the warehouse microservices architecture. It does not define one shared physical schema. Instead, it records ownership, permitted reference styles, and cross-service dependency patterns so future implementation work stays consistent with database-per-service boundaries.

## Why This Document Exists

Warehouse systems are relationship-heavy, but microservices do not work well when those relationships are implemented as cross-database joins. This document provides the central source of truth for:

1. Which service owns each entity.
2. Which services may reference each entity.
3. How those references are allowed to work.
4. What data should be copied as snapshots.

## Global Rules

1. Each transactional table belongs to exactly one service database.
2. No service may write directly to another service's database.
3. No cross-service foreign keys are allowed.
4. Cross-service joins are replaced by ID references, snapshots, APIs, or event-driven read models.
5. Reporting projections may combine data from multiple services, but only inside the Reporting database.

## Service Database Overview

| Service | Database Purpose | Typical Storage |
|---|---|---|
| `Ikho.WarehouseOrganization` | Physical structure and warehouse master data | Company, Warehouse, Zone, Aisle, Bin, Dock |
| `Ikho.WarehouseCatalog` | Product master and classification data | Product, Category, Brand, UOM, Variant, Barcode |
| `Ikho.WarehousePartner` | Supplier and customer master data | Supplier, Customer, Address, Contact |
| `Ikho.WarehouseInventory` | Stock truth and movement history | Stock balance, ledger, lot, serial, reservation, count |
| `Ikho.WarehouseInbound` | Inbound workflow and receiving records | Purchase order, ASN, receipt, putaway task |
| `Ikho.WarehouseOutbound` | Outbound workflow and shipping records | Sales order, allocation, pick, pack, shipment |
| `Ikho.WarehouseReturns` | Reverse logistics and return resolution | Return order, inspection, disposition |
| `Ikho.WarehouseBilling` | Financial snapshots and documents | Invoice, credit note, payment |
| `Ikho.WarehouseReporting` | Cross-service projections and KPIs | Read models and aggregates |

## Ownership Matrix

| Entity | Owning Service | Referencing Services | Recommended Reference Style |
|---|---|---|---|
| Company | Organization | Catalog, Partner, Inventory, Inbound, Outbound, Returns, Billing, Reporting | ID |
| Warehouse | Organization | Inventory, Inbound, Outbound, Returns, Reporting | ID + snapshot |
| Bin | Organization | Inventory, Inbound, Outbound, Reporting | ID + validation API |
| Product | Catalog | Inventory, Inbound, Outbound, Returns, Billing, Reporting | ID + SKU + snapshot |
| Category | Catalog | Reporting | Event projection |
| Brand | Catalog | Reporting | Event projection |
| Supplier | Partner | Inbound, Returns, Billing, Reporting | ID + snapshot |
| Customer | Partner | Outbound, Returns, Billing, Reporting | ID + snapshot |
| StockBalance | Inventory | Outbound, Reporting | API + event projection |
| Lot | Inventory | Inbound, Outbound, Returns, Reporting | ID + event projection |
| SerialNumber | Inventory | Inbound, Outbound, Returns, Reporting | ID + event projection |
| StockReservation | Inventory | Outbound, Reporting | API + event projection |
| PurchaseOrder | Inbound | Billing, Reporting | ID + snapshot + events |
| Receipt | Inbound | Inventory, Billing, Reporting | Command/event boundary |
| PutawayTask | Inbound | Inventory, Reporting | Command/event boundary |
| SalesOrder | Outbound | Billing, Reporting | ID + snapshot + events |
| Shipment | Outbound | Billing, Returns, Reporting | ID + snapshot + events |
| ReturnOrder | Returns | Inventory, Billing, Reporting | ID + snapshot + events |
| Invoice | Billing | Reporting | Event projection |

## Reference Patterns

### ID-Only References

Use ID-only references when the consuming service only needs identity and does not need to render or validate detailed data during normal workflows.

Examples:

1. Inventory storing `WarehouseId`.
2. Reporting storing `CompanyId` alongside projections.

### ID Plus Snapshot References

Use an ID plus snapshot when the consumer must preserve business-readable data even if the source record changes later.

Examples:

1. Outbound `SalesOrderLine` stores `ProductId`, `Sku`, `ProductNameSnapshot`.
2. Inbound `PurchaseOrder` stores `SupplierId`, `SupplierCodeSnapshot`, `SupplierNameSnapshot`.
3. Billing `InvoiceLine` stores commercial snapshots captured at issue time.

### Validation API References

Use live API validation when the command must rely on current state owned by another service.

Examples:

1. Inbound validating that `WarehouseId` and `DockId` are active before receipt creation.
2. Inventory validating product tracking policy if that policy is not already projected locally.

### Event-Driven Projection References

Use event-driven projections when the consumer needs queryable local data but does not own the source entity.

Examples:

1. Reporting projects product, shipment, and invoice facts.
2. Inventory projects selected product metadata needed for stock control.
3. Outbound projects available stock summaries for allocation decisions if direct synchronous dependence becomes too expensive.

## Logical Relationships By Service

### Organization Database

Owns:

1. `Company`
2. `Warehouse`
3. `Zone`
4. `Aisle`
5. `Bin`
6. `Dock`

Internal logical relationships:

1. `Company` 1:N `Warehouse`
2. `Warehouse` 1:N `Zone`
3. `Zone` 1:N `Aisle`
4. `Aisle` 1:N `Bin`
5. `Warehouse` 1:N `Dock`

### Catalog Database

Owns:

1. `Product`
2. `Category`
3. `Brand`
4. `UnitOfMeasure`
5. `ProductVariant`
6. `Barcode`

Internal logical relationships:

1. `Category` 1:N `Product`
2. `Brand` 1:N `Product`
3. `Product` 1:N `ProductVariant`
4. `Product` 1:N `Barcode`

### Partner Database

Owns:

1. `Supplier`
2. `Customer`
3. `Address`
4. `Contact`

Internal logical relationships:

1. `Supplier` 1:N `Address`
2. `Supplier` 1:N `Contact`
3. `Customer` 1:N `Address`
4. `Customer` 1:N `Contact`

### Inventory Database

Owns:

1. `StockItem`
2. `StockBalance`
3. `StockLedgerEntry`
4. `Lot`
5. `SerialNumber`
6. `StockReservation`
7. `InventoryAdjustment`
8. `CycleCount`
9. `CycleCountLine`

Internal logical relationships:

1. `StockItem` 1:N `StockLedgerEntry`
2. `StockItem` 1:N `StockReservation`
3. `CycleCount` 1:N `CycleCountLine`
4. `Lot` 1:N `StockItem`
5. `SerialNumber` 1:1 `StockItem` for serialized units

### Inbound Database

Owns:

1. `PurchaseOrder`
2. `PurchaseOrderLine`
3. `AdvancedShippingNotice`
4. `Receipt`
5. `ReceiptLine`
6. `PutawayTask`

Internal logical relationships:

1. `PurchaseOrder` 1:N `PurchaseOrderLine`
2. `PurchaseOrder` 1:N `Receipt`
3. `Receipt` 1:N `ReceiptLine`
4. `ReceiptLine` 1:N `PutawayTask`

### Outbound Database

Owns:

1. `SalesOrder`
2. `SalesOrderLine`
3. `Allocation`
4. `PickWave`
5. `PickTask`
6. `PackingOrder`
7. `Package`
8. `Shipment`

Internal logical relationships:

1. `SalesOrder` 1:N `SalesOrderLine`
2. `SalesOrderLine` 1:N `Allocation`
3. `PickWave` 1:N `PickTask`
4. `PackingOrder` 1:N `Package`
5. `Shipment` 1:N `Package`

### Returns Database

Owns:

1. `ReturnOrder`
2. `ReturnOrderLine`
3. `ReturnReceipt`
4. `Inspection`
5. `Disposition`

Internal logical relationships:

1. `ReturnOrder` 1:N `ReturnOrderLine`
2. `ReturnOrder` 1:N `ReturnReceipt`
3. `ReturnReceipt` 1:N `Inspection`
4. `Inspection` 1:1 `Disposition`

### Billing Database

Owns:

1. `Invoice`
2. `InvoiceLine`
3. `CreditNote`
4. `Payment`

Internal logical relationships:

1. `Invoice` 1:N `InvoiceLine`
2. `Invoice` 1:N `Payment`
3. `CreditNote` N:1 `Invoice`

### Reporting Database

Owns:

1. `InventoryPositionReadModel`
2. `InboundStatusReadModel`
3. `OutboundStatusReadModel`
4. `FulfillmentKpiReadModel`
5. Any future dashboard-specific projections

Reporting may create relationships across projected read models because it is not a source-of-truth database.

## Cross-Service Relationship Matrix

| Consumer | Needs Data From | Purpose | Preferred Mechanism |
|---|---|---|---|
| Inventory | Catalog | Product tracking policy, SKU metadata | Event projection + fallback API |
| Inventory | Organization | Warehouse and bin validation | API + local cache |
| Inbound | Partner | Supplier validation and snapshots | API at creation time |
| Inbound | Catalog | Product validation and snapshots | API at creation time |
| Inbound | Organization | Receiving location validation | API at command time |
| Inbound | Inventory | Receipt-to-stock commands | Synchronous command or event workflow |
| Outbound | Partner | Customer validation and snapshots | API at creation time |
| Outbound | Catalog | Product validation and snapshots | API at creation time |
| Outbound | Inventory | Availability, reservation, release | Synchronous API + events |
| Returns | Outbound | Shipment context for returns | Snapshot + event projection |
| Returns | Inventory | Restock or quarantine effects | Commands/events |
| Billing | Inbound | Financial receipt facts | Event projection |
| Billing | Outbound | Shipment and order facts | Event projection |
| Reporting | All services | Analytics and operational dashboards | Events only |

## Example Snapshot Strategy

To avoid cross-service joins, transactional services should snapshot the business fields they must preserve.

Examples:

1. `PurchaseOrderLine`
   - `ProductId`
   - `SkuSnapshot`
   - `ProductNameSnapshot`
   - `OrderedUomSnapshot`
2. `SalesOrderLine`
   - `ProductId`
   - `SkuSnapshot`
   - `ProductNameSnapshot`
3. `InvoiceLine`
   - `CustomerId`
   - `CustomerNameSnapshot`
   - `SourceOrderId`
   - `ProductId`
   - `SkuSnapshot`

## Anti-Patterns To Avoid

1. Sharing one `Products` table across Catalog, Inventory, and Outbound.
2. Joining `StockBalance` directly from Outbound into Inventory's database.
3. Reading live partner names in Billing instead of storing snapshots.
4. Letting Reporting become a backdoor source of truth.
5. Splitting tiny entity-level microservices such as Category-only or Brand-only services.

## Related Documents

1. [warehouse-domain-model.md](./warehouse-domain-model.md)
2. [../plans/warehouse-microservices-rollout-plan.md](../plans/warehouse-microservices-rollout-plan.md)
