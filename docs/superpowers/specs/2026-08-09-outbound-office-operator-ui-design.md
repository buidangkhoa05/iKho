# Outbound UI — Office Console & Operator Mode

Part 2 of the [Warehouse Operations Console UI rollout](../../plans/warehouse-ui-rollout-plan.md) (Inbound → Outbound → Returns → Reporting).

## Context

Inbound (Part 1) shipped a real Office/Operator UI backed by a mutable mock `InboundStore`, replacing placeholder screens. Outbound is next: the backend (`ikho-warehouse-outbound`) exposes `SalesOrders` (create/get/list), `Allocations` (`POST /sales-orders/{id}/allocate` — whole-order, reserves stock, fails with `InsufficientStock` if any line can't be covered), and `Shipments` (`POST /sales-orders/{id}/dispatch` — whole-order, creates a shipment, fails with `NotAllocated` if the order isn't allocated first). Unlike Inbound's `Receipts` endpoint (line-by-line), both `Allocate` and `Dispatch` operate on the entire sales order at once — there is no partial-line concept in this domain.

The frontend still shows Outbound as a generic placeholder (`OfficeGenericScreen` in Office Console, `OperatorOutlinedScreen` in Operator Mode) with aspirational bullet copy. That copy, and the existing `ADMIN_SCREENS.outbound` mock data, both imply a line-by-line "Picking" stage between Allocated and Dispatched (the mock already has a `'Picking'` status label distinct from `'Allocated'`/`'Dispatched'`, and `tasks.data.ts`'s `STATIC_TASKS` has a stubbed, non-interactive `PIK-3318` "Pick" task left over from Inbound's Part 1 — explicitly noted there as "Outbound's future work"). This spec deliberately does **not** build that stage (see Non-goals) — a discovery made during brainstorming, before any mock data was touched, unlike Inbound where the equivalent putaway-stage mismatch was only found during implementation planning.

## Goals

Replace the placeholder Outbound screens with real, purpose-built screens for both tracks: Office Console owns sales-order creation and allocation (planning/back-office decisions); Operator Mode owns dispatch confirmation (the physical warehouse-floor action) — mirroring how Inbound split dock-receiving (operator, physical) from purchase-order creation (office, planning).

## Non-goals

- **No picking stage.** Despite the mock data's `'Picking'` status and the stubbed `PIK-3318` task, this UI goes straight from Allocated to Dispatched, matching the backend's actual two-action model exactly. The `PIK-3318` static task is retired (see Operator Mode section) rather than extended.
- Real `HttpClient` wiring (future integration plan, same as Inbound).
- Backend changes. `Allocate`'s insufficient-stock conflict and `Dispatch`'s not-allocated conflict are real backend behaviors this UI surfaces as-is — no backend work needed.
- A reusable Modal/Dialog component — "Create sales order" is an inline expandable panel, same as Inbound's "Create purchase order".

## Office Console — Outbound screen

Route: `/office/outbound`. Built as a dedicated `OfficeOutbound` component (composing the shared `OfficeScreen` shell) instead of `OfficeGenericScreen`, reusing `ADMIN_SCREENS.outbound`'s existing tab structure (`main` = Sales orders, `allocations` = Allocations, `shipments` = Shipments) rather than redefining it — same approach Inbound took with its three existing tabs.

- **`detailedTabId: 'main'`** on the Sales orders tab — search, the shared status-filter chips, and the detail panel, matching Inbound/Inventory/Catalogue.
- **Detail panel**: SO header (customer, dock, cut-off, status badge) + one field per line (product name → allocated/ordered qty) + a shipment-history summary line once dispatched.
- **Allocate action**: for an order not yet allocated, the detail panel gets an "Allocate" button. This requires a small additive extension to the shared `OfficeDetailPanel` interface — an optional `action?: { label: string; onClick: () => void }` field, rendered as a button at the panel's bottom — following the same low-risk, backward-compatible pattern as Inbound's `OfficeScreen.primaryAction` output (existing consumers that don't set it are unaffected). Clicking it calls `OutboundStore.allocate(soId)`, which can fail with an insufficient-stock message, surfaced inline (no silent success).
- **Primary action** "Create sales order": inline form (not a modal) — customer + dock text fields, dynamic line rows (SKU + quantity), validated against `PRODUCTS` exactly like Inbound's create-PO form. Mock submit prepends a new row to the `main` tab as an unallocated order.

## Operator Mode — Outbound flow

Two views, replacing `OperatorOutlinedScreen` for the `outbound` screen id:

1. **Entry list** (`/operator/outbound`): task-queue cards, visually matching the pattern established by `OperatorInboundEntry` — one card per allocated-but-not-dispatched sales order (SO id, customer, dock, cut-off). Tap opens the dispatch-confirm screen.
2. **Dispatch confirm** (`/operator/outbound/dispatch/:soId`): shows the order's lines (product, allocated qty) and a single "Confirm dispatch" action — no stepper, since there's no picking stage to step through. Confirming calls `OutboundStore.dispatch(soId)`, which can fail with a not-allocated conflict (defensive; shouldn't be reachable from this queue but mirrors the backend), generates a shipment record on success, and returns to the entry list.

**Operator Dashboard integration**: the task queue's `STATIC_TASKS`-sourced `PIK-3318` "Pick" entry is removed (it represented the descoped picking stage). In its place, the dashboard merges in dispatch-ready orders from `OutboundStore` — the same pattern Inbound's Task 13 used for putaway tasks — so tapping a dispatch-ready card from the dashboard routes to the same `/operator/outbound/dispatch/:soId` screen as the dedicated entry list.

## Mock data & testing

- New `sales-orders.data.ts` (mirrors `purchase-orders.data.ts`'s convention): `SalesOrder`/`SalesOrderLine` types with per-line detail (SKU, product name, ordered/allocated qty) — replacing `ADMIN_SCREENS.outbound.main`'s current aggregate-only inline rows, the same gap Inbound hit and fixed for purchase orders.
- New `OutboundStore` service (`providedIn: 'root'`, mutable signals): `salesOrders`, `allocations`, `shipments`; methods `createSalesOrder`, `allocate(soId)`, `dispatch(soId)` (can fail — not allocated). Same shape and immutability discipline as `InboundStore`.
- **Allocate's insufficient-stock rule**: for each line, compare its ordered quantity against that SKU's `qty` field in the existing `PRODUCTS` mock (on-hand quantity). If any line's ordered qty exceeds the product's `qty`, allocation fails with an insufficient-stock message naming the offending SKU(s) — mirroring the real backend's per-product check. `PRODUCTS.qty` is read-only here (not decremented on allocation) to avoid coupling `OutboundStore` to catalogue/inventory mock state it doesn't own — a real stock-decrement model is future Inventory-domain work, out of scope for this spec.
- `ADMIN_SCREENS.outbound`'s `main`/`allocations`/`shipments` tab rows wired to the store, same as Inbound's Task 5.
- Tests: colocated `.spec.ts` per component and the store, following the exact conventions established in Inbound (`TestBed` + `fixture.componentInstance`, plain-object `Router` provider stubs for navigation, direct `new OutboundStore()` construction for store tests since it has no injected dependencies).
