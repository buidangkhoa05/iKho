# Organization Service Implementation

This document plans the implementation of `Ikho.WarehouseOrganization`, the service that owns the warehouse operating structure and physical location hierarchy.

## Goals

1. Create the authoritative source for companies, warehouses, zones, aisles, bins, and docks.
2. Provide location validation to Inventory, Inbound, and Outbound.
3. Publish warehouse structure events needed for downstream projections.

## Owned Entities

1. `Company`
2. `Warehouse`
3. `Zone`
4. `Aisle`
5. `Bin`
6. `Dock`

## Database Scope

The Organization database should only contain warehouse structure and activation state. It should not store inventory balances, orders, or shipments.

## Initial API Surface

1. Create and update company.
2. Create and update warehouse.
3. Create and update zones, aisles, bins, and docks.
4. Activate and deactivate physical locations.
5. Query location hierarchy by warehouse.
6. Validate a bin or dock for operational use.

## Events

Publishes:

1. `CompanyCreated`
2. `WarehouseCreated`
3. `WarehouseStatusChanged`
4. `BinCreated`
5. `BinStatusChanged`

Consumes:

1. None required for the first slice.

## Execution Steps

1. Define aggregate boundaries for warehouse hierarchy.
2. Create basic CRUD endpoints for company and warehouse.
3. Add nested location management for zone, aisle, bin, and dock.
4. Add validation endpoints used by downstream services.
5. Publish structure change events.

## Dependencies

1. Foundation and platform plan complete.

## Verification

1. Location hierarchy can be created and queried end-to-end.
2. Inactive bins are rejected by validation endpoints.
3. Structure-change events include stable identifiers for downstream services.

## Out Of Scope

1. Advanced slotting optimization.
2. Labor planning.
3. Yard management.
