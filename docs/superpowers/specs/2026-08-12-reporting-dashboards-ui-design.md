# Reporting/Dashboards UI — Office Console

Part 4 (final) of the [Warehouse Operations Console UI rollout](../../plans/warehouse-ui-rollout-plan.md) (Inbound → Outbound → Returns → Reporting).

## Context

Inbound, Outbound, and Returns each shipped real Office/Operator UIs backed by mutable mock stores, replacing placeholder screens that map fairly directly onto their backend's own domain model. Reporting is different in kind: the backend (`ikho-warehouse-reporting`) is a pure read-model service — `FulfillmentKpiReadModel` (daily counters: `TotalReceiptsCompleted`/`TotalShipmentsDispatched`/`TotalAllocationsConfirmed`, with a `/kpis/range` endpoint returning day-by-day rows), `InventoryPositionReadModel` (per `(ProductId, WarehouseId)`: on-hand/reserved/quarantine/damaged, with `AvailableQuantity` computed as the remainder), `InboundStatusReadModel` (per-`PurchaseOrderId` receipt/putaway counts), `OutboundStatusReadModel` (per-`SalesOrderId` allocation/shipment counts) — all rebuilt incrementally from Kafka events and **deliberately never joined against other services' databases** (every cross-service reference is an opaque GUID). This UI's `ReportingStore` mirrors that architecture: it is genuinely independent mock data, not derived from `InboundStore`/`OutboundStore`/`ReturnsStore`.

The current placeholder (`ADMIN_SCREENS.reporting`) is a meta-list — "here are our 4 reports and when they last refreshed" plus a "Scheduled exports" tab — describing the reporting *pipeline*, not showing the actual read-model data. This spec replaces it with the real thing. `screens.data.ts`'s existing `reporting` entry is already `roles: ['admin']` only, with bullet copy stating "Office Console only, never on a handheld" — Reporting has no Operator Mode counterpart, and that's a pre-existing decision this spec doesn't revisit.

## Goals

Turn `/office/reporting` into a real dashboard: KPI tiles and a 7-day trend chart backed by `FulfillmentKpiReadModel`-shaped data, plus three status tables backed by `InventoryPositionReadModel`/`InboundStatusReadModel`/`OutboundStatusReadModel`-shaped data.

## Non-goals

- **No live derivation from other stores.** `ReportingStore` owns independent seed data, matching the real backend's own "never joins other services" architecture. (Reusing `PRODUCTS`/PO/SO id strings purely as display labels — the same way Outbound/Returns already reference `PRODUCTS` for names — is shared catalog reference data, not cross-service operational derivation, and is fine.)
- **No interactive date-range picker.** A fixed 7-day window is baked into the seed data. A real range control would need a new shared date-picker component this app doesn't have yet — out of scope.
- **No "Scheduled exports" tab.** The current placeholder's export-schedule list is decorative flavor text unconnected to any of the 4 real read models; dropped rather than carried forward for its own sake.
- **No "Build report" primary action.** Reporting is a pure read surface — nothing here is created or mutated, so `OfficeReporting` has no primary action button (unlike every other module's office screen).
- **No new shared chart library or dependency.** The trend chart is a single, self-contained inline-SVG component scoped to the `office/reporting` feature folder — not promoted to `@ikho/shared-ui`, since no other module needs a chart.
- **No modification to the shared `OfficeScreen` component.** `OfficeScreen` has no slot for arbitrary content (like a chart) between its KPI row and its tabs, and it's used by five other screens — rather than extend it for one consumer, `OfficeReporting` composes its own layout directly from the same primitives `OfficeScreen` itself uses internally (`lib-kpi-card`, `lib-data-panel`, `lib-data-table`), without wrapping in `<app-office-screen>`.

## Data model & `ReportingStore`

Four new mock-data files, each independent seed data shaped after the corresponding read model, using display-friendly fields:

- `fulfillment-kpis.data.ts`: `FulfillmentKpiDay { date: string; receipts: number; shipments: number; allocations: number }` — a 7-entry array (oldest to newest). The last entry is "today"; both the KPI tiles and the trend chart read from this one array.
- `inventory-positions.data.ts`: `InventoryPosition { sku, productName, warehouse, onHand, reserved, quarantine, damaged, available, status: StockStatus }` — `available` and `status` are precomputed directly into each seed row (matching the existing `PRODUCTS` mock's own convention of storing `status` rather than deriving it live), not a computed getter.
- `inbound-status.data.ts`: `InboundStatusRow { po, warehouse, receiptsCompleted, putawayCompleted, lastReceiptOn }`.
- `outbound-status.data.ts`: `OutboundStatusRow { so, warehouse, allocationsConfirmed, shipmentsDispatched, lastShipmentOn }`.

`ReportingStore` (`providedIn: 'root'`) exposes `fulfillmentKpis`, `inventoryPositions`, `inboundStatuses`, `outboundStatuses` as plain readonly signals seeded from the four files above. No mutation methods — there is no user-triggered action anywhere on this screen that changes state, so a full `InboundStore`/`OutboundStore`/`ReturnsStore`-style store with guarded transitions doesn't apply here; this is a simpler, read-only service.

## Office Console — `OfficeReporting` screen

Route: `/office/reporting`, replacing `OfficeGenericScreen` for the `reporting` screen id (same swap pattern as every prior module).

Layout, top to bottom:
1. **Header** — title/meta, same visual treatment as other screens, no primary action button.
2. **KPI row** — 4 `lib-kpi-card` tiles, all genuinely computed from `ReportingStore`'s own data rather than static placeholders: Receipts today, Shipments today, Allocations today (all three read off `fulfillmentKpis`' last entry), and SKUs at zero available (`inventoryPositions.filter(p => p.available <= 0).length`).
3. **`FulfillmentTrendChart`** — see below.
4. **Three tabs**, each a `lib-data-panel` + `lib-data-table` pair (no detail panel, no search/filter chips — this screen doesn't need `OfficeScreen`'s row-selection machinery since there's nothing to drill into or act on): Inventory Position (columns: SKU, Product, Warehouse, On hand, Reserved, Quarantine, Damaged, Available, Status badge), Inbound Status (PO, Warehouse, Receipts completed, Putaway completed, Last receipt), Outbound Status (SO, Warehouse, Allocations confirmed, Shipments dispatched, Last shipment).

## `FulfillmentTrendChart` component

A grouped bar chart: one group per day (7 groups) × 3 categorical series (Receipts / Shipments / Allocations), rendered as inline SVG — no new chart dependency. Per the dataviz method (job: "tell distinct series apart, over time" → grouped bar, categorical color):

- **Colors** (already validated via `scripts/validate_palette.js "#2563eb,#0ea5a0,#7c3aed" --mode light`, all checks pass): Receipts `#2563eb` (the existing `--color-status-inbound` token), Shipments `#7c3aed` (`--color-status-outbound`), Allocations `#0ea5a0` (`--color-accent-teal`) — three hues already in the app's token set, reused for their categorical distinctness rather than their original status meaning.
- **Contrast note**: the teal series (`#0ea5a0`) triggers a WARN (2.96:1) against the light chart surface — per the dataviz method this is not dismissable and must be offset with visible labels or a table view. This spec provides both: direct value labels on each bar, and a plain `<table>` rendering the same 7×3 data immediately beneath the chart.
- **Marks**: thin bars, 4px rounded data-ends, ≥2px gap between bars within a group, recessive axis/gridlines.
- **Legend**: always present (3 series ≥ 2 threshold), with direct labels on the bars themselves (3 series is within the "1–3: color alone is comfortable, direct-label" band).
- **Interaction**: a per-bar hover tooltip showing the exact value and date, per the dataviz method's "ship the hover layer by default" rule. Hit targets sized larger than the visual bar width.
- **Accessibility**: the companion `<table>` beneath the chart satisfies the method's "a table view exists" non-negotiable independent of the contrast WARN above.

## Testing

Same conventions as every prior module: colocated `.spec.ts`, `TestBed` + real store injection (no mocks). `ReportingStore` needs no dedicated spec — it has no logic, just seeded signals; coverage comes from the consuming components. `OfficeReporting.spec.ts` covers: KPI tile values match the seeded data; all three tabs render their expected rows; the chart and its companion table both render. `FulfillmentTrendChart.spec.ts` covers: the right number of bar groups/bars/legend entries/table rows for a given `data` input, and that hovering a bar surfaces its tooltip.
