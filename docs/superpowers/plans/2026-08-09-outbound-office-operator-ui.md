# Outbound Office/Operator UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the placeholder Outbound screens in `ikho-ui` (Office Console's `OfficeGenericScreen`, Operator Mode's `OperatorOutlinedScreen`) with real, mock-data-driven screens covering Sales Orders, Allocation, and Dispatch — per `docs/superpowers/specs/2026-08-09-outbound-office-operator-ui-design.md`.

**Architecture:** A new `OutboundStore` Angular service (signals, `providedIn: 'root'`), same shape as the already-shipped `InboundStore`, owns mutable in-memory mock state for sales orders, allocations, and shipments. Office Console gets a dedicated `OfficeOutbound` component (list+detail+inline create form, plus a new "Allocate" action on the detail panel). Operator Mode gets two new routed components (a dispatch-ready entry list, and a dispatch-confirm screen) — no picking stepper, since both `Allocate` and `Dispatch` are whole-order backend actions with no line-by-line concept. The Operator Dashboard's task queue drops the retired `PIK-3318` static "Pick" placeholder and gains dispatch-ready orders from the new store.

**Tech Stack:** Angular 19 standalone components, Signals, `@ikho/shared-ui` (Button, DataPanel, DataTable, Icon, KpiCard, StatusBadge, TextInput), vitest-angular (`TestBed`), Tailwind v4 utility classes against existing design tokens.

## Global Constraints

- No `HttpClient` — all data is in-memory mock state (spec non-goal: real API wiring is a future plan).
- **No picking stage.** `Allocate` and `Dispatch` are whole-order actions with no partial/line-by-line state — a `SalesOrder`'s `allocated` quantity is always either `0` or equal to its `ordered` quantity, never partial (spec non-goal — this is a deliberate departure from Inbound's line-by-line `Receipts` model).
- No new shared Modal/Dialog component — "Create sales order" is an inline expandable panel, matching Inbound's "Create purchase order".
- Use only existing icon names from `libs/ikho-shared-ui/src/lib/icon/icon-paths.ts`: `layout-dashboard`, `building-2`, `package`, `users`, `boxes`, `truck`, `package-check`, `undo-2`, `receipt-text`, `chart-line`, `x`, `chevron-right`, `check`, `search`, `chevron-down`, `bell`, `menu`. This plan uses `package-check` for Outbound (already used for the retired `PIK-3318` task and the `outbound` screen icon in `screens.data.ts`).
- All user-facing strings are `{ en, vi }` `Localized<string>` pairs, resolved via `LangService.lang()` / `LangService.pick()`, matching the rest of the app.
- `OnPush` change detection, `standalone: true` (implicit — no component in this codebase sets it explicitly; Angular 19+ defaults to standalone), named exports, `inject()` for DI.
- Follow the existing flat/display-row mock-data convention (`Record<string, unknown>`-compatible interfaces with an index signature).
- Colocated `.spec.ts` tests per new/modified component and the store, following the `TestBed` + `fixture.componentInstance` pattern already established by the Inbound module. Plain-object `Router` provider stubs (`{ provide: Router, useValue: { navigate: (...args) => calls.push(args) } }`) for navigation tests — no real routing config needed in unit tests.
- **Insufficient-stock rule for `allocate`**: for each line, compare its `orderedQty` against that SKU's `qty` field in the existing `PRODUCTS` mock (on-hand quantity, read-only — never decremented by this store, since real stock-decrement modeling is out of scope). If any line's `orderedQty` exceeds the product's `qty`, allocation fails.

---

## Task 1: `OfficeDetailPanel` action button

**Files:**
- Modify: `source/apps/ikho-ui/src/app/shared/components/office-screen/office-screen.ts`
- Test: `source/apps/ikho-ui/src/app/shared/components/office-screen/office-screen.spec.ts` (already exists from the Inbound module — add to it)

**Interfaces:**
- Produces: `OfficeDetailPanel` gains an optional `action?: { label: string; onClick: () => void }` field. When set, the detail panel (rendered on row-click for the detailed tab) shows a full-width primary button below the fields list; clicking it calls `action.onClick()`. Existing consumers (`OfficeInbound`, `OfficeInventory`, `OfficeCatalogue`) that don't set `action` are unaffected — this is purely additive, same low-risk pattern as the `primaryAction` output added for Inbound.

- [ ] **Step 1: Write the failing test**

Add this test to the existing `office-screen.spec.ts` (alongside its current tests):

```typescript
it('renders and wires an optional detail-panel action button', () => {
  const fixture = TestBed.createComponent(OfficeScreen);
  fixture.componentRef.setInput('title', 'Outbound');
  fixture.componentRef.setInput('detailedTabId', 'main');
  fixture.componentRef.setInput('rowKey', (row: Record<string, unknown>) => String(row['id']));

  let actionCalls = 0;
  fixture.componentRef.setInput('detail', () => ({
    eyebrow: 'Detail',
    title: 'Row title',
    code: 'ROW-1',
    status: 'inbound' as const,
    statusLabel: 'Open',
    fields: [],
    action: { label: 'Allocate', onClick: () => actionCalls++ },
  }));
  fixture.componentRef.setInput('tabs', [
    { id: 'main', label: 'Main', columns: [{ key: 'id', label: 'ID' }], rows: [{ id: 'ROW-1' }] },
  ]);
  fixture.detectChanges();

  fixture.componentInstance.onRowClick({ id: 'ROW-1' });
  fixture.detectChanges();

  const buttons = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('aside button'));
  const actionButton = buttons.find((b) => b.textContent?.trim() === 'Allocate') as HTMLButtonElement | undefined;
  expect(actionButton).toBeTruthy();

  actionButton!.click();
  expect(actionCalls).toBe(1);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm nx test ikho-ui --include="**/office-screen.spec.ts"`
Expected: FAIL — `OfficeDetailPanel` has no `action` field, so nothing renders and `actionButton` is `undefined`.

- [ ] **Step 3: Add the field and render it**

In `office-screen.ts`, extend the interface:

```typescript
export interface OfficeDetailPanel {
  eyebrow: string;
  title: string;
  code: string;
  status: StockStatus;
  statusLabel: string;
  fields: { label: string; value: string }[];
  action?: { label: string; onClick: () => void };
}
```

In the template, inside the `<aside>` block, add the button after the fields `<div>` (still inside `@if (detailPanel(); as d) { ... }`):

```typescript
          <div class="flex flex-col gap-2.5 border-t border-hairline-light pt-4">
            @for (f of d.fields; track f.label) {
              <div class="flex items-baseline justify-between gap-3">
                <span class="font-core text-[13px] text-shade-50">{{ f.label }}</span>
                <span class="text-right font-core text-[13px] font-semibold text-text-body">{{ f.value }}</span>
              </div>
            }
          </div>
          @if (d.action; as action) {
            <lib-button variant="primary" [fullWidth]="true" (click)="action.onClick()">{{ action.label }}</lib-button>
          }
        </aside>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm nx test ikho-ui --include="**/office-screen.spec.ts"`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add source/apps/ikho-ui/src/app/shared/components/office-screen/office-screen.ts source/apps/ikho-ui/src/app/shared/components/office-screen/office-screen.spec.ts
git commit -m "feat(ikho-ui): add optional action button to OfficeDetailPanel"
```

---

## Task 2: Sales order mock data

**Files:**
- Create: `source/apps/ikho-ui/src/app/core/mock-data/sales-orders.data.ts`

**Interfaces:**
- Produces: `SalesOrderLine { sku: string; productName: Localized<string>; orderedQty: number; allocatedQty: number }`, `SalesOrder { [key: string]: unknown; so: string; customer: string; ordered: number; allocated: number; dock: string; cutoff: string; status: StockStatus; label: Localized<string>; lines: SalesOrderLine[] }`, `SALES_ORDERS: SalesOrder[]`.
- `allocated` is always `0` or equal to `ordered` (whole-order semantics — no task in this plan ever sets it to a partial value).

No standalone spec — this is pure data, covered by Task 7's store tests and Task 8/10's component tests (same convention as Inbound's Task 2, confirmed acceptable there).

- [ ] **Step 1: Create the file**

```typescript
import { StockStatus } from '@ikho/shared-ui';
import { Localized } from '../i18n/localized.type';

export interface SalesOrderLine {
  sku: string;
  productName: Localized<string>;
  orderedQty: number;
  allocatedQty: number;
}

export interface SalesOrder {
  [key: string]: unknown;
  so: string;
  customer: string;
  ordered: number;
  allocated: number;
  dock: string;
  cutoff: string;
  status: StockStatus;
  label: Localized<string>;
  lines: SalesOrderLine[];
}

export const SALES_ORDERS: SalesOrder[] = [
  {
    so: 'SO-88214', customer: 'Meijer Retail Group', ordered: 18, allocated: 18, dock: 'Dock 2', cutoff: '17:00',
    status: 'in-stock', label: { en: 'Dispatched', vi: 'Đã xuất' },
    lines: [
      { sku: 'IKH-482910', productName: { en: 'Steel shelving bracket, 400mm', vi: 'Giá đỡ kệ thép, 400mm' }, orderedQty: 18, allocatedQty: 18 },
    ],
  },
  {
    so: 'SO-88219', customer: 'Brico Bouwmarkt', ordered: 24, allocated: 24, dock: 'Dock 2', cutoff: '17:00',
    status: 'outbound', label: { en: 'Allocated', vi: 'Đã phân bổ' },
    lines: [
      { sku: 'IKH-105522', productName: { en: 'Corrugated box, 305×229×229mm', vi: 'Thùng carton, 305×229×229mm' }, orderedQty: 24, allocatedQty: 24 },
    ],
  },
  {
    so: 'SO-88222', customer: 'Meijer Retail Group', ordered: 9, allocated: 9, dock: 'Dock 4', cutoff: '12:00',
    status: 'outbound', label: { en: 'Allocated', vi: 'Đã phân bổ' },
    lines: [
      { sku: 'IKH-559071', productName: { en: 'Void fill paper, 380mm', vi: 'Giấy chèn lót, 380mm' }, orderedQty: 9, allocatedQty: 9 },
    ],
  },
  {
    so: 'SO-88208', customer: 'Hafen Bremen GmbH', ordered: 32, allocated: 0, dock: 'Dock 1', cutoff: '17:00',
    status: 'inbound', label: { en: 'Open', vi: 'Đang mở' },
    lines: [
      { sku: 'IKH-664120', productName: { en: 'Pallet wrap film, 500mm', vi: 'Màng quấn pallet, 500mm' }, orderedQty: 32, allocatedQty: 0 },
    ],
  },
];
```

Note: `SO-88208` orders 32 units of `IKH-664120`, whose `PRODUCTS` on-hand `qty` is 18 — this is deliberate, so allocating this order demonstrates the insufficient-stock failure path in Task 7's store and Task 8's UI.

- [ ] **Step 2: Commit**

```bash
git add source/apps/ikho-ui/src/app/core/mock-data/sales-orders.data.ts
git commit -m "feat(ikho-ui): add sales order mock data with line detail"
```

---

## Task 3: Allocation mock data

**Files:**
- Create: `source/apps/ikho-ui/src/app/core/mock-data/allocations.data.ts`

**Interfaces:**
- Produces: `Allocation { [key: string]: unknown; so: string; sku: string; bin: string; qty: number; status: StockStatus; label: Localized<string> }`, `ALLOCATIONS: Allocation[]`.
- Represents currently-live stock claims — only for orders that are allocated but not yet dispatched (`SO-88219`, `SO-88222` from Task 2; `SO-88214` is already dispatched and has no live allocation, matching how a dispatched order's claim converts into a shipment).

No standalone spec — covered by Task 7's store tests.

- [ ] **Step 1: Create the file**

```typescript
import { StockStatus } from '@ikho/shared-ui';
import { Localized } from '../i18n/localized.type';

export interface Allocation {
  [key: string]: unknown;
  so: string;
  sku: string;
  bin: string;
  qty: number;
  status: StockStatus;
  label: Localized<string>;
}

export const ALLOCATIONS: Allocation[] = [
  { so: 'SO-88219', sku: 'IKH-105522', bin: 'B-02-11', qty: 24, status: 'outbound', label: { en: 'Reserved', vi: 'Đã giữ' } },
  { so: 'SO-88222', sku: 'IKH-559071', bin: 'B-05-08', qty: 9, status: 'outbound', label: { en: 'Reserved', vi: 'Đã giữ' } },
];
```

- [ ] **Step 2: Commit**

```bash
git add source/apps/ikho-ui/src/app/core/mock-data/allocations.data.ts
git commit -m "feat(ikho-ui): add allocation mock data"
```

---

## Task 4: Shipment mock data

**Files:**
- Create: `source/apps/ikho-ui/src/app/core/mock-data/shipments.data.ts`

**Interfaces:**
- Produces: `Shipment { [key: string]: unknown; shipment: string; so: string; carrier: string; dock: string; departure: string; status: StockStatus; label: Localized<string> }`, `SHIPMENTS: Shipment[]`.

No standalone spec — covered by Task 7's store tests.

- [ ] **Step 1: Create the file**

```typescript
import { StockStatus } from '@ikho/shared-ui';
import { Localized } from '../i18n/localized.type';

export interface Shipment {
  [key: string]: unknown;
  shipment: string;
  so: string;
  carrier: string;
  dock: string;
  departure: string;
  status: StockStatus;
  label: Localized<string>;
}

export const SHIPMENTS: Shipment[] = [
  { shipment: 'SHP-51120', so: 'SO-88214', carrier: 'DHL Freight', dock: 'Dock 2', departure: '07:55', status: 'in-stock', label: { en: 'Departed', vi: 'Đã rời kho' } },
];
```

- [ ] **Step 2: Commit**

```bash
git add source/apps/ikho-ui/src/app/core/mock-data/shipments.data.ts
git commit -m "feat(ikho-ui): add shipment mock data"
```

---

## Task 5: Retire the `PIK-3318` static task

**Files:**
- Modify: `source/apps/ikho-ui/src/app/core/mock-data/tasks.data.ts`

**Interfaces:**
- Produces: `STATIC_TASKS: OperatorTask[]` becomes an empty array (the `OperatorTask` interface and export name are unchanged, so `OperatorDashboard`'s existing merge logic — modified in Task 13 — still compiles against it without a rename).

**Known, expected transient state:** after this task, `OperatorDashboard` (not modified until Task 13) still imports and maps over `STATIC_TASKS` — mapping over an empty array is valid and produces no cards, so this does NOT break the build or tests, unlike Inbound's Task 4/13 gap. No workaround needed here.

- [ ] **Step 1: Replace the file's `STATIC_TASKS` array**

```typescript
import { StockStatus } from '@ikho/shared-ui';
import { Localized } from '../i18n/localized.type';

export interface OperatorTask {
  id: string;
  status: StockStatus;
  icon: string;
  kind: Localized<string>;
  title: Localized<string>;
  route: string;
  qty: Localized<string>;
}

/**
 * Static, non-store-backed task-queue entries. Empty for now — Inbound's putaway
 * tasks and Outbound's dispatch-ready orders are both store-backed (see
 * InboundStore/OutboundStore); this array exists for any future domain that adds
 * simple decorative queue entries before it has its own store.
 */
export const STATIC_TASKS: OperatorTask[] = [];
```

- [ ] **Step 2: Verify the app builds and tests pass**

Run: `pnpm nx build ikho-ui` and `pnpm nx test ikho-ui` from `source/`.
Expected: both fully clean — `STATIC_TASKS.map(...)` over an empty array is valid, no downstream breakage.

- [ ] **Step 3: Commit**

```bash
git add source/apps/ikho-ui/src/app/core/mock-data/tasks.data.ts
git commit -m "feat(ikho-ui): retire the PIK-3318 static pick task"
```

---

## Task 6: Wire Outbound into `ADMIN_SCREENS`

**Files:**
- Modify: `source/apps/ikho-ui/src/app/core/mock-data/admin-screens.data.ts`

**Interfaces:**
- Consumes: `SALES_ORDERS` (Task 2), `ALLOCATIONS` (Task 3), `SHIPMENTS` (Task 4).
- Produces: `ADMIN_SCREENS.outbound.detailedTabId === 'main'`; `ADMIN_SCREENS.outbound.tabs[0].rows === SALES_ORDERS` with its `lines` column **renamed to `ordered`** (was an inline aggregate count/qty field with an ambiguous meaning; renamed to match the new `SalesOrder.ordered` field and avoid colliding with the new `SalesOrder.lines: SalesOrderLine[]` array); `tabs[1].rows === ALLOCATIONS`; `tabs[2].rows === SHIPMENTS`.

- [ ] **Step 1: Add imports**

At the top of `admin-screens.data.ts`, alongside the existing mock-data imports:

```typescript
import { ALLOCATIONS } from './allocations.data';
import { SALES_ORDERS } from './sales-orders.data';
import { SHIPMENTS } from './shipments.data';
```

- [ ] **Step 2: Update the `outbound` entry**

Replace the `outbound: { ... }` block — add `detailedTabId: 'main'`, rename the `main` tab's `lines` column to `ordered` and point rows at `SALES_ORDERS`, point `allocations` tab rows at `ALLOCATIONS`, point `shipments` tab rows at `SHIPMENTS`:

```typescript
  outbound: {
    panelTitle: { en: 'Sales orders', vi: 'Đơn bán hàng' },
    panelSubtitle: { en: 'Allocation and dispatch · cut-off 17:00', vi: 'Phân bổ và xuất hàng · chốt 17:00' },
    detailedTabId: 'main',
    kpis: [
      { label: { en: 'Open orders', vi: 'Đơn đang mở' }, value: '52' },
      { label: { en: 'Allocated', vi: 'Đã phân bổ' }, value: '41' },
      { label: { en: 'Dispatched today', vi: 'Đã xuất hôm nay' }, value: '28' },
      { label: { en: 'Late', vi: 'Trễ' }, value: '3', trendStatus: 'out-of-stock' },
    ],
    tabs: [
      {
        id: 'main',
        label: { en: 'Sales orders', vi: 'Đơn bán hàng' },
        columns: [
          { key: 'so', label: same('SO'), mono: true },
          { key: 'customer', label: { en: 'Customer', vi: 'Khách hàng' } },
          { key: 'ordered', label: { en: 'Ordered', vi: 'Đã đặt' }, align: 'right', mono: true },
          { key: 'allocated', label: { en: 'Allocated', vi: 'Đã phân bổ' }, align: 'right', mono: true },
          { key: 'dock', label: { en: 'Dock', vi: 'Cửa' } },
          { key: 'cutoff', label: { en: 'Cut-off', vi: 'Giờ chốt' }, mono: true },
          { key: 'status', label: { en: 'Status', vi: 'Trạng thái' }, status: true },
        ],
        rows: SALES_ORDERS,
      },
      {
        id: 'allocations',
        label: { en: 'Allocations', vi: 'Phân bổ' },
        subtitle: { en: 'Claims on available stock per order line', vi: 'Giữ tồn khả dụng theo dòng đơn hàng' },
        columns: [
          { key: 'so', label: same('SO'), mono: true },
          { key: 'sku', label: same('SKU'), mono: true },
          { key: 'bin', label: { en: 'Bin', vi: 'Ô kệ' }, mono: true },
          { key: 'qty', label: { en: 'Quantity', vi: 'Số lượng' }, align: 'right', mono: true },
          { key: 'status', label: { en: 'Status', vi: 'Trạng thái' }, status: true },
        ],
        rows: ALLOCATIONS,
      },
      {
        id: 'shipments',
        label: { en: 'Shipments', vi: 'Lô xuất' },
        subtitle: { en: 'Dispatched directly from confirmed allocations', vi: 'Xuất trực tiếp từ phân bổ đã xác nhận' },
        columns: [
          { key: 'shipment', label: { en: 'Shipment', vi: 'Lô xuất' }, mono: true },
          { key: 'so', label: same('SO'), mono: true },
          { key: 'carrier', label: { en: 'Carrier', vi: 'Đơn vị vận chuyển' } },
          { key: 'dock', label: { en: 'Dock', vi: 'Cửa' } },
          { key: 'departure', label: { en: 'Departure', vi: 'Giờ khởi hành' }, mono: true },
          { key: 'status', label: { en: 'Status', vi: 'Trạng thái' }, status: true },
        ],
        rows: SHIPMENTS,
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
git commit -m "feat(ikho-ui): point ADMIN_SCREENS.outbound at typed mock data"
```

---

## Task 7: `OutboundStore`

**Files:**
- Create: `source/apps/ikho-ui/src/app/core/state/outbound-store.ts`
- Test: `source/apps/ikho-ui/src/app/core/state/outbound-store.spec.ts`

**Interfaces:**
- Consumes: `SALES_ORDERS`/`SalesOrder`/`SalesOrderLine` (Task 2), `ALLOCATIONS`/`Allocation` (Task 3), `SHIPMENTS`/`Shipment` (Task 4), `PRODUCTS` (existing).
- Produces: `OutboundStore` (`providedIn: 'root'`) with `salesOrders: Signal<SalesOrder[]>`, `allocations: Signal<Allocation[]>`, `shipments: Signal<Shipment[]>`, `createSalesOrder(input: CreateSalesOrderInput): SalesOrder`, `allocate(soId: string): AllocateResult`, `dispatch(soId: string): DispatchResult`. Also exports `CreateSalesOrderInput`, `CreateSalesOrderLineInput`, `AllocateResult`, `DispatchResult`. Consumed by Tasks 8, 10, 11, 13.

- [ ] **Step 1: Write the failing tests**

```typescript
import { OutboundStore } from './outbound-store';

describe('OutboundStore', () => {
  let store: OutboundStore;

  beforeEach(() => {
    store = new OutboundStore();
  });

  it('seeds sales orders, allocations and shipments from mock data', () => {
    expect(store.salesOrders().length).toBeGreaterThan(0);
    expect(store.allocations().length).toBeGreaterThan(0);
    expect(store.shipments().length).toBeGreaterThan(0);
  });

  it('createSalesOrder prepends a new order with aggregated ordered qty and zero allocation', () => {
    const order = store.createSalesOrder({
      customer: 'Test Retail BV',
      dock: 'Dock 9',
      cutoff: '15:00',
      lines: [{ sku: 'IKH-482910', qty: 10 }],
    });

    expect(store.salesOrders()[0]).toBe(order);
    expect(order.ordered).toBe(10);
    expect(order.allocated).toBe(0);
    expect(order.status).toBe('inbound');
    expect(order.lines[0].productName.en).toBe('Steel shelving bracket, 400mm');
  });

  it('allocate succeeds for a fully-stocked order and records an allocation per line', () => {
    const allocationsBefore = store.allocations().length;
    const order = store.createSalesOrder({ customer: 'Test Retail BV', dock: 'Dock 5', cutoff: '16:00', lines: [{ sku: 'IKH-482910', qty: 10 }] });

    const result = store.allocate(order.so);

    expect(result.ok).toBe(true);
    const updated = store.salesOrders().find((o) => o.so === order.so)!;
    expect(updated.status).toBe('outbound');
    expect(updated.allocated).toBe(10);
    expect(updated.lines[0].allocatedQty).toBe(10);
    expect(store.allocations().length).toBe(allocationsBefore + 1);
  });

  it('allocate fails with insufficient stock and leaves the order unallocated', () => {
    const allocationsBefore = store.allocations().length;

    const result = store.allocate('SO-88208');

    expect(result.ok).toBe(false);
    const order = store.salesOrders().find((o) => o.so === 'SO-88208')!;
    expect(order.status).toBe('inbound');
    expect(order.allocated).toBe(0);
    expect(store.allocations().length).toBe(allocationsBefore);
  });

  it('dispatch succeeds for an allocated order, creates a shipment, and clears its allocations', () => {
    const shipmentsBefore = store.shipments().length;

    const result = store.dispatch('SO-88219');

    expect(result.ok).toBe(true);
    const order = store.salesOrders().find((o) => o.so === 'SO-88219')!;
    expect(order.status).toBe('in-stock');
    expect(store.shipments().length).toBe(shipmentsBefore + 1);
    expect(store.allocations().some((a) => a.so === 'SO-88219')).toBe(false);
  });

  it('dispatch fails for an order that is not allocated', () => {
    const shipmentsBefore = store.shipments().length;

    const result = store.dispatch('SO-88208');

    expect(result.ok).toBe(false);
    expect(store.shipments().length).toBe(shipmentsBefore);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm nx test ikho-ui --include="**/outbound-store.spec.ts"`
Expected: FAIL — `outbound-store.ts` does not exist yet.

- [ ] **Step 3: Implement `OutboundStore`**

```typescript
import { Injectable, signal } from '@angular/core';
import { Localized } from '../i18n/localized.type';
import { Allocation, ALLOCATIONS } from '../mock-data/allocations.data';
import { PRODUCTS } from '../mock-data/products.data';
import { SalesOrder, SalesOrderLine, SALES_ORDERS } from '../mock-data/sales-orders.data';
import { Shipment, SHIPMENTS } from '../mock-data/shipments.data';

export interface CreateSalesOrderLineInput {
  sku: string;
  qty: number;
}

export interface CreateSalesOrderInput {
  customer: string;
  dock: string;
  cutoff: string;
  lines: CreateSalesOrderLineInput[];
}

export type AllocateResult = { ok: true } | { ok: false; error: string };
export type DispatchResult = { ok: true; shipment: Shipment } | { ok: false; error: string };

let soSeq = 88300;
let shipmentSeq = 51200;

function productName(sku: string): Localized<string> {
  return PRODUCTS.find((p) => p.sku === sku)?.name ?? { en: sku, vi: sku };
}

@Injectable({ providedIn: 'root' })
export class OutboundStore {
  readonly salesOrders = signal<SalesOrder[]>([...SALES_ORDERS]);
  readonly allocations = signal<Allocation[]>([...ALLOCATIONS]);
  readonly shipments = signal<Shipment[]>([...SHIPMENTS]);

  createSalesOrder(input: CreateSalesOrderInput): SalesOrder {
    const lines: SalesOrderLine[] = input.lines.map((line) => ({
      sku: line.sku,
      productName: productName(line.sku),
      orderedQty: line.qty,
      allocatedQty: 0,
    }));

    const order: SalesOrder = {
      so: `SO-${soSeq++}`,
      customer: input.customer,
      ordered: lines.reduce((sum, l) => sum + l.orderedQty, 0),
      allocated: 0,
      dock: input.dock,
      cutoff: input.cutoff,
      status: 'inbound',
      label: { en: 'Open', vi: 'Đang mở' },
      lines,
    };

    this.salesOrders.update((orders) => [order, ...orders]);
    return order;
  }

  allocate(soId: string): AllocateResult {
    const order = this.salesOrders().find((o) => o.so === soId);
    if (!order) return { ok: false, error: `Sales order '${soId}' was not found.` };

    const insufficient = order.lines.filter((l) => {
      const product = PRODUCTS.find((p) => p.sku === l.sku);
      return !product || product.qty < l.orderedQty;
    });
    if (insufficient.length > 0) {
      const skus = insufficient.map((l) => l.sku).join(', ');
      return { ok: false, error: `Insufficient stock to allocate: ${skus}.` };
    }

    const updatedLines = order.lines.map((l) => ({ ...l, allocatedQty: l.orderedQty }));
    const updatedOrder: SalesOrder = {
      ...order,
      lines: updatedLines,
      allocated: order.ordered,
      status: 'outbound',
      label: { en: 'Allocated', vi: 'Đã phân bổ' },
    };
    this.salesOrders.update((orders) => orders.map((o) => (o.so === soId ? updatedOrder : o)));

    const newAllocations: Allocation[] = updatedLines.map((l) => ({
      so: soId,
      sku: l.sku,
      bin: PRODUCTS.find((p) => p.sku === l.sku)?.bin ?? '—',
      qty: l.orderedQty,
      status: 'outbound',
      label: { en: 'Reserved', vi: 'Đã giữ' },
    }));
    this.allocations.update((allocs) => [...allocs, ...newAllocations]);

    return { ok: true };
  }

  dispatch(soId: string): DispatchResult {
    const order = this.salesOrders().find((o) => o.so === soId);
    if (!order || order.allocated <= 0 || order.allocated !== order.ordered) {
      return { ok: false, error: `Sales order '${soId}' is not fully allocated.` };
    }

    const shipment: Shipment = {
      shipment: `SHP-${shipmentSeq++}`,
      so: soId,
      carrier: 'Standard Freight',
      dock: order.dock,
      departure: 'Now',
      status: 'in-stock',
      label: { en: 'Departed', vi: 'Đã rời kho' },
    };
    this.shipments.update((s) => [shipment, ...s]);

    const updatedOrder: SalesOrder = { ...order, status: 'in-stock', label: { en: 'Dispatched', vi: 'Đã xuất' } };
    this.salesOrders.update((orders) => orders.map((o) => (o.so === soId ? updatedOrder : o)));

    this.allocations.update((allocs) => allocs.filter((a) => a.so !== soId));

    return { ok: true, shipment };
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm nx test ikho-ui --include="**/outbound-store.spec.ts"`
Expected: PASS (6 tests: seeds, createSalesOrder, allocate-succeeds, allocate-fails, dispatch-succeeds, dispatch-fails)

- [ ] **Step 5: Commit**

```bash
git add source/apps/ikho-ui/src/app/core/state/outbound-store.ts source/apps/ikho-ui/src/app/core/state/outbound-store.spec.ts
git commit -m "feat(ikho-ui): add OutboundStore for mock sales order/allocation/shipment state"
```

---

## Task 8: `OfficeOutbound` component

**Files:**
- Create: `source/apps/ikho-ui/src/app/features/office/outbound/office-outbound.ts`
- Test: `source/apps/ikho-ui/src/app/features/office/outbound/office-outbound.spec.ts`

**Interfaces:**
- Consumes: `OfficeScreen`/`OfficeDetailPanel` (Task 1, with the new `action` field), `ADMIN_SCREENS.outbound` (Task 6), `OutboundStore` (Task 7), `PRODUCTS` (existing), `resolveKpis`/`resolveTabs` (existing), `resolveStatusLabel` (existing), `Button`/`DataPanel`/`TextInput` (existing shared-ui).
- Produces: `OfficeOutbound` component, selector `app-office-outbound`. Consumed by Task 9's route.

- [ ] **Step 1: Write the failing test**

```typescript
import { provideRouter } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { OfficeOutbound } from './office-outbound';

describe('OfficeOutbound', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OfficeOutbound],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('renders the sales orders table with seeded rows', () => {
    const fixture = TestBed.createComponent(OfficeOutbound);
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('SO-88214');
    expect(text).toContain('Meijer Retail Group');
  });

  it('opens the create-sales-order form when the primary action fires, and adds a row on submit', () => {
    const fixture = TestBed.createComponent(OfficeOutbound);
    fixture.detectChanges();

    const instance = fixture.componentInstance as unknown as {
      showCreateForm: { set: (v: boolean) => void };
      formCustomer: { set: (v: string) => void };
      formDock: { set: (v: string) => void };
      formCutoff: { set: (v: string) => void };
      updateLineSku: (i: number, v: string) => void;
      updateLineQty: (i: number, v: string) => void;
      submitCreate: () => void;
    };

    instance.showCreateForm.set(true);
    instance.formCustomer.set('New Retail BV');
    instance.formDock.set('Dock 5');
    instance.formCutoff.set('16:00');
    instance.updateLineSku(0, 'IKH-482910');
    instance.updateLineQty(0, '10');
    instance.submitCreate();
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('New Retail BV');
  });

  it('allocating an unallocated order via its detail action updates its status, and an insufficient-stock order surfaces the error', () => {
    const fixture = TestBed.createComponent(OfficeOutbound);
    fixture.detectChanges();

    const instance = fixture.componentInstance as unknown as {
      detail: () => (row: Record<string, unknown>) => { action?: { label: string; onClick: () => void } };
      allocateError: () => string | null;
    };

    const detailFn = instance.detail();
    const openOrderRow = { so: 'SO-88208', customer: 'Hafen Bremen GmbH', dock: 'Dock 1', cutoff: '17:00', status: 'inbound', label: { en: 'Open', vi: 'Đang mở' }, lines: [{ sku: 'IKH-664120', productName: { en: 'Pallet wrap film, 500mm', vi: 'Màng quấn pallet, 500mm' }, orderedQty: 32, allocatedQty: 0 }] };

    const panel = detailFn(openOrderRow);
    expect(panel.action).toBeTruthy();

    panel.action!.onClick();
    fixture.detectChanges();

    expect(instance.allocateError()).toContain('Insufficient stock');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm nx test ikho-ui --include="**/office-outbound.spec.ts"`
Expected: FAIL — `office-outbound.ts` does not exist yet.

- [ ] **Step 3: Implement `OfficeOutbound`**

```typescript
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Button, DataPanel, TextInput } from '@ikho/shared-ui';
import { LangService } from '../../../core/i18n/lang.service';
import { Localized } from '../../../core/i18n/localized.type';
import { resolveStatusLabel } from '../../../core/i18n/status-label.util';
import { resolveKpis, resolveTabs } from '../../../core/mock-data/admin-screen.util';
import { ADMIN_SCREENS } from '../../../core/mock-data/admin-screens.data';
import { PRODUCTS } from '../../../core/mock-data/products.data';
import { screenMeta, screenTitle, SCREENS } from '../../../core/mock-data/screens.data';
import { OutboundStore } from '../../../core/state/outbound-store';
import { OfficeDetailPanel, OfficeScreen } from '../../../shared/components/office-screen/office-screen';

const DATA = ADMIN_SCREENS.outbound;

interface DraftLine {
  sku: string;
  qty: string;
}

@Component({
  selector: 'app-office-outbound',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Button, DataPanel, OfficeScreen, TextInput],
  template: `
    @if (allocateError(); as err) {
      <div class="rounded-lg bg-status-out-of-stock-10 px-4 py-3 font-core text-sm text-status-out-of-stock">{{ err }}</div>
    }
    @if (showCreateForm()) {
      <lib-data-panel [title]="formTitle()" [subtitle]="formSubtitle()">
        <div class="flex flex-col gap-4">
          <div class="grid grid-cols-3 gap-4">
            <lib-text-input [label]="customerLabel()" [value]="formCustomer()" (valueChange)="formCustomer.set($event)" />
            <lib-text-input [label]="dockLabel()" [value]="formDock()" (valueChange)="formDock.set($event)" />
            <lib-text-input [label]="cutoffLabel()" [value]="formCutoff()" (valueChange)="formCutoff.set($event)" />
          </div>
          @for (line of formLines(); track $index; let i = $index) {
            <div class="flex items-end gap-3">
              <lib-text-input [label]="skuLabel()" [value]="line.sku" (valueChange)="updateLineSku(i, $event)" />
              <lib-text-input [label]="qtyLabel()" type="number" [value]="line.qty" (valueChange)="updateLineQty(i, $event)" />
              @if (formLines().length > 1) {
                <lib-button variant="ghost" (click)="removeLine(i)">{{ removeLabel() }}</lib-button>
              }
            </div>
          }
          @if (formError(); as err) {
            <span class="font-core text-xs text-status-out-of-stock">{{ err }}</span>
          }
          <div class="flex gap-3">
            <lib-button variant="secondary" (click)="addLine()">{{ addLineLabel() }}</lib-button>
            <lib-button variant="primary" (click)="submitCreate()">{{ submitLabel() }}</lib-button>
            <lib-button variant="ghost" (click)="cancelCreate()">{{ cancelLabel() }}</lib-button>
          </div>
        </div>
      </lib-data-panel>
    }
    <app-office-screen
      [title]="title()"
      [meta]="meta()"
      [primaryActionLabel]="primaryActionLabel()"
      [kpis]="kpis()"
      [tabs]="tabs()"
      [detailedTabId]="'main'"
      [searchPlaceholder]="searchPlaceholder()"
      [searchFields]="searchFields"
      [rowKey]="rowKey"
      [detail]="detail()"
      (primaryAction)="showCreateForm.set(true)"
    />
  `,
})
export class OfficeOutbound {
  private readonly lang = inject(LangService);
  private readonly store = inject(OutboundStore);

  protected readonly title = computed(() => screenTitle('outbound', 'admin', this.lang.lang()));
  protected readonly meta = computed(() => screenMeta('outbound', 'admin', this.lang.lang()));
  protected readonly primaryActionLabel = computed(() => SCREENS.outbound.action[this.lang.lang()]);
  protected readonly kpis = computed(() => resolveKpis(DATA.kpis, this.lang.lang()));

  protected readonly tabs = computed(() =>
    resolveTabs(
      [
        { ...DATA.tabs[0], rows: this.store.salesOrders() },
        { ...DATA.tabs[1], rows: this.store.allocations() },
        { ...DATA.tabs[2], rows: this.store.shipments() },
      ],
      this.lang.lang(),
    ),
  );

  protected readonly searchPlaceholder = computed(() =>
    this.lang.lang() === 'en' ? 'Search SO, customer' : 'Tìm đơn bán, khách hàng',
  );
  protected readonly searchFields = ['so', 'customer'];
  protected readonly rowKey = (row: Record<string, unknown>) => String(row['so']);

  protected readonly allocateError = signal<string | null>(null);

  protected readonly detail = computed(() => {
    const lang = this.lang.lang();
    const eyebrow = lang === 'en' ? 'Sales order detail' : 'Chi tiết đơn bán';
    const shipmentsLabel = lang === 'en' ? 'Shipments' : 'Lô xuất';
    const allocateLabel = lang === 'en' ? 'Allocate' : 'Phân bổ';
    return (row: Record<string, unknown>): OfficeDetailPanel => {
      const status = row['status'] as OfficeDetailPanel['status'];
      const soId = String(row['so']);
      const lines = row['lines'] as { sku: string; productName: Localized<string>; orderedQty: number; allocatedQty: number }[];
      const soShipments = this.store.shipments().filter((s) => s.so === soId);
      return {
        eyebrow,
        title: String(row['customer']),
        code: soId,
        status,
        statusLabel: resolveStatusLabel({ status, label: row['label'] as Localized<string> | undefined }, lang),
        fields: [
          { label: lang === 'en' ? 'Dock' : 'Cửa kho', value: String(row['dock']) },
          { label: lang === 'en' ? 'Cut-off' : 'Giờ chốt', value: String(row['cutoff']) },
          ...lines.map((l) => ({ label: l.productName[lang], value: `${l.allocatedQty} / ${l.orderedQty}` })),
          { label: shipmentsLabel, value: soShipments.length ? soShipments.map((s) => `${s.shipment} (${s.carrier})`).join(', ') : '—' },
        ],
        action: status === 'inbound' ? { label: allocateLabel, onClick: () => this.handleAllocate(soId) } : undefined,
      };
    };
  });

  protected handleAllocate(soId: string): void {
    const result = this.store.allocate(soId);
    this.allocateError.set(result.ok ? null : result.error);
  }

  protected readonly formTitle = computed(() => (this.lang.lang() === 'en' ? 'Create sales order' : 'Tạo đơn bán hàng'));
  protected readonly formSubtitle = computed(() =>
    this.lang.lang() === 'en' ? 'Customer, dock, cut-off and ordered lines' : 'Khách hàng, cửa kho, giờ chốt và dòng đặt hàng',
  );
  protected readonly customerLabel = computed(() => (this.lang.lang() === 'en' ? 'Customer' : 'Khách hàng'));
  protected readonly dockLabel = computed(() => (this.lang.lang() === 'en' ? 'Dock' : 'Cửa kho'));
  protected readonly cutoffLabel = computed(() => (this.lang.lang() === 'en' ? 'Cut-off' : 'Giờ chốt'));
  protected readonly skuLabel = computed(() => 'SKU');
  protected readonly qtyLabel = computed(() => (this.lang.lang() === 'en' ? 'Quantity' : 'Số lượng'));
  protected readonly addLineLabel = computed(() => (this.lang.lang() === 'en' ? 'Add line' : 'Thêm dòng'));
  protected readonly removeLabel = computed(() => (this.lang.lang() === 'en' ? 'Remove' : 'Xoá'));
  protected readonly submitLabel = computed(() => (this.lang.lang() === 'en' ? 'Create' : 'Tạo'));
  protected readonly cancelLabel = computed(() => (this.lang.lang() === 'en' ? 'Cancel' : 'Huỷ'));

  protected readonly showCreateForm = signal(false);
  protected readonly formCustomer = signal('');
  protected readonly formDock = signal('');
  protected readonly formCutoff = signal('');
  protected readonly formLines = signal<DraftLine[]>([{ sku: '', qty: '' }]);
  protected readonly formError = signal<string | null>(null);

  protected addLine(): void {
    this.formLines.update((lines) => [...lines, { sku: '', qty: '' }]);
  }

  protected removeLine(index: number): void {
    this.formLines.update((lines) => lines.filter((_, i) => i !== index));
  }

  protected updateLineSku(index: number, sku: string): void {
    this.formLines.update((lines) => lines.map((l, i) => (i === index ? { ...l, sku } : l)));
  }

  protected updateLineQty(index: number, qty: string): void {
    this.formLines.update((lines) => lines.map((l, i) => (i === index ? { ...l, qty } : l)));
  }

  protected submitCreate(): void {
    const customer = this.formCustomer().trim();
    const dock = this.formDock().trim();
    const cutoff = this.formCutoff().trim();
    const lang = this.lang.lang();

    if (!customer || !dock || !cutoff) {
      this.formError.set(lang === 'en' ? 'Customer, dock and cut-off are required.' : 'Cần nhập khách hàng, cửa kho và giờ chốt.');
      return;
    }

    const lines: { sku: string; qty: number }[] = [];
    for (const line of this.formLines()) {
      const sku = line.sku.trim();
      const qty = Number(line.qty);
      if (!sku || !PRODUCTS.some((p) => p.sku === sku)) {
        this.formError.set(lang === 'en' ? `Unknown SKU: ${sku || '(empty)'}` : `SKU không hợp lệ: ${sku || '(trống)'}`);
        return;
      }
      if (!Number.isFinite(qty) || qty <= 0) {
        this.formError.set(lang === 'en' ? `Quantity for ${sku} must be greater than 0.` : `Số lượng của ${sku} phải lớn hơn 0.`);
        return;
      }
      lines.push({ sku, qty });
    }

    this.store.createSalesOrder({ customer, dock, cutoff, lines });
    this.formError.set(null);
    this.formCustomer.set('');
    this.formDock.set('');
    this.formCutoff.set('');
    this.formLines.set([{ sku: '', qty: '' }]);
    this.showCreateForm.set(false);
  }

  protected cancelCreate(): void {
    this.formError.set(null);
    this.showCreateForm.set(false);
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm nx test ikho-ui --include="**/office-outbound.spec.ts"`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add source/apps/ikho-ui/src/app/features/office/outbound/office-outbound.ts source/apps/ikho-ui/src/app/features/office/outbound/office-outbound.spec.ts
git commit -m "feat(ikho-ui): add dedicated OfficeOutbound screen with allocate action and inline create form"
```

---

## Task 9: Route Office Console's Outbound to `OfficeOutbound`

**Files:**
- Modify: `source/apps/ikho-ui/src/app/features/office/office.routes.ts`
- Modify: `source/apps/ikho-ui/src/app/features/office/generic-screen/office-generic-screen.ts`

**Interfaces:**
- Consumes: `OfficeOutbound` (Task 8).

- [ ] **Step 1: Update `office.routes.ts`**

Replace `genericScreen('outbound'),` with a dedicated route entry (keep it in the same list position):

```typescript
  {
    path: 'outbound',
    loadComponent: () => import('./outbound/office-outbound').then((m) => m.OfficeOutbound),
  },
  genericScreen('organization'),
  genericScreen('partners'),
  genericScreen('returns'),
  genericScreen('billing'),
  genericScreen('reporting'),
```

- [ ] **Step 2: Update `GenericScreenId` in `office-generic-screen.ts`**

```typescript
type GenericScreenId = Exclude<ScreenId, 'dashboard' | 'catalogue' | 'inventory' | 'inbound' | 'outbound'>;
```

- [ ] **Step 3: Verify the app builds**

Run: `pnpm nx build ikho-ui`
Expected: clean build.

- [ ] **Step 4: Commit**

```bash
git add source/apps/ikho-ui/src/app/features/office/office.routes.ts source/apps/ikho-ui/src/app/features/office/generic-screen/office-generic-screen.ts
git commit -m "feat(ikho-ui): route Office Outbound to the dedicated screen"
```

---

## Task 10: `OperatorOutboundEntry` component

**Files:**
- Create: `source/apps/ikho-ui/src/app/features/operator/outbound/operator-outbound-entry.ts`
- Test: `source/apps/ikho-ui/src/app/features/operator/outbound/operator-outbound-entry.spec.ts`

**Interfaces:**
- Consumes: `OutboundStore` (Task 7).
- Produces: `OperatorOutboundEntry` component, selector `app-operator-outbound-entry`. Navigates to `/operator/outbound/dispatch/:soId` (route added in Task 12).

- [ ] **Step 1: Write the failing test**

```typescript
import { Router } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { OperatorOutboundEntry } from './operator-outbound-entry';

describe('OperatorOutboundEntry', () => {
  let navigateCalls: unknown[][];

  beforeEach(async () => {
    navigateCalls = [];
    await TestBed.configureTestingModule({
      imports: [OperatorOutboundEntry],
      providers: [
        { provide: Router, useValue: { navigate: (...args: unknown[]) => navigateCalls.push(args) } },
      ],
    }).compileComponents();
  });

  it('shows only allocated, not-yet-dispatched sales orders', () => {
    const fixture = TestBed.createComponent(OperatorOutboundEntry);
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('SO-88219');
    expect(text).toContain('SO-88222');
    expect(text).not.toContain('SO-88214');
    expect(text).not.toContain('SO-88208');
  });

  it('navigates to the dispatch-confirm flow when a card is opened', () => {
    const fixture = TestBed.createComponent(OperatorOutboundEntry);
    fixture.detectChanges();

    (fixture.componentInstance as unknown as { openDispatch: (id: string) => void }).openDispatch('SO-88219');

    expect(navigateCalls[0][0]).toEqual(['/operator/outbound/dispatch', 'SO-88219']);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm nx test ikho-ui --include="**/operator-outbound-entry.spec.ts"`
Expected: FAIL — `operator-outbound-entry.ts` does not exist yet.

- [ ] **Step 3: Implement `OperatorOutboundEntry`**

```typescript
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Icon, StatusBadge } from '@ikho/shared-ui';
import { LangService } from '../../../core/i18n/lang.service';
import { resolveStatusLabel } from '../../../core/i18n/status-label.util';
import { OutboundStore } from '../../../core/state/outbound-store';

@Component({
  selector: 'app-operator-outbound-entry',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon, StatusBadge],
  host: { class: 'flex flex-col gap-6' },
  template: `
    <div class="flex flex-col gap-3.5">
      @for (so of dispatchReady(); track so.so) {
        <div
          class="flex min-h-14 cursor-pointer items-center gap-[18px] rounded-lg bg-canvas-operator-elevated p-5"
          tabindex="0"
          role="button"
          (click)="openDispatch(so.so)"
          (keydown.enter)="openDispatch(so.so)"
        >
          <lib-icon name="package-check" [size]="32" color="var(--color-accent-teal)" />
          <div class="flex min-w-0 flex-1 flex-col gap-1.5">
            <div class="flex items-center gap-2.5">
              <span class="font-mono text-xs text-shade-40">{{ so.so }}</span>
              <lib-status-badge [status]="so.status" [label]="so.statusLabel" />
            </div>
            <span class="font-core text-xl font-bold text-on-primary">{{ so.customer }}</span>
            <span class="font-mono text-sm text-accent-teal">{{ so.dock }} · {{ so.cutoff }}</span>
          </div>
          <lib-icon name="chevron-right" [size]="28" color="var(--color-shade-50)" />
        </div>
      } @empty {
        <div class="p-6 font-core text-[15px] text-shade-40">{{ emptyLabel() }}</div>
      }
    </div>
  `,
})
export class OperatorOutboundEntry {
  private readonly router = inject(Router);
  protected readonly lang = inject(LangService);
  private readonly store = inject(OutboundStore);

  protected readonly dispatchReady = computed(() => {
    const lang = this.lang.lang();
    return this.store
      .salesOrders()
      .filter((so) => so.status === 'outbound')
      .map((so) => ({ ...so, statusLabel: resolveStatusLabel(so, lang) }));
  });

  protected readonly emptyLabel = computed(() => (this.lang.lang() === 'en' ? 'Nothing here right now' : 'Hiện chưa có gì'));

  protected openDispatch(soId: string): void {
    this.router.navigate(['/operator/outbound/dispatch', soId]);
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm nx test ikho-ui --include="**/operator-outbound-entry.spec.ts"`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add source/apps/ikho-ui/src/app/features/operator/outbound/operator-outbound-entry.ts source/apps/ikho-ui/src/app/features/operator/outbound/operator-outbound-entry.spec.ts
git commit -m "feat(ikho-ui): add operator Outbound entry list (dispatch-ready queue)"
```

---

## Task 11: `OperatorOutboundDispatch` component

**Files:**
- Create: `source/apps/ikho-ui/src/app/features/operator/outbound/operator-outbound-dispatch.ts`
- Test: `source/apps/ikho-ui/src/app/features/operator/outbound/operator-outbound-dispatch.spec.ts`

**Interfaces:**
- Consumes: `OutboundStore` (Task 7).
- Produces: `OperatorOutboundDispatch` component, selector `app-operator-outbound-dispatch`, `readonly soId = input.required<string>()` bound from the `:soId` route param (Task 12).

- [ ] **Step 1: Write the failing test**

```typescript
import { Router } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { OutboundStore } from '../../../core/state/outbound-store';
import { OperatorOutboundDispatch } from './operator-outbound-dispatch';

describe('OperatorOutboundDispatch', () => {
  let navigateCalls: unknown[][];

  beforeEach(async () => {
    navigateCalls = [];
    await TestBed.configureTestingModule({
      imports: [OperatorOutboundDispatch],
      providers: [
        { provide: Router, useValue: { navigate: (...args: unknown[]) => navigateCalls.push(args) } },
      ],
    }).compileComponents();
  });

  it('shows the order lines for the given soId', () => {
    const fixture = TestBed.createComponent(OperatorOutboundDispatch);
    fixture.componentRef.setInput('soId', 'SO-88219');
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Brico Bouwmarkt');
    expect(text).toContain('Corrugated box');
  });

  it('confirming dispatch calls the store, creates a shipment, and navigates back to the entry list', () => {
    const store = TestBed.inject(OutboundStore);
    const fixture = TestBed.createComponent(OperatorOutboundDispatch);
    fixture.componentRef.setInput('soId', 'SO-88219');
    fixture.detectChanges();

    const shipmentsBefore = store.shipments().length;

    (fixture.componentInstance as unknown as { confirm: () => void }).confirm();

    expect(store.shipments().length).toBe(shipmentsBefore + 1);
    expect(navigateCalls[0][0]).toEqual(['/operator/outbound']);
  });

  it('surfaces the store error and does not navigate if dispatch fails', () => {
    const fixture = TestBed.createComponent(OperatorOutboundDispatch);
    fixture.componentRef.setInput('soId', 'SO-88208');
    fixture.detectChanges();

    (fixture.componentInstance as unknown as { confirm: () => void }).confirm();
    fixture.detectChanges();

    const instance = fixture.componentInstance as unknown as { dispatchError: () => string | null };
    expect(instance.dispatchError()).toContain('not fully allocated');
    expect(navigateCalls.length).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm nx test ikho-ui --include="**/operator-outbound-dispatch.spec.ts"`
Expected: FAIL — `operator-outbound-dispatch.ts` does not exist yet.

- [ ] **Step 3: Implement `OperatorOutboundDispatch`**

```typescript
import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Button } from '@ikho/shared-ui';
import { LangService } from '../../../core/i18n/lang.service';
import { OutboundStore } from '../../../core/state/outbound-store';

@Component({
  selector: 'app-operator-outbound-dispatch',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Button],
  host: { class: 'flex flex-col gap-6' },
  template: `
    @if (!order()) {
      <div class="p-6 font-core text-[15px] text-shade-40">{{ notFoundLabel() }}</div>
    } @else {
      <div class="flex flex-col gap-5">
        <div class="flex flex-col gap-1 rounded-lg bg-canvas-operator-elevated p-6">
          <span class="font-mono text-xs text-shade-40">{{ order()!.so }}</span>
          <span class="font-core text-2xl font-bold text-on-primary">{{ order()!.customer }}</span>
          <span class="font-mono text-sm text-accent-teal">{{ order()!.dock }} · {{ cutoffLabel() }} {{ order()!.cutoff }}</span>
        </div>
        @for (line of order()!.lines; track line.sku) {
          <div class="flex flex-col gap-1 rounded-lg bg-canvas-operator-elevated p-5">
            <span class="font-core text-lg font-bold text-on-primary">{{ line.productName[lang.lang()] }}</span>
            <span class="font-mono text-sm text-accent-teal">{{ line.sku }} · {{ line.allocatedQty }} {{ unitsLabel() }}</span>
          </div>
        }
        @if (dispatchError(); as err) {
          <span class="font-core text-sm text-status-out-of-stock">{{ err }}</span>
        }
        <lib-button variant="operator" [fullWidth]="true" (click)="confirm()">{{ confirmLabel() }}</lib-button>
      </div>
    }
  `,
})
export class OperatorOutboundDispatch {
  private readonly router = inject(Router);
  protected readonly lang = inject(LangService);
  private readonly store = inject(OutboundStore);

  readonly soId = input.required<string>();

  protected readonly order = computed(() => this.store.salesOrders().find((o) => o.so === this.soId()));
  protected readonly dispatchError = signal<string | null>(null);

  protected readonly notFoundLabel = computed(() => (this.lang.lang() === 'en' ? 'Sales order not found' : 'Không tìm thấy đơn bán'));
  protected readonly cutoffLabel = computed(() => (this.lang.lang() === 'en' ? 'Cut-off:' : 'Giờ chốt:'));
  protected readonly unitsLabel = computed(() => (this.lang.lang() === 'en' ? 'units' : 'cái'));
  protected readonly confirmLabel = computed(() => (this.lang.lang() === 'en' ? 'Confirm dispatch' : 'Xác nhận xuất kho'));

  protected confirm(): void {
    const result = this.store.dispatch(this.soId());
    if (!result.ok) {
      this.dispatchError.set(result.error);
      return;
    }
    this.dispatchError.set(null);
    this.router.navigate(['/operator/outbound']);
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm nx test ikho-ui --include="**/operator-outbound-dispatch.spec.ts"`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add source/apps/ikho-ui/src/app/features/operator/outbound/operator-outbound-dispatch.ts source/apps/ikho-ui/src/app/features/operator/outbound/operator-outbound-dispatch.spec.ts
git commit -m "feat(ikho-ui): add operator dispatch-confirmation screen"
```

---

## Task 12: Route Operator Mode's Outbound to the new components

**Files:**
- Modify: `source/apps/ikho-ui/src/app/features/operator/operator.routes.ts`
- Modify: `source/apps/ikho-ui/src/app/features/operator/outlined-screen/operator-outlined-screen-route.ts`

**Interfaces:**
- Consumes: `OperatorOutboundEntry` (Task 10), `OperatorOutboundDispatch` (Task 11).

- [ ] **Step 1: Update `operator.routes.ts`**

Replace `outlinedScreen('outbound'),` with two route entries:

```typescript
  {
    path: 'outbound',
    loadComponent: () => import('./outbound/operator-outbound-entry').then((m) => m.OperatorOutboundEntry),
  },
  {
    path: 'outbound/dispatch/:soId',
    loadComponent: () => import('./outbound/operator-outbound-dispatch').then((m) => m.OperatorOutboundDispatch),
  },
  outlinedScreen('inventory'),
  outlinedScreen('returns'),
```

- [ ] **Step 2: Update `OutlinedScreenId` in `operator-outlined-screen-route.ts`**

```typescript
type OutlinedScreenId = Exclude<ScreenId, 'dashboard' | 'catalogue' | 'inbound' | 'outbound'>;
```

- [ ] **Step 3: Verify the app builds**

Run: `pnpm nx build ikho-ui`
Expected: clean build. Manually verify with `pnpm nx serve ikho-ui`: `/operator/outbound` loads the entry list, tapping an allocated order navigates to `/operator/outbound/dispatch/SO-88219`, and the sidebar's Outbound item stays highlighted on the nested dispatch route (same `segments[1]` mechanism already verified for Inbound).

- [ ] **Step 4: Commit**

```bash
git add source/apps/ikho-ui/src/app/features/operator/operator.routes.ts source/apps/ikho-ui/src/app/features/operator/outlined-screen/operator-outlined-screen-route.ts
git commit -m "feat(ikho-ui): route Operator Outbound to the new entry/dispatch screens"
```

---

## Task 13: Wire `OperatorDashboard` to dispatch-ready orders

**Files:**
- Modify: `source/apps/ikho-ui/src/app/features/operator/dashboard/operator-dashboard.ts`
- Modify: `source/apps/ikho-ui/src/app/features/operator/dashboard/operator-dashboard.spec.ts` (already exists from the Inbound module — two of its existing tests must change, not just gain new ones: the `QueueCard` shape changes from `taskId?: string` to `navTarget?: string[]` in this task, which breaks the existing click-navigation test's call shape; and the retired `PIK-3318` static task means the existing "alongside the static pick task" assertion no longer holds. Replace the whole file with the version below rather than patching around these — it removes the ambiguity of a partial edit.)

**Interfaces:**
- Consumes: `OutboundStore.salesOrders()` (Task 7), `InboundStore.putawayTasks()` (existing, unchanged), `STATIC_TASKS` (Task 5, now empty).
- Produces: `OperatorDashboard`'s task queue now merges three sources (putaway, dispatch-ready, static) and navigates dispatch-ready cards to `/operator/outbound/dispatch/:soId`. `QueueCard.navTarget?: string[]` replaces the previous `taskId?: string` field.

- [ ] **Step 1: Replace `operator-dashboard.spec.ts` in full**

```typescript
import { Router } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { InboundStore } from '../../../core/state/inbound-store';
import { OutboundStore } from '../../../core/state/outbound-store';
import { OperatorDashboard } from './operator-dashboard';

describe('OperatorDashboard', () => {
  let navigateCalls: unknown[][];

  beforeEach(async () => {
    navigateCalls = [];
    await TestBed.configureTestingModule({
      imports: [OperatorDashboard],
      providers: [
        { provide: Router, useValue: { navigate: (...args: unknown[]) => navigateCalls.push(args) } },
      ],
    }).compileComponents();
  });

  it('lists active putaway tasks from the store', () => {
    const fixture = TestBed.createComponent(OperatorDashboard);
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('PUT-7741');
  });

  it('reflects a confirmed putaway task disappearing from the queue', () => {
    const store = TestBed.inject(InboundStore);
    const fixture = TestBed.createComponent(OperatorDashboard);
    fixture.detectChanges();

    store.confirmPutaway('PUT-7741');
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).not.toContain('PUT-7741');
  });

  it('navigates to the putaway confirmation screen when a putaway task card is clicked', () => {
    const fixture = TestBed.createComponent(OperatorDashboard);
    fixture.detectChanges();

    (fixture.componentInstance as unknown as { onTaskClick: (t: { clickable: boolean; navTarget?: string[] }) => void }).onTaskClick({
      clickable: true,
      navTarget: ['/operator/inbound/putaway', 'PUT-7741'],
    });

    expect(navigateCalls[0][0]).toEqual(['/operator/inbound/putaway', 'PUT-7741']);
  });

  it('lists dispatch-ready sales orders from OutboundStore alongside putaway tasks', () => {
    const fixture = TestBed.createComponent(OperatorDashboard);
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('PUT-7741');
    expect(text).toContain('SO-88219');
  });

  it('reflects a dispatched sales order disappearing from the queue', () => {
    const store = TestBed.inject(OutboundStore);
    const fixture = TestBed.createComponent(OperatorDashboard);
    fixture.detectChanges();

    store.dispatch('SO-88219');
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).not.toContain('SO-88219');
  });

  it('navigates to the dispatch-confirm screen when a dispatch-ready card is clicked', () => {
    const fixture = TestBed.createComponent(OperatorDashboard);
    fixture.detectChanges();

    (fixture.componentInstance as unknown as { onTaskClick: (t: { clickable: boolean; navTarget?: string[] }) => void }).onTaskClick({
      clickable: true,
      navTarget: ['/operator/outbound/dispatch', 'SO-88219'],
    });

    expect(navigateCalls[0][0]).toEqual(['/operator/outbound/dispatch', 'SO-88219']);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm nx test ikho-ui --include="**/operator-dashboard.spec.ts"`
Expected: FAIL — dashboard doesn't source from `OutboundStore` yet, and `onTaskClick` only knows the old hardcoded putaway route.

- [ ] **Step 3: Replace `operator-dashboard.ts` contents**

```typescript
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Icon, StatusBadge, StockStatus } from '@ikho/shared-ui';
import { LangService } from '../../../core/i18n/lang.service';
import { OPERATOR_STATS, TASK_QUEUE_LABEL } from '../../../core/mock-data/dashboard.data';
import { STATIC_TASKS } from '../../../core/mock-data/tasks.data';
import { InboundStore } from '../../../core/state/inbound-store';
import { OutboundStore } from '../../../core/state/outbound-store';

interface QueueCard {
  id: string;
  status: StockStatus;
  icon: string;
  kind: string;
  title: string;
  route: string;
  qty: string;
  clickable: boolean;
  navTarget?: string[];
}

@Component({
  selector: 'app-operator-dashboard',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon, StatusBadge],
  host: { class: 'flex flex-col gap-6' },
  template: `
    <div class="grid grid-cols-3 gap-3.5">
      @for (s of stats(); track s.label) {
        <div class="flex flex-col gap-1.5 rounded-lg bg-canvas-operator-elevated p-[18px]">
          <span class="font-core text-[32px] font-bold text-accent-teal">{{ s.value }}</span>
          <span class="font-core text-micro tracking-[0.4px] text-shade-40 uppercase">{{ s.label }}</span>
        </div>
      }
    </div>

    <div class="flex flex-col gap-4">
      <span class="font-core text-sm font-semibold tracking-[0.5px] text-shade-40 uppercase">{{ queueLabel() }}</span>
      @for (task of tasks(); track task.id) {
        <div
          class="flex min-h-14 items-center gap-[18px] rounded-lg bg-canvas-operator-elevated p-5"
          [class.cursor-pointer]="task.clickable"
          [attr.tabindex]="task.clickable ? 0 : null"
          [attr.role]="task.clickable ? 'button' : null"
          (click)="onTaskClick(task)"
          (keydown.enter)="onTaskClick(task)"
        >
          <lib-icon [name]="task.icon" [size]="32" color="var(--color-accent-teal)" />
          <div class="flex min-w-0 flex-1 flex-col gap-1.5">
            <div class="flex items-center gap-2.5">
              <span class="font-mono text-xs text-shade-40">{{ task.id }}</span>
              <lib-status-badge [status]="task.status" [label]="task.kind" />
            </div>
            <span class="font-core text-xl font-bold text-on-primary">{{ task.title }}</span>
            <span class="font-mono text-sm text-accent-teal">{{ task.route }} · {{ task.qty }}</span>
          </div>
          <lib-icon name="chevron-right" [size]="28" color="var(--color-shade-50)" />
        </div>
      }
    </div>
  `,
})
export class OperatorDashboard {
  private readonly router = inject(Router);
  private readonly lang = inject(LangService);
  private readonly inboundStore = inject(InboundStore);
  private readonly outboundStore = inject(OutboundStore);

  protected readonly stats = computed(() =>
    OPERATOR_STATS.map((s) => ({ label: s.label[this.lang.lang()], value: s.value })),
  );
  protected readonly queueLabel = computed(() => this.lang.pick(TASK_QUEUE_LABEL));

  protected readonly tasks = computed<QueueCard[]>(() => {
    const lang = this.lang.lang();

    const putaway: QueueCard[] = this.inboundStore
      .putawayTasks()
      .filter((t) => t.status !== 'in-stock')
      .map((t) => ({
        id: t.id,
        status: t.status,
        icon: 'truck',
        kind: lang === 'en' ? 'Putaway' : 'Cất kho',
        title: t.productName[lang],
        route: `${t.fromDock} → ${t.toBin}`,
        qty: `${t.qty} ${lang === 'en' ? 'units' : 'cái'}`,
        clickable: true,
        navTarget: ['/operator/inbound/putaway', t.id],
      }));

    const dispatchReady: QueueCard[] = this.outboundStore
      .salesOrders()
      .filter((so) => so.status === 'outbound')
      .map((so) => ({
        id: so.so,
        status: so.status,
        icon: 'package-check',
        kind: lang === 'en' ? 'Dispatch' : 'Xuất kho',
        title: so.customer,
        route: `${so.dock} · ${so.cutoff}`,
        qty: `${so.ordered} ${lang === 'en' ? 'units' : 'cái'}`,
        clickable: true,
        navTarget: ['/operator/outbound/dispatch', so.so],
      }));

    const staticTasks: QueueCard[] = STATIC_TASKS.map((t) => ({
      id: t.id,
      status: t.status,
      icon: t.icon,
      kind: t.kind[lang],
      title: t.title[lang],
      route: t.route,
      qty: t.qty[lang],
      clickable: false,
    }));

    return [...putaway, ...dispatchReady, ...staticTasks];
  });

  protected onTaskClick(task: QueueCard): void {
    if (task.clickable && task.navTarget) {
      this.router.navigate(task.navTarget);
    }
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm nx test ikho-ui --include="**/operator-dashboard.spec.ts"`
Expected: PASS — 6 tests total (3 putaway-related, updated to the `navTarget` shape; 3 dispatch-ready, new).

- [ ] **Step 5: Commit**

```bash
git add source/apps/ikho-ui/src/app/features/operator/dashboard/operator-dashboard.ts source/apps/ikho-ui/src/app/features/operator/dashboard/operator-dashboard.spec.ts
git commit -m "feat(ikho-ui): source operator dashboard dispatch-ready orders from OutboundStore"
```

---

## Final verification

- [ ] **Run the full test suite and build**

```bash
pnpm nx test ikho-ui
pnpm nx build ikho-ui
```

Expected: all tests pass (existing suite plus the new spec files from this plan), production build succeeds with no type errors, SSR prerendering clean (no new parameterized routes need the client-render carve-out Inbound needed, since `:soId` here follows the exact same pattern as Inbound's already-fixed `:poId`/`:taskId` — verify this assumption holds rather than assuming it silently).

- [ ] **Manual smoke test**

Run: `pnpm nx serve ikho-ui`, then in the browser:
1. `/office/outbound` — confirm the 3 tabs render, click the still-open `SO-88208` row to see its detail panel with an "Allocate" button, click it and confirm it fails with an insufficient-stock message (this order intentionally over-orders a low-stock SKU). Click "Create sales order", submit a valid order with a well-stocked SKU, then open its detail panel and successfully allocate it.
2. `/operator/outbound` — confirm it lists the two seeded allocated orders (not the dispatched or open ones), tap one, confirm dispatch, and verify it returns to the entry list with that order gone from the queue and a new row in Office Console's Shipments tab.
3. `/operator/dashboard` — confirm dispatch-ready orders appear in the task queue alongside putaway tasks, and tapping one opens the dispatch-confirm screen.

- [ ] **Update the rollout tracking table**

In `docs/plans/warehouse-ui-rollout-plan.md`, set Outbound's "Implementation plan" column to link this file and update its status to "Implemented" once the above passes.
