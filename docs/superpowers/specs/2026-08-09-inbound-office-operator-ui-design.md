# Inbound UI — Office Console & Operator Mode

Part 1 of the [Warehouse Operations Console UI rollout](../../plans/warehouse-ui-rollout-plan.md) (Inbound → Outbound → Returns → Reporting).

## Context

`ikho-ui` is currently a static, mock-data-driven prototype — every screen, including the already-built Catalogue and Inventory screens, uses in-memory mock data and `LangService` (en/vi) rather than any real backend call. There is no `HttpClient` usage anywhere in the app yet. The Inbound backend (`ikho-warehouse-inbound`) already exposes `PurchaseOrders` (create/get/list) and `Receipts` (create/complete/get/list against a PO), but the frontend only shows Inbound as a generic placeholder screen (`OfficeGenericScreen` in Office Console, `OperatorOutlinedScreen` in Operator Mode) with aspirational bullet copy.

## Goals

Replace those placeholders with real, purpose-built Inbound screens for both tracks — matching the fidelity of the existing Inventory/Catalogue screens — so Purchase Orders and Receipts become a usable, reviewable UI.

## Non-goals

- Wiring to the real backend API (`HttpClient`, DTO mapping, error/loading states). That is intentionally deferred to a separate future integration plan, since it's a foundational, app-wide concern, not specific to Inbound.
- Changing the backend to support over/under exception receiving or a separate putaway-task workflow. The real `Receipts` endpoint today rejects any quantity exceeding a PO line's ordered quantity and always assigns the bin at receipt time — the UI below models a richer flow than the backend supports today; that gap is intentional (see design principle below), not something this spec resolves.
- Barcode/scanner hardware integration, label printing, push notifications.
- A reusable Modal/Dialog component in `@ikho/shared-ui`. No screen in the app has a working primary action yet, so the "Create purchase order" form is built as an inline expandable panel within the Inbound screen, not a modal.

## Revision note (post-brainstorm reconciliation)

Two decisions below revise what was originally approved during brainstorming, after implementation planning turned up pre-existing (uncommitted) prototype data that the original design didn't account for:

1. **Putaway is a separate step**, not combined with dock receiving. `ADMIN_SCREENS.inbound` already ships a "Putaway tasks" tab, and `tasks.data.ts` already has `PUT-` entries feeding the Operator dashboard's task queue. Rather than discard that already-wired data, receiving becomes two steps: dock receipt (quantity + exceptions, no bin) → a generated putaway task (assign bin, confirmed separately).
2. **Office tabs follow the existing `ADMIN_SCREENS.inbound` structure** (Purchase orders / Receipts / Putaway tasks) instead of the PO-status tabs (Draft/Open/Partially Received/…) originally proposed — the existing mock data already models it this way, and status is instead conveyed via the `StockStatus` badge vocabulary already used on each row (`in-stock`/`inbound`/`low-stock`/etc.), consistent with how Inventory and Catalogue do it.

## Design principle: UX ahead of the backend

The UI is designed for good warehouse UX, not constrained to what the real backend currently supports (since this phase is mock-data only, nothing is actually blocked by backend limits). Concretely, this means the receiving flow supports over/under quantity entry with an exception reason, even though the real `Receipts` API would currently reject an over-receipt. When the future integration plan wires this up for real, the over-receipt path may need backend work or may get scoped down — noted here as a known gap, not resolved by this spec.

## Office Console — Inbound screen

Route: `/office/inbound`. Built as a dedicated `OfficeInbound` component (like `OfficeInventory`/`OfficeCatalogue`, composing the shared `OfficeScreen` list+detail shell) instead of `OfficeGenericScreen`. Reuses the existing `ADMIN_SCREENS.inbound` data as-is (KPIs: Open orders, Receiving now, Short receipts, Overdue; tabs: `main` = Purchase orders, `receipts` = Receipts, `putaway` = Putaway tasks) rather than redefining it.

- **`detailedTabId: 'main'`** on the Purchase orders tab — gets search, the shared status-filter chips, and the detail panel, same as Inventory/Catalogue. `receipts` and `putaway` stay plain tables (no detail drawer), matching how Inventory treats its `ledger`/`lots`/`adjustments` tabs.
- **Detail panel** (on PO row click, via `OfficeDetailPanel`): PO header (supplier, dock, ETA, status badge) + line table (SKU, expected, received, remaining) + a receipt-history sub-list drawn from `RECEIPTS` filtered by `po`.
- **Primary action** "Create purchase order": clicking it expands an inline form panel above the table (not a modal) with supplier + warehouse pickers and dynamic line rows (product, quantity, add/remove line). Mock submit prepends a new row to the `main` tab's in-memory data as `inbound`/"Expected" and collapses the form.
- Exceptions logged during operator dock-receiving (qty ≠ expected, with a reason) show as a flagged row in the `receipts` tab (reusing the existing `low-stock` "Short" status styling) — no new KPI invented; "Short receipts" already covers this.

## Operator Mode — Inbound flow

Replaces `OperatorOutlinedScreen` for the `inbound` screen id with two steps, matching the existing two-step data model (dock receipt, then a separately-tracked putaway task):

1. **Receiving entry list** (`/operator/inbound`): task-queue cards, visually matching `OperatorDashboard`'s task-card pattern — one card per open/partially-received PO at the operator's warehouse (PO id, supplier, dock, remaining lines/qty). Tap opens the dock-receiving flow.
2. **Dock-receiving flow** (new component): line-by-line stepper for the selected PO, no bin assignment.
   - Current line shown large: product name, SKU, expected vs. already-received qty.
   - Operator enters received quantity; lot number / expiration / serial numbers appear only when the product's catalogue tracking policy requires them (`Product.tracking` in the mock catalogue data).
   - If entered quantity ≠ remaining expected qty, an exception banner appears (using the existing status-color vocabulary) and a short reason (damaged, short-shipped, etc.) is required before "Confirm line" is enabled.
   - Advances to the next line; a summary screen at the end lists everything received this session. Confirming appends a new `putaway` task per received line to `tasks.data.ts` (kind: Putaway, from: the PO's dock, to: a suggested bin) and returns to the entry list with that PO's state updated (fully "Received" at the dock if complete).
3. **Putaway confirmation** (new component, `/operator/inbound/putaway/:taskId`): shown for a single putaway task — product, quantity, from (dock), suggested bin (editable). Confirming removes the task from the queue. Reachable both from the Inbound entry list (a "Putaway" sub-tab/filter alongside the receiving queue) and from `OperatorDashboard`'s existing task cards — the dashboard's task card gets a click handler that routes `PUT-`-kind tasks here (other kinds, e.g. `PIK-` Pick tasks, are Outbound's future work and stay non-interactive for now).

## Mock data & testing

- Reuse the existing flat, display-oriented mock shapes already established (`ADMIN_SCREENS.inbound`'s `main`/`receipts`/`putaway` rows, `RECEIPTS` in `receipts.data.ts`, `OperatorTask` in `tasks.data.ts`) rather than introducing DTO-shaped mocks — this phase is UI-only, so matching the codebase's existing display-row convention takes priority over anticipating the future real-API shape.
- Extend `receipts.data.ts` with per-line detail (currently `RECEIPTS` only has receipt-level rows) so the Office detail panel and Operator dock-receiving flow have line-level data to work with.
- Extend `tasks.data.ts` so `OperatorTask` can represent a putaway task with the fields the putaway confirmation screen needs (from/to bin, source PO).
- Catalogue tracking policy reuses `Product.tracking` from the existing `products.data.ts` rather than inventing a new source of truth.
- Tests: colocated `.spec.ts` per component — this repo has no existing Angular component test yet (`app.spec.ts` is the Nx-generated default), so these establish the first real convention: `TestBed.configureTestingModule` + `fixture.componentInstance`, asserting on rendered output and computed signals. Cover status-tab filtering, exception detection (qty ≠ remaining), the receiving stepper's line-advance logic, and the putaway task list/confirm flow.
