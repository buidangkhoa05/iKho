# Inbound UI — Office Console & Operator Mode

Part 1 of the [Warehouse Operations Console UI rollout](../../plans/warehouse-ui-rollout-plan.md) (Inbound → Outbound → Returns → Reporting).

## Context

`ikho-ui` is currently a static, mock-data-driven prototype — every screen, including the already-built Catalogue and Inventory screens, uses in-memory mock data and `LangService` (en/vi) rather than any real backend call. There is no `HttpClient` usage anywhere in the app yet. The Inbound backend (`ikho-warehouse-inbound`) already exposes `PurchaseOrders` (create/get/list) and `Receipts` (create/complete/get/list against a PO), but the frontend only shows Inbound as a generic placeholder screen (`OfficeGenericScreen` in Office Console, `OperatorOutlinedScreen` in Operator Mode) with aspirational bullet copy.

## Goals

Replace those placeholders with real, purpose-built Inbound screens for both tracks — matching the fidelity of the existing Inventory/Catalogue screens — so Purchase Orders and Receipts become a usable, reviewable UI.

## Non-goals

- Wiring to the real backend API (`HttpClient`, DTO mapping, error/loading states). That is intentionally deferred to a separate future integration plan, since it's a foundational, app-wide concern, not specific to Inbound.
- Changing the backend to support over/under exception receiving or a separate putaway-task workflow. The real `Receipts` endpoint today rejects any quantity exceeding a PO line's ordered quantity and always assigns the bin at receipt time (no separate putaway task).
- Barcode/scanner hardware integration, label printing, push notifications.

## Design principle: UX ahead of the backend

The UI is designed for good warehouse UX, not constrained to what the real backend currently supports (since this phase is mock-data only, nothing is actually blocked by backend limits). Concretely, this means the receiving flow supports over/under quantity entry with an exception reason, even though the real `Receipts` API would currently reject an over-receipt. When the future integration plan wires this up for real, the over-receipt path may need backend work or may get scoped down — noted here as a known gap, not resolved by this spec.

## Office Console — Inbound screen

Route: `/office/inbound`. Built like `OfficeInventory` (composes the shared `OfficeScreen` list+detail shell) instead of `OfficeGenericScreen`.

- **KPIs**: Open POs, Due today/overdue, Received this week, Exceptions pending review. "Due today/overdue" needs an expected-delivery date, which the real `PurchaseOrder` DTO doesn't have today (only `CreatedOnUtc`) — the mock PO shape adds an `expectedDate` field for this, another UX-ahead-of-backend item alongside over/under receiving.
- **Tabs**, matching `PurchaseOrder.Status`: Draft, Open, Partially Received, Received, Cancelled, plus an "All" tab as the searchable/detailed one (`detailedTabId`, same pattern as Inventory).
- **Table columns**: PO number, Supplier, Warehouse, Line count, Ordered qty, Received qty, Status, Created date.
- **Detail panel** (on row click, via `OfficeDetailPanel`): PO header (supplier, warehouse, created date, status badge) + line table (SKU, product name, ordered, received, remaining) + a receipt-history sub-list (receipt id, date, lines received, exception notes if any).
- **Primary action** "Create purchase order": form with supplier + warehouse pickers and dynamic line rows (product, quantity). Mock submit appends to the in-memory PO list as Draft/Open.
- Exceptions surfaced by operator receiving (over/under) show as a flagged badge in the receipt history and roll into the "Exceptions pending review" KPI.

## Operator Mode — Inbound flow

Replaces `OperatorOutlinedScreen` for the `inbound` screen id with two views:

1. **Entry list** (`/operator/inbound`): task-queue cards reusing `OperatorDashboard`'s task-card visual pattern — one card per open/partially-received PO at the operator's warehouse (PO id, supplier, dock, remaining lines/qty). Tap opens the receiving flow.
2. **Receiving flow** (new component): line-by-line stepper for the selected PO.
   - Current line shown large: product name, SKU, ordered vs. already-received qty, suggested bin.
   - Operator enters received quantity and bin; lot number / expiration / serial numbers appear only when the product's catalogue policy requires them.
   - If entered quantity ≠ remaining ordered qty, an exception banner appears (using the existing status-color vocabulary) and a short reason (damaged, short-shipped, etc.) is required before "Confirm line" is enabled.
   - Advances to the next line; a summary screen at the end lists everything received this session, then returns to the entry list with that PO's state updated (fully "Received" if complete).

## Mock data & testing

- New mock data files following existing conventions: `purchase-orders.data.ts`, `receipts.data.ts`, shaped like the real `PurchaseOrderResponse` / `ReceiptResponse` DTOs (plus the mock-only `expectedDate` field noted above) so a future swap to real API data is mechanical.
- Add an `ADMIN_SCREENS.inbound` entry (KPIs/tabs) alongside the existing `inventory` entry.
- Extend the existing operator `tasks.data.ts` pattern for the Inbound task queue.
- Catalogue policy (lot/serial required per product) reuses/extends the existing catalogue mock rather than inventing a new source of truth.
- Tests: colocated `.spec.ts` per component, following house style. Cover status-tab filtering, exception detection (qty ≠ remaining), and the receiving stepper's line-advance logic.
