# Returns UI — Office Console & Operator Mode

Part 3 of the [Warehouse Operations Console UI rollout](../../plans/warehouse-ui-rollout-plan.md) (Inbound → Outbound → Returns → Reporting).

## Context

Inbound and Outbound both shipped real Office/Operator UIs backed by mutable mock stores (`InboundStore`, `OutboundStore`), replacing placeholder screens. Returns is next: the backend (`ikho-warehouse-returns`) exposes `ReturnOrders` (create/get/list, with a `Type` of `CustomerReturn` or `SupplierReturn`), `ReturnReceipts` (`POST /return-orders/{id}/receipt` — confirms physical arrival), `Inspections` (`POST` per line — records `Good`/`Damaged`/`Defective`), and `Dispositions` (`POST` per line — records `Restock`/`Quarantine`/`Scrap`/`VendorReturn`, with a required bin for `Restock`/`Quarantine`). `ReturnOrder.Status` progresses `Created → Received → Inspected → Dispositioned`, where the latter two states mean "every line has an outcome recorded."

The backend genuinely tracks Inspection and Disposition **per line**. This UI deliberately does not follow that: it models both as **whole-order** actions (one inspection result, one disposition outcome, applied to every line at once), matching Outbound's whole-order Allocate/Dispatch rather than Inbound's line-by-line Receipts. This is a conscious simplification, not a discovered constraint — see Non-goals.

The frontend already carries a fairly detailed placeholder for Returns (`ADMIN_SCREENS.returns` in `admin-screens.data.ts`) with three tabs — Return orders, Inspections, Dispositions — and mock rows shaped close to the real domain (RMA ids, SKUs from the shared `PRODUCTS` catalogue, disposition outcomes). That existing shape is reused rather than redesigned, the same way Outbound reused its own placeholder's tab structure.

## Goals

Replace the placeholder Returns screens with real, purpose-built screens for both tracks: Office Console owns return-order creation and review (planning/back-office decisions); Operator Mode owns the three physical/decision steps — Receive, Inspect, Disposition — mirroring how Inbound split dock-receiving from PO creation and Outbound split dispatch from SO creation/allocation.

## Non-goals

- **No line-level inspection/disposition.** Despite the backend modeling both per-line, this UI records one inspection result and one disposition outcome per whole order — consistent with Outbound's whole-order model, not Inbound's line-by-line one. A future revision could split this out if a real per-line UI is needed.
- **No combined inspect+disposition step.** These stay as two separate Operator actions/screens, matching the backend's own `Inspected`/`Dispositioned` status distinction and giving each step its own audit moment.
- Real `HttpClient` wiring (future integration plan, same as Inbound/Outbound).
- Backend changes. The disposition-outcome-gated-by-inspection-result rule is a UI-level business rule this spec introduces for the mock (see Mock data & testing) — it is not a real backend endpoint behavior being surfaced, since the actual `Dispositions` endpoint doesn't enforce it.
- A reusable Modal/Dialog component — "Log return" is an inline expandable panel, same as Inbound's "Create purchase order" / Outbound's "Create sales order".
- Supplier-return-specific backend plumbing beyond the UI's own mock data — `Type: SupplierReturn` is modeled and selectable, but there's no real Partner/supplier service integration (same mock-data-only scope as everything else here).

## Office Console — Returns screen

Route: `/office/returns`. Built as a dedicated `OfficeReturns` component (composing the shared `OfficeScreen` shell) instead of `OfficeGenericScreen`, reusing `ADMIN_SCREENS.returns`'s existing three-tab structure (`main` = Return orders, `inspections` = Inspections, `dispositions` = Dispositions).

- **`detailedTabId: 'main'`** on the Return orders tab — search, status-filter chips, and the detail panel, matching Inbound/Outbound.
- **Detail panel**: order header (partner name, type, source reference, status badge) + one field per line (product name → qty, reason code) + inspection result and disposition outcome once recorded. No action button — Office creates and reviews only; all three physical/decision steps live in Operator Mode.
- **Primary action** "Log return": inline form (not a modal). A Type toggle (Customer return / Supplier return) switches the source-reference field's label between "Original SO" and "Original PO"; partner-name text field; dynamic line rows (SKU + quantity + a reason-code **select**, not free text — `Damaged` / `WrongItem` / `Defective` / `CustomerCancelled` / `NoLongerNeeded`), validated against `PRODUCTS` exactly like Inbound/Outbound's create forms. Mock submit prepends a new row to the `main` tab in `Created` status.

## Operator Mode — Returns flow

Two views, replacing `OperatorOutlinedScreen` for the `returns` screen id:

1. **Entry list** (`/operator/returns`): one screen, three grouped sections — "To receive" (status `Created`), "To inspect" (status `Received`), "To disposition" (status `Inspected`) — each a card list in the same visual style as `OperatorInboundEntry`'s dual-section screen. Tapping a card routes to that stage's confirm screen.
2. **Receive confirm** (`/operator/returns/receive/:rma`): order summary + line list + a single "Confirm receipt" action. No data entry. Calls `ReturnsStore.receive(rma)`, moving status to `Received`.
3. **Inspect confirm** (`/operator/returns/inspect/:rma`): order summary + line list + a three-way choice (Good / Damaged / Defective) instead of a single button. Calls `ReturnsStore.inspect(rma, result)`, recording the result and moving status to `Inspected`.
4. **Disposition confirm** (`/operator/returns/disposition/:rma`): order summary + line list + an outcome choice filtered by the recorded inspection result (`Good` → Restock only; `Damaged`/`Defective` → Quarantine / Scrap / VendorReturn). A bin text input — prefilled from the order's product `PRODUCTS.bin`, editable, same `linkedSignal` pattern as Inbound's putaway bin edit — appears only when Restock or Quarantine is selected. Calls `ReturnsStore.disposition(rma, outcome, bin?)`, which can fail if the outcome doesn't match the gate (defensive; shouldn't be reachable from this screen's own filtered choices, but mirrors Outbound's insufficient-stock defensive check), records a `Disposition` row, and moves status to `Dispositioned`.

**Operator Dashboard integration**: the task queue gains a third source alongside putaway tasks and dispatch-ready orders — return orders not yet `Dispositioned`, one card per order labeled with its next action (Receive/Inspect/Disposition) and routed to the matching confirm screen. This reuses the `navTarget: string[]` generalization Outbound's dashboard task already established — no further refactor needed there.

## Mock data & testing

- New `return-orders.data.ts` (mirrors `sales-orders.data.ts`'s convention): `ReturnOrder`/`ReturnOrderLine` types — `ReturnOrder` carries `rma`, `type: 'customer' | 'supplier'`, `partnerName`, `sourceRef`, `status`, `inspectionResult?`, `dispositionOutcome?`, `dispositionBin?`, and `lines: ReturnOrderLine[]`; `ReturnOrderLine` carries `sku`, `productName`, `qty`, `reasonCode`. Replaces `ADMIN_SCREENS.returns.main`'s current inline rows.
- New `inspections.data.ts` / `dispositions.data.ts` (mirror `allocations.data.ts`/`shipments.data.ts`'s convention) — append-only records created by the store's `inspect()`/`disposition()` methods, feeding the Inspections/Dispositions tabs.
- New `ReturnsStore` service (`providedIn: 'root'`, mutable signals): `returnOrders`, `inspections`, `dispositions`; methods `createReturnOrder`, `receive(rma)`, `inspect(rma, result)`, `disposition(rma, outcome, bin?)` (can fail — outcome not valid for the recorded inspection result). Same shape and immutability discipline as `InboundStore`/`OutboundStore`.
- **Disposition-gated-by-inspection rule**: `disposition()` rejects an outcome that isn't in the allowed set for the order's `inspectionResult` (`Good` → `{Restock}`; `Damaged`/`Defective` → `{Quarantine, Scrap, VendorReturn}`), returning an error naming the mismatch — same `{ ok: false, error }` shape and plain-`string`-error precedent as Outbound's `AllocateResult`/`DispatchResult`.
- `ADMIN_SCREENS.returns`'s `main`/`inspections`/`dispositions` tab rows wired to the store, same as Outbound's Task 6.
- Tests: colocated `.spec.ts` per component and the store, following the exact conventions established in Inbound/Outbound (`TestBed` + `fixture.componentInstance`, plain-object `Router` provider stubs for navigation, direct `new ReturnsStore()` construction for store tests). Store spec covers create/receive/inspect/disposition-success/disposition-rejected-by-rule. Component specs cover the create form (including the Customer/Supplier type toggle), the three grouped entry sections, and each confirm screen's success and rejection path.
