# Reporting/Dashboards UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the placeholder Reporting screen in `ikho-ui` (Office Console's `OfficeGenericScreen`) with a real, mock-data-driven dashboard covering the four read models the backend actually exposes: Fulfillment KPIs (with a trend chart), Inventory Position, Inbound Status, and Outbound Status — per `docs/superpowers/specs/2026-08-12-reporting-dashboards-ui-design.md`.

**Architecture:** A new `ReportingStore` Angular service (signals, `providedIn: 'root'`) owns independent, static mock data shaped after the four real read models — it is deliberately NOT derived from `InboundStore`/`OutboundStore`/`ReturnsStore`, mirroring the real backend's own "never joins other services' databases" architecture. `OfficeReporting` is a dedicated component composing the same primitives `OfficeScreen` uses internally (`lib-kpi-card`, `lib-data-panel`, `lib-data-table`) directly — it does NOT wrap `<app-office-screen>`, since that shared shell has no slot for the trend chart between the KPI row and the tabs, and extending it for this one consumer isn't worth the shared-component risk. A new `FulfillmentTrendChart` component (scoped to the `office/reporting` feature folder, not the shared library) renders a grouped bar chart of the last 7 days' Receipts/Shipments/Allocations as inline SVG, paired with a companion data table. Office Console only — Reporting has no Operator Mode route today (confirmed: `operator.routes.ts` has no `reporting` entry) and `SCREENS.reporting.roles` is already `['admin']` only, so this plan doesn't touch Operator Mode at all.

**Tech Stack:** Angular 19 standalone components, Signals, `@ikho/shared-ui` (DataPanel, DataTable, KpiCard), vitest-angular (`TestBed`), Tailwind v4 utility classes against existing design tokens, inline SVG (no new chart dependency).

## Global Constraints

- No `HttpClient` — all data is in-memory mock state (spec non-goal: real API wiring is a future plan).
- **No live derivation from other stores.** `ReportingStore`'s four mock-data files are independent seed data, not computed from `InboundStore`/`OutboundStore`/`ReturnsStore`. Reusing `PRODUCTS` SKUs/names for the Inventory Position rows is fine (shared catalog reference data, matching how Outbound/Returns already reference `PRODUCTS` for display), but the PO/SO ids used in the Inbound/Outbound Status rows are **new, non-overlapping ids** (the `PO-20xxx`/`SO-91xxx` ranges below) — deliberately distinct from the live `PO-104xx`/`SO-882xx` ids already used elsewhere, so nobody mistakes this screen for pulling from `InboundStore`/`OutboundStore`.
- **No mutation methods on `ReportingStore`.** This screen is a pure read surface — no create/update action exists anywhere in Reporting, so the store is just seeded signals, no guarded transitions, no result types.
- **No modification to the shared `OfficeScreen` component.** `OfficeReporting` composes `lib-kpi-card`/`lib-data-panel`/`lib-data-table` directly in its own template.
- **No new shared chart library or dependency.** `FulfillmentTrendChart` is inline SVG, hand-built, scoped to `features/office/reporting/`.
- **No primary action button** on `OfficeReporting` — nothing is created here. `SCREENS.reporting.action` (`'Build report'`) stays defined but unused, matching the existing precedent of dead `SCREENS`/`ADMIN_SCREENS` fields left behind when a screen gets a dedicated component (e.g. `detailedTabId` is already dead for `OfficeOutbound`/`OfficeReturns`).
- **Validated chart colors** (already run through `scripts/validate_palette.js "#2563eb,#0ea5a0,#7c3aed" --mode light`, all checks pass with one WARN): Receipts `#2563eb` (existing `--color-status-inbound` token), Shipments `#7c3aed` (`--color-status-outbound`), Allocations `#0ea5a0` (`--color-accent-teal`) — reused for categorical distinctness, not their original status meaning. The Allocations teal triggers a contrast WARN (2.96:1) against the light chart surface; per the dataviz method this is offset by direct value labels and a companion data table (both included below), not by choosing a different color.
- All user-facing strings are `{ en, vi }` `Localized<string>` pairs, resolved via `LangService.lang()` (inline ternaries for component-local computed labels, matching the established convention in `OfficeOutbound`/`OfficeReturns`), or via `resolveTabs`/`localized: true` columns for `ADMIN_SCREENS`-sourced table data.
- `OnPush` change detection, `standalone: true` (implicit — Angular 19+ default), named exports, `inject()` for DI.
- Follow the existing flat/display-row mock-data convention (`Record<string, unknown>`-compatible interfaces with an index signature).
- Colocated `.spec.ts` tests per new component, following the `TestBed` + `fixture.componentInstance` pattern already established by Inbound/Outbound/Returns.

---

## Task 1: Fulfillment KPI mock data

**Files:**
- Create: `source/apps/ikho-ui/src/app/core/mock-data/fulfillment-kpis.data.ts`

**Interfaces:**
- Produces: `FulfillmentKpiDay { [key: string]: unknown; date: string; receipts: number; shipments: number; allocations: number }`, `FULFILLMENT_KPIS: FulfillmentKpiDay[]` (7 entries, oldest to newest — the last entry is "today").

No standalone spec — pure data, covered by Task 7/8's component tests (same convention as every prior module's mock-data-only tasks).

- [ ] **Step 1: Create the file**

```typescript
export interface FulfillmentKpiDay {
  [key: string]: unknown;
  date: string;
  receipts: number;
  shipments: number;
  allocations: number;
}

export const FULFILLMENT_KPIS: FulfillmentKpiDay[] = [
  { date: 'Aug 06', receipts: 24, shipments: 19, allocations: 21 },
  { date: 'Aug 07', receipts: 15, shipments: 27, allocations: 30 },
  { date: 'Aug 08', receipts: 21, shipments: 24, allocations: 23 },
  { date: 'Aug 09', receipts: 19, shipments: 20, allocations: 25 },
  { date: 'Aug 10', receipts: 26, shipments: 18, allocations: 19 },
  { date: 'Aug 11', receipts: 23, shipments: 25, allocations: 28 },
  { date: 'Aug 12', receipts: 20, shipments: 22, allocations: 24 },
];
```

- [ ] **Step 2: Commit**

```bash
git add source/apps/ikho-ui/src/app/core/mock-data/fulfillment-kpis.data.ts
git commit -m "feat(ikho-ui): add fulfillment KPI mock data (7-day trend)"
```

---

## Task 2: Inventory position mock data

**Files:**
- Create: `source/apps/ikho-ui/src/app/core/mock-data/inventory-positions.data.ts`

**Interfaces:**
- Produces: `InventoryPosition { [key: string]: unknown; sku: string; productName: Localized<string>; warehouse: string; onHand: number; reserved: number; quarantine: number; damaged: number; available: number; status: StockStatus }`, `INVENTORY_POSITIONS: InventoryPosition[]`.
- `available` is precomputed per row as `onHand - reserved - quarantine - damaged` (stored directly, not a live getter — matching the existing `PRODUCTS` mock's own convention of storing `status` rather than deriving it).
- SKUs are reused from the existing `PRODUCTS` mock for realistic product names (shared catalog reference data — not a violation of "no live derivation," since these are display labels, not operational state).

No standalone spec — covered by Task 8's component tests.

- [ ] **Step 1: Create the file**

```typescript
import { StockStatus } from '@ikho/shared-ui';
import { Localized } from '../i18n/localized.type';

export interface InventoryPosition {
  [key: string]: unknown;
  sku: string;
  productName: Localized<string>;
  warehouse: string;
  onHand: number;
  reserved: number;
  quarantine: number;
  damaged: number;
  available: number;
  status: StockStatus;
}

export const INVENTORY_POSITIONS: InventoryPosition[] = [
  { sku: 'IKH-482910', productName: { en: 'Steel shelving bracket, 400mm', vi: 'Giá đỡ kệ thép, 400mm' }, warehouse: 'WH-1 Rotterdam', onHand: 240, reserved: 40, quarantine: 0, damaged: 0, available: 200, status: 'in-stock' },
  { sku: 'IKH-330298', productName: { en: 'Barcode label roll, 100×50mm', vi: 'Cuộn tem mã vạch, 100×50mm' }, warehouse: 'WH-1 Rotterdam', onHand: 60, reserved: 12, quarantine: 0, damaged: 0, available: 48, status: 'low-stock' },
  { sku: 'IKH-770145', productName: { en: 'Euro pallet, heat-treated', vi: 'Pallet Euro, xử lý nhiệt' }, warehouse: 'WH-1 Rotterdam', onHand: 0, reserved: 0, quarantine: 0, damaged: 0, available: 0, status: 'out-of-stock' },
  { sku: 'IKH-105522', productName: { en: 'Corrugated box, 305×229×229mm', vi: 'Thùng carton, 305×229×229mm' }, warehouse: 'WH-3 Utrecht', onHand: 1840, reserved: 300, quarantine: 20, damaged: 4, available: 1516, status: 'in-stock' },
  { sku: 'IKH-664120', productName: { en: 'Pallet wrap film, 500mm', vi: 'Màng quấn pallet, 500mm' }, warehouse: 'WH-1 Rotterdam', onHand: 18, reserved: 6, quarantine: 6, damaged: 0, available: 6, status: 'low-stock' },
  { sku: 'IKH-318440', productName: { en: 'Shelf divider, 600mm', vi: 'Vách ngăn kệ, 600mm' }, warehouse: 'WH-3 Utrecht', onHand: 34, reserved: 10, quarantine: 0, damaged: 0, available: 24, status: 'low-stock' },
];
```

Note: `IKH-770145` is the only row with `available: 0` — this deliberately gives the Reporting screen's "SKUs at zero available" KPI tile (Task 8) a real, non-trivial count of `1` to display.

- [ ] **Step 2: Commit**

```bash
git add source/apps/ikho-ui/src/app/core/mock-data/inventory-positions.data.ts
git commit -m "feat(ikho-ui): add inventory position mock data"
```

---

## Task 3: Inbound status mock data

**Files:**
- Create: `source/apps/ikho-ui/src/app/core/mock-data/inbound-status.data.ts`

**Interfaces:**
- Produces: `InboundStatusRow { [key: string]: unknown; po: string; warehouse: string; receiptsCompleted: number; putawayCompleted: number; lastReceiptOn: string }`, `INBOUND_STATUSES: InboundStatusRow[]`.
- `po` ids use the `PO-201xx`/`PO-20158` range, deliberately distinct from `InboundStore`'s live `PO-104xx` ids (see Global Constraints).

No standalone spec — covered by Task 8's component tests.

- [ ] **Step 1: Create the file**

```typescript
export interface InboundStatusRow {
  [key: string]: unknown;
  po: string;
  warehouse: string;
  receiptsCompleted: number;
  putawayCompleted: number;
  lastReceiptOn: string;
}

export const INBOUND_STATUSES: InboundStatusRow[] = [
  { po: 'PO-20144', warehouse: 'WH-1 Rotterdam', receiptsCompleted: 4, putawayCompleted: 4, lastReceiptOn: 'Aug 12, 09:15' },
  { po: 'PO-20151', warehouse: 'WH-1 Rotterdam', receiptsCompleted: 2, putawayCompleted: 1, lastReceiptOn: 'Aug 11, 14:40' },
  { po: 'PO-20158', warehouse: 'WH-3 Utrecht', receiptsCompleted: 1, putawayCompleted: 0, lastReceiptOn: 'Aug 12, 08:05' },
];
```

- [ ] **Step 2: Commit**

```bash
git add source/apps/ikho-ui/src/app/core/mock-data/inbound-status.data.ts
git commit -m "feat(ikho-ui): add inbound status mock data"
```

---

## Task 4: Outbound status mock data

**Files:**
- Create: `source/apps/ikho-ui/src/app/core/mock-data/outbound-status.data.ts`

**Interfaces:**
- Produces: `OutboundStatusRow { [key: string]: unknown; so: string; warehouse: string; allocationsConfirmed: number; shipmentsDispatched: number; lastShipmentOn: string }`, `OUTBOUND_STATUSES: OutboundStatusRow[]`.
- `so` ids use the `SO-910xx`/`SO-91014` range, deliberately distinct from `OutboundStore`'s live `SO-882xx` ids (see Global Constraints).

No standalone spec — covered by Task 8's component tests.

- [ ] **Step 1: Create the file**

```typescript
export interface OutboundStatusRow {
  [key: string]: unknown;
  so: string;
  warehouse: string;
  allocationsConfirmed: number;
  shipmentsDispatched: number;
  lastShipmentOn: string;
}

export const OUTBOUND_STATUSES: OutboundStatusRow[] = [
  { so: 'SO-91002', warehouse: 'WH-1 Rotterdam', allocationsConfirmed: 3, shipmentsDispatched: 3, lastShipmentOn: 'Aug 12, 10:20' },
  { so: 'SO-91009', warehouse: 'WH-1 Rotterdam', allocationsConfirmed: 2, shipmentsDispatched: 1, lastShipmentOn: 'Aug 11, 16:05' },
  { so: 'SO-91014', warehouse: 'WH-3 Utrecht', allocationsConfirmed: 1, shipmentsDispatched: 0, lastShipmentOn: '—' },
];
```

- [ ] **Step 2: Commit**

```bash
git add source/apps/ikho-ui/src/app/core/mock-data/outbound-status.data.ts
git commit -m "feat(ikho-ui): add outbound status mock data"
```

---

## Task 5: Wire Reporting into `ADMIN_SCREENS`

**Files:**
- Modify: `source/apps/ikho-ui/src/app/core/mock-data/admin-screens.data.ts`

**Interfaces:**
- Consumes: `INVENTORY_POSITIONS` (Task 2), `INBOUND_STATUSES` (Task 3), `OUTBOUND_STATUSES` (Task 4).
- Produces: `ADMIN_SCREENS.reporting.tabs` becomes three tabs — `inventory`, `inbound`, `outbound` — fully replacing the old placeholder's `main` (meta-list of reports) and `exports` (scheduled exports) tabs. `ADMIN_SCREENS.reporting.kpis` becomes `[]` (the KPI tiles are computed directly in Task 8's component, not sourced from this static list — `kpis: AdminKpi[]` is a required field on `AdminScreenData`, so it can't be omitted, but it goes unused for this screen).

- [ ] **Step 1: Add imports**

At the top of `admin-screens.data.ts`, alongside the existing mock-data imports (keep alphabetical order):

```typescript
import { INBOUND_STATUSES } from './inbound-status.data';
import { INVENTORY_POSITIONS } from './inventory-positions.data';
import { OUTBOUND_STATUSES } from './outbound-status.data';
```

- [ ] **Step 2: Replace the `reporting` entry**

Replace the entire `reporting: { ... }` block:

```typescript
  reporting: {
    panelTitle: { en: 'Reporting', vi: 'Báo cáo' },
    panelSubtitle: { en: 'Read models rebuilt from source events', vi: 'Mô hình đọc dựng lại từ sự kiện gốc' },
    kpis: [],
    tabs: [
      {
        id: 'inventory',
        label: { en: 'Inventory position', vi: 'Vị thế tồn kho' },
        subtitle: { en: 'On-hand, reserved, quarantine and damaged by SKU and warehouse', vi: 'Tồn kho, đã giữ, cách ly và hư hỏng theo SKU và kho' },
        columns: [
          { key: 'sku', label: same('SKU'), mono: true },
          { key: 'productName', label: { en: 'Product', vi: 'Sản phẩm' }, localized: true },
          { key: 'warehouse', label: { en: 'Warehouse', vi: 'Kho' } },
          { key: 'onHand', label: { en: 'On hand', vi: 'Tồn kho' }, align: 'right', mono: true },
          { key: 'reserved', label: { en: 'Reserved', vi: 'Đã giữ' }, align: 'right', mono: true },
          { key: 'quarantine', label: { en: 'Quarantine', vi: 'Cách ly' }, align: 'right', mono: true },
          { key: 'damaged', label: { en: 'Damaged', vi: 'Hư hỏng' }, align: 'right', mono: true },
          { key: 'available', label: { en: 'Available', vi: 'Khả dụng' }, align: 'right', mono: true },
          { key: 'status', label: { en: 'Status', vi: 'Trạng thái' }, status: true },
        ],
        rows: INVENTORY_POSITIONS,
      },
      {
        id: 'inbound',
        label: { en: 'Inbound status', vi: 'Trạng thái nhập kho' },
        subtitle: { en: 'Receipt and putaway progress by purchase order', vi: 'Tiến độ nhận hàng và cất kho theo đơn mua' },
        columns: [
          { key: 'po', label: same('PO'), mono: true },
          { key: 'warehouse', label: { en: 'Warehouse', vi: 'Kho' } },
          { key: 'receiptsCompleted', label: { en: 'Receipts completed', vi: 'Đã nhận' }, align: 'right', mono: true },
          { key: 'putawayCompleted', label: { en: 'Putaway completed', vi: 'Đã cất kho' }, align: 'right', mono: true },
          { key: 'lastReceiptOn', label: { en: 'Last receipt', vi: 'Lần nhận cuối' }, mono: true },
        ],
        rows: INBOUND_STATUSES,
      },
      {
        id: 'outbound',
        label: { en: 'Outbound status', vi: 'Trạng thái xuất kho' },
        subtitle: { en: 'Allocation and dispatch progress by sales order', vi: 'Tiến độ phân bổ và xuất hàng theo đơn bán' },
        columns: [
          { key: 'so', label: same('SO'), mono: true },
          { key: 'warehouse', label: { en: 'Warehouse', vi: 'Kho' } },
          { key: 'allocationsConfirmed', label: { en: 'Allocations confirmed', vi: 'Đã phân bổ' }, align: 'right', mono: true },
          { key: 'shipmentsDispatched', label: { en: 'Shipments dispatched', vi: 'Đã xuất' }, align: 'right', mono: true },
          { key: 'lastShipmentOn', label: { en: 'Last shipment', vi: 'Lần xuất cuối' }, mono: true },
        ],
        rows: OUTBOUND_STATUSES,
      },
    ],
  },
```

- [ ] **Step 3: Verify the app builds**

Run: `pnpm nx build ikho-ui`
Expected: clean build, no type errors.

- [ ] **Step 4: Commit**

```bash
git add source/apps/ikho-ui/src/app/core/mock-data/admin-screens.data.ts
git commit -m "feat(ikho-ui): point ADMIN_SCREENS.reporting at typed read-model mock data"
```

---

## Task 6: `ReportingStore`

**Files:**
- Create: `source/apps/ikho-ui/src/app/core/state/reporting-store.ts`

**Interfaces:**
- Consumes: `FulfillmentKpiDay`/`FULFILLMENT_KPIS` (Task 1), `InventoryPosition`/`INVENTORY_POSITIONS` (Task 2), `InboundStatusRow`/`INBOUND_STATUSES` (Task 3), `OutboundStatusRow`/`OUTBOUND_STATUSES` (Task 4).
- Produces: `ReportingStore` (`providedIn: 'root'`) with `fulfillmentKpis: Signal<FulfillmentKpiDay[]>`, `inventoryPositions: Signal<InventoryPosition[]>`, `inboundStatuses: Signal<InboundStatusRow[]>`, `outboundStatuses: Signal<OutboundStatusRow[]>`. No mutation methods. Consumed by Tasks 7, 8.

No standalone spec — this store has no logic, just seeded signals (a deliberate departure from `InboundStore`/`OutboundStore`/`ReturnsStore`, which all had guarded mutation methods worth unit-testing in isolation); coverage comes from Task 8's component tests, which inject the real store via `TestBed`.

- [ ] **Step 1: Create the file**

```typescript
import { Injectable, signal } from '@angular/core';
import { FulfillmentKpiDay, FULFILLMENT_KPIS } from '../mock-data/fulfillment-kpis.data';
import { InboundStatusRow, INBOUND_STATUSES } from '../mock-data/inbound-status.data';
import { InventoryPosition, INVENTORY_POSITIONS } from '../mock-data/inventory-positions.data';
import { OutboundStatusRow, OUTBOUND_STATUSES } from '../mock-data/outbound-status.data';

@Injectable({ providedIn: 'root' })
export class ReportingStore {
  readonly fulfillmentKpis = signal<FulfillmentKpiDay[]>([...FULFILLMENT_KPIS]);
  readonly inventoryPositions = signal<InventoryPosition[]>([...INVENTORY_POSITIONS]);
  readonly inboundStatuses = signal<InboundStatusRow[]>([...INBOUND_STATUSES]);
  readonly outboundStatuses = signal<OutboundStatusRow[]>([...OUTBOUND_STATUSES]);
}
```

- [ ] **Step 2: Verify the app builds**

Run: `pnpm nx build ikho-ui`
Expected: clean build, no type errors.

- [ ] **Step 3: Commit**

```bash
git add source/apps/ikho-ui/src/app/core/state/reporting-store.ts
git commit -m "feat(ikho-ui): add ReportingStore for independent mock read-model data"
```

---

## Task 7: `FulfillmentTrendChart` component

**Files:**
- Create: `source/apps/ikho-ui/src/app/features/office/reporting/fulfillment-trend-chart.ts`
- Test: `source/apps/ikho-ui/src/app/features/office/reporting/fulfillment-trend-chart.spec.ts`

**Interfaces:**
- Consumes: `FulfillmentKpiDay` (Task 1, type only — receives data via input, does not import the store), `DataPanel`/`DataTable`/`DataTableColumn` (existing shared-ui).
- Produces: `FulfillmentTrendChart` component, selector `app-fulfillment-trend-chart`, `readonly data = input.required<FulfillmentKpiDay[]>()`. Consumed by Task 8.

- [ ] **Step 1: Write the failing test**

```typescript
import { TestBed } from '@angular/core/testing';
import { FulfillmentTrendChart } from './fulfillment-trend-chart';

const SAMPLE_DATA = [
  { date: 'Aug 06', receipts: 24, shipments: 19, allocations: 21 },
  { date: 'Aug 07', receipts: 15, shipments: 27, allocations: 30 },
  { date: 'Aug 08', receipts: 21, shipments: 24, allocations: 23 },
];

describe('FulfillmentTrendChart', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FulfillmentTrendChart],
    }).compileComponents();
  });

  it('renders one bar per series per day', () => {
    const fixture = TestBed.createComponent(FulfillmentTrendChart);
    fixture.componentRef.setInput('data', SAMPLE_DATA);
    fixture.detectChanges();

    const bars = (fixture.nativeElement as HTMLElement).querySelectorAll('.chart-bar');
    expect(bars.length).toBe(9); // 3 days × 3 series
  });

  it('renders a legend item per series', () => {
    const fixture = TestBed.createComponent(FulfillmentTrendChart);
    fixture.componentRef.setInput('data', SAMPLE_DATA);
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Receipts');
    expect(text).toContain('Shipments');
    expect(text).toContain('Allocations');
  });

  it('renders one table row per day with the seeded dates', () => {
    const fixture = TestBed.createComponent(FulfillmentTrendChart);
    fixture.componentRef.setInput('data', SAMPLE_DATA);
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Aug 06');
    expect(text).toContain('Aug 07');
    expect(text).toContain('Aug 08');
  });

  it('shows a tooltip with the series and value when a bar is hovered', () => {
    const fixture = TestBed.createComponent(FulfillmentTrendChart);
    fixture.componentRef.setInput('data', SAMPLE_DATA);
    fixture.detectChanges();

    const instance = fixture.componentInstance as unknown as { hoveredBar: { set: (v: unknown) => void } };
    instance.hoveredBar.set({ x: 0, y: 0, width: 16, height: 40, color: '#2563eb', value: 24, series: 'receipts' });
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Receipts: 24');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm nx test ikho-ui --include="**/fulfillment-trend-chart.spec.ts"`
Expected: FAIL — `fulfillment-trend-chart.ts` does not exist yet.

- [ ] **Step 3: Implement `FulfillmentTrendChart`**

```typescript
import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { DataPanel, DataTable, DataTableColumn } from '@ikho/shared-ui';
import { LangService } from '../../../core/i18n/lang.service';
import { FulfillmentKpiDay } from '../../../core/mock-data/fulfillment-kpis.data';

type SeriesKey = 'receipts' | 'shipments' | 'allocations';

interface Bar {
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  value: number;
  series: SeriesKey;
}

interface Group {
  label: string;
  centerX: number;
}

const SERIES: { key: SeriesKey; color: string }[] = [
  { key: 'receipts', color: '#2563eb' },
  { key: 'shipments', color: '#7c3aed' },
  { key: 'allocations', color: '#0ea5a0' },
];

const CHART_WIDTH = 700;
const CHART_HEIGHT = 200;
const CHART_TOP_PADDING = 24;
const CHART_BOTTOM_PADDING = 36;
const BAR_WIDTH = 16;
const BAR_GAP = 4;

@Component({
  selector: 'app-fulfillment-trend-chart',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DataPanel, DataTable],
  template: `
    <lib-data-panel [title]="chartTitle()" [subtitle]="chartSubtitle()">
      <div class="flex flex-col gap-4">
        <div class="flex gap-4">
          @for (s of legendItems(); track s.key) {
            <div class="flex items-center gap-1.5">
              <span class="inline-block size-2.5 rounded-full" [style.background]="s.color"></span>
              <span class="font-core text-[13px] text-shade-60">{{ s.label }}</span>
            </div>
          }
        </div>
        <svg [attr.viewBox]="'0 0 ' + chartWidth + ' ' + chartHeight" class="w-full" role="img" [attr.aria-label]="chartTitle()">
          <line [attr.x1]="0" [attr.y1]="baselineY()" [attr.x2]="chartWidth" [attr.y2]="baselineY()" stroke="var(--color-hairline-light)" stroke-width="1" />
          @for (bar of bars(); track bar.x + '-' + bar.series) {
            <rect
              class="chart-bar"
              [attr.data-series]="bar.series"
              [attr.x]="bar.x"
              [attr.y]="bar.y"
              [attr.width]="bar.width"
              [attr.height]="bar.height"
              [attr.fill]="bar.color"
              rx="2"
              (mouseenter)="hoveredBar.set(bar)"
              (mouseleave)="hoveredBar.set(null)"
            />
          }
          @for (group of groups(); track group.label) {
            <text [attr.x]="group.centerX" [attr.y]="chartHeight - 10" text-anchor="middle" class="font-core" font-size="11" fill="var(--color-shade-50)">{{ group.label }}</text>
          }
        </svg>
        <div class="font-core text-[13px] text-ink">
          @if (hoveredBar(); as bar) {
            {{ tooltipText(bar) }}
          }
        </div>
        <lib-data-table [columns]="tableColumns()" [rows]="data()" />
      </div>
    </lib-data-panel>
  `,
})
export class FulfillmentTrendChart {
  protected readonly lang = inject(LangService);

  readonly data = input.required<FulfillmentKpiDay[]>();

  protected readonly chartWidth = CHART_WIDTH;
  protected readonly chartHeight = CHART_HEIGHT;

  protected readonly hoveredBar = signal<Bar | null>(null);

  protected readonly chartTitle = computed(() => (this.lang.lang() === 'en' ? 'Fulfillment trend' : 'Xu hướng hoàn thành'));
  protected readonly chartSubtitle = computed(() =>
    this.lang.lang() === 'en' ? 'Receipts, shipments and allocations, last 7 days' : 'Nhận hàng, xuất hàng và phân bổ, 7 ngày qua',
  );

  protected readonly legendItems = computed(() =>
    SERIES.map((s) => ({ key: s.key, color: s.color, label: this.seriesLabel(s.key) })),
  );

  protected readonly tableColumns = computed<DataTableColumn[]>(() => {
    const lang = this.lang.lang();
    return [
      { key: 'date', label: lang === 'en' ? 'Date' : 'Ngày' },
      { key: 'receipts', label: lang === 'en' ? 'Receipts' : 'Nhận hàng', align: 'right', mono: true },
      { key: 'shipments', label: lang === 'en' ? 'Shipments' : 'Xuất hàng', align: 'right', mono: true },
      { key: 'allocations', label: lang === 'en' ? 'Allocations' : 'Phân bổ', align: 'right', mono: true },
    ];
  });

  private readonly maxValue = computed(() => {
    const values = this.data().flatMap((d) => [d.receipts, d.shipments, d.allocations] as number[]);
    return Math.max(1, ...values);
  });

  protected readonly baselineY = computed(() => this.chartHeight - CHART_BOTTOM_PADDING);

  protected readonly groups = computed<Group[]>(() => {
    const days = this.data();
    const groupWidth = this.chartWidth / days.length;
    return days.map((d, i) => ({ label: d.date, centerX: groupWidth * i + groupWidth / 2 }));
  });

  protected readonly bars = computed<Bar[]>(() => {
    const days = this.data();
    const groupWidth = this.chartWidth / days.length;
    const barsContentWidth = SERIES.length * BAR_WIDTH + (SERIES.length - 1) * BAR_GAP;
    const usableHeight = this.baselineY() - CHART_TOP_PADDING;
    const max = this.maxValue();

    return days.flatMap((d, i) => {
      const groupStart = groupWidth * i + (groupWidth - barsContentWidth) / 2;
      return SERIES.map((s, j) => {
        const value = d[s.key] as number;
        const height = (value / max) * usableHeight;
        return {
          x: groupStart + j * (BAR_WIDTH + BAR_GAP),
          y: this.baselineY() - height,
          width: BAR_WIDTH,
          height,
          color: s.color,
          value,
          series: s.key,
        };
      });
    });
  });

  protected seriesLabel(key: SeriesKey): string {
    const lang = this.lang.lang();
    if (key === 'receipts') return lang === 'en' ? 'Receipts' : 'Nhận hàng';
    if (key === 'shipments') return lang === 'en' ? 'Shipments' : 'Xuất hàng';
    return lang === 'en' ? 'Allocations' : 'Phân bổ';
  }

  protected tooltipText(bar: Bar): string {
    return `${this.seriesLabel(bar.series)}: ${bar.value}`;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm nx test ikho-ui --include="**/fulfillment-trend-chart.spec.ts"`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add source/apps/ikho-ui/src/app/features/office/reporting/fulfillment-trend-chart.ts source/apps/ikho-ui/src/app/features/office/reporting/fulfillment-trend-chart.spec.ts
git commit -m "feat(ikho-ui): add FulfillmentTrendChart (grouped bar + companion table)"
```

---

## Task 8: `OfficeReporting` component

**Files:**
- Create: `source/apps/ikho-ui/src/app/features/office/reporting/office-reporting.ts`
- Test: `source/apps/ikho-ui/src/app/features/office/reporting/office-reporting.spec.ts`

**Interfaces:**
- Consumes: `ADMIN_SCREENS.reporting` (Task 5), `ReportingStore` (Task 6), `resolveTabs` (existing), `screenMeta`/`screenTitle` (existing), `FulfillmentTrendChart` (Task 7), `DataPanel`/`DataTable`/`KpiCard` (existing shared-ui).
- Produces: `OfficeReporting` component, selector `app-office-reporting`. Consumed by Task 9's route. Does NOT use `<app-office-screen>` (see Global Constraints).

- [ ] **Step 1: Write the failing test**

```typescript
import { TestBed } from '@angular/core/testing';
import { OfficeReporting } from './office-reporting';

describe('OfficeReporting', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OfficeReporting],
    }).compileComponents();
  });

  it('renders KPI tiles computed from the seeded data', () => {
    const fixture = TestBed.createComponent(OfficeReporting);
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Receipts today');
    expect(text).toContain('20');
    expect(text).toContain('SKUs at zero available');
    expect(text).toContain('1');
  });

  it('renders all three status tables with seeded rows', () => {
    const fixture = TestBed.createComponent(OfficeReporting);
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('IKH-482910');
    expect(text).toContain('PO-20144');
    expect(text).toContain('SO-91002');
  });

  it('renders the fulfillment trend chart', () => {
    const fixture = TestBed.createComponent(OfficeReporting);
    fixture.detectChanges();

    const bars = (fixture.nativeElement as HTMLElement).querySelectorAll('.chart-bar');
    expect(bars.length).toBe(21); // 7 days × 3 series
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm nx test ikho-ui --include="**/office-reporting.spec.ts"`
Expected: FAIL — `office-reporting.ts` does not exist yet.

- [ ] **Step 3: Implement `OfficeReporting`**

```typescript
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { DataPanel, DataTable, KpiCard } from '@ikho/shared-ui';
import { LangService } from '../../../core/i18n/lang.service';
import { resolveTabs } from '../../../core/mock-data/admin-screen.util';
import { ADMIN_SCREENS } from '../../../core/mock-data/admin-screens.data';
import { screenMeta, screenTitle } from '../../../core/mock-data/screens.data';
import { ReportingStore } from '../../../core/state/reporting-store';
import { FulfillmentTrendChart } from './fulfillment-trend-chart';

const DATA = ADMIN_SCREENS.reporting;

@Component({
  selector: 'app-office-reporting',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DataPanel, DataTable, FulfillmentTrendChart, KpiCard],
  template: `
    <div class="flex flex-col gap-6">
      <div>
        <div class="font-core text-2xl font-bold tracking-[-0.4px] text-ink">{{ title() }}</div>
        <div class="mt-0.5 font-core text-[13px] text-shade-50">{{ meta() }}</div>
      </div>

      <div class="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4">
        @for (k of kpis(); track k.label) {
          <lib-kpi-card [label]="k.label" [value]="k.value" />
        }
      </div>

      <app-fulfillment-trend-chart [data]="store.fulfillmentKpis()" />

      @for (tab of tabs(); track tab.id) {
        <lib-data-panel [title]="tab.label" [subtitle]="tab.subtitle">
          <lib-data-table [columns]="tab.columns" [rows]="tab.rows" />
        </lib-data-panel>
      }
    </div>
  `,
})
export class OfficeReporting {
  private readonly lang = inject(LangService);
  protected readonly store = inject(ReportingStore);

  protected readonly title = computed(() => screenTitle('reporting', 'admin', this.lang.lang()));
  protected readonly meta = computed(() => screenMeta('reporting', 'admin', this.lang.lang()));

  protected readonly kpis = computed(() => {
    const lang = this.lang.lang();
    const days = this.store.fulfillmentKpis();
    const today = days[days.length - 1];
    const zeroAvailable = this.store.inventoryPositions().filter((p) => p.available <= 0).length;

    return [
      { label: lang === 'en' ? 'Receipts today' : 'Đã nhận hôm nay', value: today.receipts },
      { label: lang === 'en' ? 'Shipments today' : 'Đã xuất hôm nay', value: today.shipments },
      { label: lang === 'en' ? 'Allocations today' : 'Đã phân bổ hôm nay', value: today.allocations },
      { label: lang === 'en' ? 'SKUs at zero available' : 'SKU hết khả dụng', value: zeroAvailable },
    ];
  });

  protected readonly tabs = computed(() =>
    resolveTabs(
      [
        { ...DATA.tabs[0], rows: this.store.inventoryPositions() },
        { ...DATA.tabs[1], rows: this.store.inboundStatuses() },
        { ...DATA.tabs[2], rows: this.store.outboundStatuses() },
      ],
      this.lang.lang(),
    ),
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm nx test ikho-ui --include="**/office-reporting.spec.ts"`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add source/apps/ikho-ui/src/app/features/office/reporting/office-reporting.ts source/apps/ikho-ui/src/app/features/office/reporting/office-reporting.spec.ts
git commit -m "feat(ikho-ui): add dedicated OfficeReporting dashboard with KPI tiles, trend chart, and status tables"
```

---

## Task 9: Route Office Console's Reporting to `OfficeReporting`

**Files:**
- Modify: `source/apps/ikho-ui/src/app/features/office/office.routes.ts`
- Modify: `source/apps/ikho-ui/src/app/features/office/generic-screen/office-generic-screen.ts`

**Interfaces:**
- Consumes: `OfficeReporting` (Task 8).

- [ ] **Step 1: Update `office.routes.ts`**

Replace `genericScreen('reporting'),` with a dedicated route entry (keep it in the same list position, at the end):

```typescript
  {
    path: 'reporting',
    loadComponent: () => import('./reporting/office-reporting').then((m) => m.OfficeReporting),
  },
```

- [ ] **Step 2: Update `GenericScreenId` in `office-generic-screen.ts`**

```typescript
type GenericScreenId = Exclude<ScreenId, 'dashboard' | 'catalogue' | 'inventory' | 'inbound' | 'outbound' | 'returns' | 'reporting'>;
```

- [ ] **Step 3: Verify the app builds**

Run: `pnpm nx build ikho-ui`
Expected: clean build.

- [ ] **Step 4: Commit**

```bash
git add source/apps/ikho-ui/src/app/features/office/office.routes.ts source/apps/ikho-ui/src/app/features/office/generic-screen/office-generic-screen.ts
git commit -m "feat(ikho-ui): route Office Reporting to the dedicated dashboard"
```

---

## Final verification

- [ ] **Run the full test suite and build**

```bash
pnpm nx test ikho-ui
pnpm nx build ikho-ui
```

Expected: all tests pass (existing suite plus the new spec files from this plan), production build succeeds with no type errors, SSR prerendering clean (no new parameterized routes in this plan — `/office/reporting` is a plain static path, so no client-render carve-out is needed, unlike every prior module's `:id` routes).

- [ ] **Manual smoke test**

Run: `pnpm nx serve ikho-ui`, then in the browser:
1. `/office/reporting` — confirm the 4 KPI tiles show the last seeded day's Receipts/Shipments/Allocations (20/22/24) and "SKUs at zero available" (1).
2. Confirm the fulfillment trend chart renders 7 groups of 3 bars each, with a legend (Receipts/Shipments/Allocations) and value labels; hover a bar and confirm a tooltip appears with its series and value; confirm the companion table beneath the chart shows the same 7 rows.
3. Confirm the three tabs (Inventory position / Inbound status / Outbound status) render their seeded rows, and that the Inventory position tab's Status column shows the correct badge color per row (in-stock/low-stock/out-of-stock).
4. Confirm there is no primary action button on this screen, and that Operator Mode has no Reporting entry in its sidebar (already true before this plan — just confirming nothing regressed).

- [ ] **Update the rollout tracking table**

In `docs/plans/warehouse-ui-rollout-plan.md`, set Reporting/dashboards' "Design spec" and "Implementation plan" columns to link this file and its design spec, and update its status to "Implemented" once the above passes. This is the last module in the rollout — once this row lands, all four rows read "Implemented" and the rollout is complete.
