# Partner Service Implementation

This document plans the implementation of `Ikho.WarehousePartner`, the service that owns supplier and customer master data.

## Goals

1. Centralize supplier and customer identity.
2. Provide reusable address and contact models.
3. Publish partner facts needed by inbound, outbound, returns, billing, and reporting.

## Owned Entities

1. `Supplier`
2. `Customer`
3. `Address`
4. `Contact`

## Database Scope

The Partner database stores partner identity and relationship data only. It does not store purchase orders, sales orders, invoices, or returns.

## Initial API Surface

1. Create and update supplier.
2. Create and update customer.
3. Manage addresses and contacts.
4. Query partners by ID or code.
5. Validate partner status for operational workflows.

## Events

Publishes:

1. `SupplierCreated`
2. `SupplierUpdated`
3. `CustomerCreated`
4. `CustomerUpdated`
5. `PartnerStatusChanged`

Consumes:

1. None required for the first slice.

## Execution Steps

1. Define `Supplier` and `Customer` aggregates.
2. Add address and contact sub-entities.
3. Expose partner validation endpoints.
4. Publish partner lifecycle events.
5. Align snapshot requirements with inbound, outbound, and billing documents.

## Dependencies

1. Foundation and platform plan complete.

## Verification

1. Supplier and customer lookups return operationally useful snapshot fields.
2. Status changes are reflected in partner validation endpoints.
3. Published partner events are sufficient for reporting projections.

## Out Of Scope

1. CRM workflows.
2. Credit scoring.
3. Sales territory management.
