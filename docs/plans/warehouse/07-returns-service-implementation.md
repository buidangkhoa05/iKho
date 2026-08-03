# Returns Service Implementation

This document plans the implementation of `Ikho.WarehouseReturns`, the service that owns return workflows and disposition decisions.

## Goals

1. Manage customer and supplier return workflows.
2. Capture inspection results and disposition outcomes.
3. Coordinate restock, quarantine, scrap, or vendor return outcomes with Inventory and Reporting.

## Owned Entities

1. `ReturnOrder`
2. `ReturnOrderLine`
3. `ReturnReceipt`
4. `Inspection`
5. `Disposition`

## Database Scope

The Returns database stores reverse-logistics workflow state. It does not own stock truth or invoice issuance.

## Initial API Surface

1. Create return orders.
2. Register return receipts.
3. Capture inspection outcomes.
4. Confirm disposition actions.
5. Query return status by source order or shipment.

## Events

Publishes:

1. `ReturnOrderCreated`
2. `ReturnReceived`
3. `InspectionCompleted`
4. `DispositionCompleted`

Consumes:

1. `ShipmentDispatched`
2. `CustomerCreated`
3. `SupplierCreated`
4. `ProductCreated`

## Execution Steps

1. Define return order and inspection aggregates.
2. Decide whether customer and supplier returns share one workflow model or differ internally.
3. Integrate disposition outcomes with Inventory commands.
4. Publish completion events for Billing and Reporting.

## Dependencies

1. Foundation and platform plan complete.
2. Catalog service available.
3. Partner service available.
4. Inventory service command interface available.
5. Outbound shipment events available.

## Verification

1. Returns can trace back to source shipment or source partner context.
2. Disposition outcomes trigger the correct downstream inventory effect.
3. Restock and quarantine are represented as distinct operational outcomes.

## Out Of Scope

1. Warranty decisioning.
2. Refund approval workflow.
3. Repair center operations.
