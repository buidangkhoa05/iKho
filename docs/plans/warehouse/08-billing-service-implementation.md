# Billing Service Implementation

This document plans the implementation of `Ikho.WarehouseBilling`, the service that owns warehouse-adjacent financial documents when billing is kept inside iKho.

## Goals

1. Create invoice and credit note boundaries aligned with warehouse events.
2. Preserve financial snapshots independent of later changes in partner or product data.
3. Consume receipt and shipment facts without introducing cross-database joins.

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

1. `Invoice`
2. `InvoiceLine`
3. `CreditNote`
4. `Payment`

## Database Scope

The Billing database stores financial documents and snapshots. If billing later moves to an external ERP, this service may become an integration boundary instead of a source of truth.

## Initial API Surface

1. Issue invoices from approved operational facts.
2. Create credit notes.
3. Query invoice and credit-note status.
4. Record payment status if that remains in scope.

## Events

Publishes:

1. `InvoiceIssued`
2. `CreditNoteIssued`
3. `PaymentStatusChanged`

Consumes:

1. `ReceiptCompleted`
2. `ShipmentDispatched`
3. `ReturnReceived`
4. `DispositionCompleted`

## Execution Steps

1. Clarify whether billing is authoritative inside iKho.
2. Define invoice and credit-note aggregate rules.
3. Capture required operational snapshots from inbound, outbound, and returns events.
4. Publish billing events for reporting.

## Dependencies

1. Foundation and platform plan complete.
2. Stable events from Inbound, Outbound, and Returns.

## Verification

1. Billing documents can be produced without live joins to partner, product, or order services.
2. Invoice lines preserve commercial facts even if source master data changes later.
3. Billing events can feed reporting projections without additional lookups.

## Out Of Scope

1. General ledger.
2. Tax engine integration.
3. Full ERP replacement scope.
