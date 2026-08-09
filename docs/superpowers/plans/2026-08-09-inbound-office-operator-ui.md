# Inbound Office/Operator UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the placeholder Inbound screens in `ikho-ui` (Office Console's `OfficeGenericScreen`, Operator Mode's `OperatorOutlinedScreen`) with real, mock-data-driven screens covering Purchase Orders, dock receiving, and putaway — per `docs/superpowers/specs/2026-08-09-inbound-office-operator-ui-design.md`.

**Architecture:** A new `InboundStore` Angular service (signals, `providedIn: 'root'`) owns mutable in-memory mock state for purchase orders, receipts, and putaway tasks, seeded from existing/extended mock-data files. Office Console gets a dedicated `OfficeInbound` component (list+detail+inline create form) reusing the shared `OfficeScreen` shell. Operator Mode gets three new routed components (receiving entry list, dock-receiving stepper, putaway confirmation). No `HttpClient`; everything is mock-only per the spec's non-goals.

**Tech Stack:** Angular 19 standalone components, Signals, `@ikho/shared-ui` (Button, DataPanel, DataTable, Icon, KpiCard, StatusBadge, TextInput), vitest-angular (`TestBed`), Tailwind v4 utility classes against existing design tokens.

## Global Constraints

- No `HttpClient` — all data is in-memory mock state (spec non-goal: real API wiring is a future plan).
- No new shared Modal/Dialog component — "Create purchase order" is an inline expandable panel, not a modal (spec non-goal).
- Use only existing icon names from `libs/ikho-shared-ui/src/lib/icon/icon-paths.ts`: `layout-dashboard`, `building-2`, `package`, `users`, `boxes`, `truck`, `package-check`, `undo-2`, `receipt-text`, `chart-line`, `x`, `chevron-right`, `check`, `search`, `chevron-down`, `bell`, `menu`. Do not invent new icons.
- All user-facing strings are `{ en, vi }` `Localized<string>` pairs, resolved via `LangService.lang()` / `LangService.pick()`, matching the rest of the app.
- `OnPush` change detection, `standalone: true`, named exports, `inject()` for DI — per `CLAUDE.md` Angular conventions.
- Follow the existing flat/display-row mock-data convention (`Record<string, unknown>`-compatible interfaces with an index signature) rather than DTO-shaped mocks — this phase matches the codebase's current pattern, not the future real-API shape.
- Colocated `.spec.ts` tests per new/modified component and the store, following the `TestBed` + `fixture.componentInstance` pattern from `app.spec.ts` (the only existing test in the app).

---

## Task 1: `OfficeScreen` primary-action output

**Files:**
- Modify: `source/apps/ikho-ui/src/app/shared/components/office-screen/office-screen.ts`
- Test: `source/apps/ikho-ui/src/app/shared/components/office-screen/office-screen.spec.ts`

**Interfaces:**
- Produces: `OfficeScreen.primaryAction: OutputEmitterRef<void>` — emits when the primary-action button is clicked. Existing consumers (Catalogue, Inventory, Dashboard) are unaffected since they don't bind to it.

- [ ] **Step 1: Write the failing test**

```typescript
import { provideRouter } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { OfficeScreen } from './office-screen';

describe('OfficeScreen', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OfficeScreen],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('emits primaryAction when the primary button is clicked', () => {
    const fixture = TestBed.createComponent(OfficeScreen);
    fixture.componentRef.setInput('title', 'Inbound');
    fixture.componentRef.setInput('primaryActionLabel', 'Create purchase order');
    fixture.detectChanges();

    let callCount = 0;
    fixture.componentInstance.primaryAction.subscribe(() => callCount++);

    const button = (fixture.nativeElement as HTMLElement).querySelector('button') as HTMLButtonElement;
    button.click();

    expect(callCount).toBe(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm nx test ikho-ui --testFile=office-screen.spec.ts`
Expected: FAIL — `primaryAction` does not exist on `OfficeScreen`, or the click produces no emission.

- [ ] **Step 3: Add the output and wire the click handler**

In `office-screen.ts`, add the import and the output property, and wire the button's click:

```typescript
import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
```

```typescript
      @if (primaryActionLabel(); as label) {
        <lib-button variant="primary" (click)="primaryAction.emit()">{{ label }}</lib-button>
      }
```

```typescript
  readonly detail = input<(row: Record<string, unknown>) => OfficeDetailPanel | null>(() => null);

  readonly primaryAction = output<void>();
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm nx test ikho-ui --testFile=office-screen.spec.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add source/apps/ikho-ui/src/app/shared/components/office-screen/office-screen.ts source/apps/ikho-ui/src/app/shared/components/office-screen/office-screen.spec.ts
git commit -m "feat(ikho-ui): emit primaryAction from OfficeScreen"
```

---

## Task 2: Purchase order mock data

**Files:**
- Create: `source/apps/ikho-ui/src/app/core/mock-data/purchase-orders.data.ts`

**Interfaces:**
- Produces: `PurchaseOrderLine { sku: string; productName: Localized<string>; expectedQty: number; receivedQty: number }`, `PurchaseOrder { [key: string]: unknown; po: string; supplier: string; expected: number; received: number; dock: string; eta: string; status: StockStatus; label: Localized<string>; lines: PurchaseOrderLine[] }`, `PURCHASE_ORDERS: PurchaseOrder[]`.

This file has no runtime logic to unit test — its correctness is exercised by Task 6's store tests and Task 7/9's component tests. No standalone spec file for this task.

- [ ] **Step 1: Create the file**

```typescript
import { StockStatus } from '@ikho/shared-ui';
import { Localized } from '../i18n/localized.type';

export interface PurchaseOrderLine {
  sku: string;
  productName: Localized<string>;
  expectedQty: number;
  receivedQty: number;
}

export interface PurchaseOrder {
  [key: string]: unknown;
  po: string;
  supplier: string;
  expected: number;
  received: number;
  dock: string;
  eta: string;
  status: StockStatus;
  label: Localized<string>;
  lines: PurchaseOrderLine[];
}

export const PURCHASE_ORDERS: PurchaseOrder[] = [
  {
    po: 'PO-10482', supplier: 'Vanderberg Steel', expected: 40, received: 40, dock: 'Dock 3', eta: '09:30',
    status: 'in-stock', label: { en: 'Posted', vi: 'Đã ghi nhận' },
    lines: [
      { sku: 'IKH-482910', productName: { en: 'Steel shelving bracket, 400mm', vi: 'Giá đỡ kệ thép, 400mm' }, expectedQty: 40, receivedQty: 40 },
    ],
  },
  {
    po: 'PO-10488', supplier: 'Nordic Labels A/S', expected: 18, received: 12, dock: 'Dock 3', eta: '09:52',
    status: 'inbound', label: { en: 'Receiving', vi: 'Đang nhận' },
    lines: [
      { sku: 'IKH-330298', productName: { en: 'Barcode label roll, 100×50mm', vi: 'Cuộn tem mã vạch, 100×50mm' }, expectedQty: 18, receivedQty: 12 },
    ],
  },
  {
    po: 'PO-10490', supplier: 'EuroPallet NV', expected: 24, received: 0, dock: 'Dock 1', eta: '10:15',
    status: 'inbound', label: { en: 'Expected', vi: 'Dự kiến' },
    lines: [
      { sku: 'IKH-770145', productName: { en: 'Euro pallet, heat-treated', vi: 'Pallet Euro, xử lý nhiệt' }, expectedQty: 24, receivedQty: 0 },
    ],
  },
  {
    po: 'PO-10477', supplier: 'Wrapline BV', expected: 30, received: 6, dock: 'Dock 2', eta: '08:05',
    status: 'low-stock', label: { en: 'Short', vi: 'Thiếu' },
    lines: [
      { sku: 'IKH-664120', productName: { en: 'Pallet wrap film, 500mm', vi: 'Màng quấn pallet, 500mm' }, expectedQty: 30, receivedQty: 6 },
    ],
  },
];
```

- [ ] **Step 2: Commit**

```bash
git add source/apps/ikho-ui/src/app/core/mock-data/purchase-orders.data.ts
git commit -m "feat(ikho-ui): add purchase order mock data with line detail"
```

---

## Task 3: Extend receipt mock data with line detail

**Files:**
- Modify: `source/apps/ikho-ui/src/app/core/mock-data/receipts.data.ts`

**Interfaces:**
- Produces: `ReceiptLineDetail { sku: string; productName: Localized<string>; qty: number; exceptionReason?: Localized<string> }`. `Receipt` gains `lineDetails: ReceiptLineDetail[]`.
- Consumes: nothing new (existing `Receipt`/`RECEIPTS` shape is extended in place; `OfficeDashboard`'s existing `RECEIPT_COLUMNS`/`RECEIPTS` usage is unaffected since no existing field is removed or renamed).

No standalone spec — covered by Task 6/7 tests.

- [ ] **Step 1: Replace the file contents**

```typescript
import { StockStatus } from '@ikho/shared-ui';
import { Localized } from '../i18n/localized.type';

export interface ReceiptLineDetail {
  sku: string;
  productName: Localized<string>;
  qty: number;
  exceptionReason?: Localized<string>;
}

export interface Receipt {
  [key: string]: unknown;
  id: string;
  po: string;
  supplier: string;
  lines: string;
  dock: string;
  time: string;
  status: StockStatus;
  label: Localized<string>;
  lineDetails: ReceiptLineDetail[];
}

export const RECEIPTS: Receipt[] = [
  {
    id: 'RCP-20418', po: 'PO-10482', supplier: 'Vanderberg Steel', lines: '40 / 40', dock: 'Dock 3', time: '09:30',
    status: 'in-stock', label: { en: 'Posted', vi: 'Đã ghi nhận' },
    lineDetails: [{ sku: 'IKH-482910', productName: { en: 'Steel shelving bracket, 400mm', vi: 'Giá đỡ kệ thép, 400mm' }, qty: 40 }],
  },
  {
    id: 'RCP-20419', po: 'PO-10488', supplier: 'Nordic Labels A/S', lines: '12 / 18', dock: 'Dock 3', time: '09:52',
    status: 'inbound', label: { en: 'Receiving', vi: 'Đang nhận' },
    lineDetails: [{ sku: 'IKH-330298', productName: { en: 'Barcode label roll, 100×50mm', vi: 'Cuộn tem mã vạch, 100×50mm' }, qty: 12 }],
  },
  {
    id: 'RCP-20420', po: 'PO-10490', supplier: 'EuroPallet NV', lines: '0 / 24', dock: 'Dock 1', time: '10:15',
    status: 'inbound', label: { en: 'Expected', vi: 'Dự kiến' },
    lineDetails: [],
  },
  {
    id: 'RCP-20415', po: 'PO-10477', supplier: 'Wrapline BV', lines: '6 / 30', dock: 'Dock 2', time: '08:05',
    status: 'low-stock', label: { en: 'Short', vi: 'Thiếu' },
    lineDetails: [{
      sku: 'IKH-664120', productName: { en: 'Pallet wrap film, 500mm', vi: 'Màng quấn pallet, 500mm' }, qty: 6,
      exceptionReason: { en: 'Short-shipped by supplier', vi: 'Nhà cung cấp giao thiếu' },
    }],
  },
];
```

- [ ] **Step 2: Commit**

```bash
git add source/apps/ikho-ui/src/app/core/mock-data/receipts.data.ts
git commit -m "feat(ikho-ui): add line detail to receipt mock data"
```

---

## Task 4: Putaway task mock data, and trim `tasks.data.ts`

**Files:**
- Create: `source/apps/ikho-ui/src/app/core/mock-data/putaway-tasks.data.ts`
- Modify: `source/apps/ikho-ui/src/app/core/mock-data/tasks.data.ts`

**Interfaces:**
- Produces: `PutawayTask { [key: string]: unknown; id: string; poId: string; sku: string; productName: Localized<string>; fromDock: string; toBin: string; qty: number; operator: string; status: StockStatus; label: Localized<string> }`, `PUTAWAY_TASKS: PutawayTask[]`.
- Produces (modified `tasks.data.ts`): `STATIC_TASKS: OperatorTask[]` (renamed from `TASKS`, now holding only the non-Inbound `PIK-3318` entry — the two `PUT-` entries move to `PUTAWAY_TASKS`).
- Consumed by: Task 6 (`InboundStore` seeds from `PUTAWAY_TASKS`), Task 13 (`OperatorDashboard` reads `STATIC_TASKS` for the non-putaway part of its queue).

No standalone spec — pure data, covered by downstream tests.

- [ ] **Step 1: Create `putaway-tasks.data.ts`**

```typescript
import { StockStatus } from '@ikho/shared-ui';
import { Localized } from '../i18n/localized.type';

export interface PutawayTask {
  [key: string]: unknown;
  id: string;
  poId: string;
  sku: string;
  productName: Localized<string>;
  fromDock: string;
  toBin: string;
  qty: number;
  operator: string;
  status: StockStatus;
  label: Localized<string>;
}

export const PUTAWAY_TASKS: PutawayTask[] = [
  {
    id: 'PUT-7741', poId: 'PO-10482', sku: 'IKH-482910',
    productName: { en: 'Steel shelving bracket, 400mm', vi: 'Giá đỡ kệ thép, 400mm' },
    fromDock: 'Dock 3', toBin: 'A-12-04', qty: 240, operator: 'T. Willems',
    status: 'inbound', label: { en: 'Assigned', vi: 'Đã giao' },
  },
  {
    id: 'PUT-7742', poId: 'PO-10488', sku: 'IKH-330298',
    productName: { en: 'Barcode label roll, 100×50mm', vi: 'Cuộn tem mã vạch, 100×50mm' },
    fromDock: 'Dock 3', toBin: 'A-04-09', qty: 60, operator: 'T. Willems',
    status: 'inbound', label: { en: 'Assigned', vi: 'Đã giao' },
  },
  {
    id: 'PUT-7739', poId: 'PO-10399', sku: 'IKH-559071',
    productName: { en: 'Void fill paper, 380mm', vi: 'Giấy chèn lót, 380mm' },
    fromDock: 'Dock 1', toBin: 'B-05-08', qty: 620, operator: 'S. Peeters',
    status: 'in-stock', label: { en: 'Complete', vi: 'Hoàn thành' },
  },
];
```

- [ ] **Step 2: Replace `tasks.data.ts` contents**

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

/** Static, non-Inbound task-queue entries (e.g. Outbound picks). Putaway tasks come from InboundStore / PUTAWAY_TASKS. */
export const STATIC_TASKS: OperatorTask[] = [
  {
    id: 'PIK-3318', status: 'outbound', icon: 'package-check',
    kind: { en: 'Pick', vi: 'Lấy hàng' }, title: { en: 'Euro pallet, heat-treated', vi: 'Pallet Euro, xử lý nhiệt' },
    route: 'D-01-01 → Dock 2', qty: { en: '48 units', vi: '48 cái' },
  },
];
```

- [ ] **Step 3: Commit**

```bash
git add source/apps/ikho-ui/src/app/core/mock-data/putaway-tasks.data.ts source/apps/ikho-ui/src/app/core/mock-data/tasks.data.ts
git commit -m "feat(ikho-ui): extract putaway tasks from dashboard tasks mock data"
```

---

## Task 5: Wire Inbound into `ADMIN_SCREENS`

**Files:**
- Modify: `source/apps/ikho-ui/src/app/core/mock-data/admin-screens.data.ts`

**Interfaces:**
- Consumes: `PURCHASE_ORDERS` (Task 2), `PUTAWAY_TASKS` (Task 4).
- Produces: `ADMIN_SCREENS.inbound.detailedTabId === 'main'`; `ADMIN_SCREENS.inbound.tabs[0].rows === PURCHASE_ORDERS`; `ADMIN_SCREENS.inbound.tabs[2].rows === PUTAWAY_TASKS` with columns keyed `id`/`fromDock`/`toBin` (renamed from `task`/`from`/`to`).

- [ ] **Step 1: Add imports**

At the top of `admin-screens.data.ts`, alongside the existing mock-data imports:

```typescript
import { PURCHASE_ORDERS } from './purchase-orders.data';
import { PUTAWAY_TASKS } from './putaway-tasks.data';
```

- [ ] **Step 2: Update the `inbound` entry**

Replace the `inbound: { ... }` block's `kpis` line onward — add `detailedTabId: 'main'`, point `main` tab rows at `PURCHASE_ORDERS`, `receipts` tab rows already come from the imported `RECEIPTS` (unchanged), point `putaway` tab rows at `PUTAWAY_TASKS` and rename its columns to match the new field names:

```typescript
  inbound: {
    panelTitle: { en: 'Purchase orders', vi: 'Đơn mua hàng' },
    panelSubtitle: { en: 'Expected and received lines · WH-1 Rotterdam', vi: 'Dòng dự kiến và đã nhận · WH-1 Rotterdam' },
    detailedTabId: 'main',
    kpis: [
      { label: { en: 'Open orders', vi: 'Đơn đang mở' }, value: '37' },
      { label: { en: 'Receiving now', vi: 'Đang nhận' }, value: '3' },
      { label: { en: 'Short receipts', vi: 'Phiếu thiếu' }, value: '4', trendStatus: 'low-stock' },
      { label: { en: 'Overdue', vi: 'Quá hạn' }, value: '6', trendStatus: 'out-of-stock' },
    ],
    tabs: [
      {
        id: 'main',
        label: { en: 'Purchase orders', vi: 'Đơn mua hàng' },
        columns: [
          { key: 'po', label: same('PO'), mono: true },
          { key: 'supplier', label: { en: 'Supplier', vi: 'Nhà cung cấp' } },
          { key: 'expected', label: { en: 'Expected', vi: 'Dự kiến' }, align: 'right', mono: true },
          { key: 'received', label: { en: 'Received', vi: 'Đã nhận' }, align: 'right', mono: true },
          { key: 'dock', label: { en: 'Dock', vi: 'Cửa' } },
          { key: 'eta', label: { en: 'ETA', vi: 'Giờ đến' }, mono: true },
          { key: 'status', label: { en: 'Status', vi: 'Trạng thái' }, status: true },
        ],
        rows: PURCHASE_ORDERS,
      },
      {
        id: 'receipts',
        label: { en: 'Receipts', vi: 'Phiếu nhập' },
        subtitle: { en: 'Posted and in-progress receipts · today', vi: 'Phiếu đã ghi nhận và đang xử lý · hôm nay' },
        columns: [
          { key: 'id', label: { en: 'Receipt', vi: 'Phiếu nhập' }, mono: true },
          { key: 'po', label: same('PO'), mono: true },
          { key: 'supplier', label: { en: 'Supplier', vi: 'Nhà cung cấp' } },
          { key: 'lines', label: { en: 'Lines', vi: 'Dòng' }, mono: true },
          { key: 'dock', label: { en: 'Dock', vi: 'Cửa' } },
          { key: 'time', label: { en: 'Time', vi: 'Giờ' }, mono: true },
          { key: 'status', label: { en: 'Status', vi: 'Trạng thái' }, status: true },
        ],
        rows: RECEIPTS,
      },
      {
        id: 'putaway',
        label: { en: 'Putaway tasks', vi: 'Nhiệm vụ cất kho' },
        subtitle: { en: 'Generated from received lines, assigned to operators', vi: 'Sinh từ dòng đã nhận, giao cho nhân viên vận hành' },
        columns: [
          { key: 'id', label: { en: 'Task', vi: 'Nhiệm vụ' }, mono: true },
          { key: 'sku', label: same('SKU'), mono: true },
          { key: 'fromDock', label: { en: 'From', vi: 'Từ' }, mono: true },
          { key: 'toBin', label: { en: 'To', vi: 'Đến' }, mono: true },
          { key: 'qty', label: { en: 'Quantity', vi: 'Số lượng' }, align: 'right', mono: true },
          { key: 'operator', label: { en: 'Operator', vi: 'Nhân viên' } },
          { key: 'status', label: { en: 'Status', vi: 'Trạng thái' }, status: true },
        ],
        rows: PUTAWAY_TASKS,
      },
    ],
  },
```

- [ ] **Step 3: Verify the app still builds**

Run: `pnpm nx build ikho-ui`
Expected: Build succeeds with no type errors (column key renames matched to the new `PutawayTask` field names).

- [ ] **Step 4: Commit**

```bash
git add source/apps/ikho-ui/src/app/core/mock-data/admin-screens.data.ts
git commit -m "feat(ikho-ui): point ADMIN_SCREENS.inbound at typed mock data"
```

---

## Task 6: `InboundStore`

**Files:**
- Create: `source/apps/ikho-ui/src/app/core/state/inbound-store.ts`
- Test: `source/apps/ikho-ui/src/app/core/state/inbound-store.spec.ts`

**Interfaces:**
- Consumes: `PURCHASE_ORDERS`/`PurchaseOrder`/`PurchaseOrderLine` (Task 2), `RECEIPTS`/`Receipt`/`ReceiptLineDetail` (Task 3), `PUTAWAY_TASKS`/`PutawayTask` (Task 4), `PRODUCTS` (existing `products.data.ts`).
- Produces: `InboundStore` (`providedIn: 'root'`) with `purchaseOrders: Signal<PurchaseOrder[]>`, `receipts: Signal<Receipt[]>`, `putawayTasks: Signal<PutawayTask[]>`, `createPurchaseOrder(input: CreatePurchaseOrderInput): PurchaseOrder`, `recordDockReceipt(poId: string, lines: DockReceiptLineInput[]): void`, `confirmPutaway(taskId: string): void`. Also exports `CreatePurchaseOrderInput`, `CreatePurchaseOrderLineInput`, `DockReceiptLineInput`. Consumed by Tasks 7, 9, 10, 11, 13.

- [ ] **Step 1: Write the failing tests**

```typescript
import { InboundStore } from './inbound-store';

describe('InboundStore', () => {
  let store: InboundStore;

  beforeEach(() => {
    store = new InboundStore();
  });

  it('seeds purchase orders, receipts and putaway tasks from mock data', () => {
    expect(store.purchaseOrders().length).toBeGreaterThan(0);
    expect(store.receipts().length).toBeGreaterThan(0);
    expect(store.putawayTasks().length).toBeGreaterThan(0);
  });

  it('createPurchaseOrder prepends a new order with aggregated expected qty', () => {
    const order = store.createPurchaseOrder({
      supplier: 'Test Supplier',
      dock: 'Dock 9',
      lines: [{ sku: 'IKH-482910', qty: 10 }],
    });

    expect(store.purchaseOrders()[0]).toBe(order);
    expect(order.expected).toBe(10);
    expect(order.received).toBe(0);
    expect(order.status).toBe('inbound');
    expect(order.lines[0].productName.en).toBe('Steel shelving bracket, 400mm');
  });

  it('recordDockReceipt marks the order in-stock when fully received with no exception', () => {
    store.recordDockReceipt('PO-10488', [{ sku: 'IKH-330298', qty: 6 }]);

    const order = store.purchaseOrders().find((o) => o.po === 'PO-10488')!;
    expect(order.received).toBe(18);
    expect(order.status).toBe('in-stock');
    expect(order.lines[0].receivedQty).toBe(18);
  });

  it('recordDockReceipt marks the order low-stock when a line has an exception reason', () => {
    store.recordDockReceipt('PO-10490', [
      { sku: 'IKH-770145', qty: 20, exceptionReason: { en: 'Short-shipped', vi: 'Giao thiếu' } },
    ]);

    const order = store.purchaseOrders().find((o) => o.po === 'PO-10490')!;
    expect(order.status).toBe('low-stock');
  });

  it('recordDockReceipt appends a receipt and a putaway task per received line', () => {
    const receiptsBefore = store.receipts().length;
    const tasksBefore = store.putawayTasks().length;

    store.recordDockReceipt('PO-10490', [{ sku: 'IKH-770145', qty: 24 }]);

    expect(store.receipts().length).toBe(receiptsBefore + 1);
    expect(store.receipts()[0].po).toBe('PO-10490');

    expect(store.putawayTasks().length).toBe(tasksBefore + 1);
    const task = store.putawayTasks()[store.putawayTasks().length - 1];
    expect(task.sku).toBe('IKH-770145');
    expect(task.fromDock).toBe('Dock 1');
    expect(task.toBin).toBe('D-01-01');
  });

  it('confirmPutaway removes the task from the queue', () => {
    const taskId = store.putawayTasks()[0].id;
    store.confirmPutaway(taskId);
    expect(store.putawayTasks().some((t) => t.id === taskId)).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm nx test ikho-ui --testFile=inbound-store.spec.ts`
Expected: FAIL — `inbound-store.ts` does not exist yet.

- [ ] **Step 3: Implement `InboundStore`**

```typescript
import { Injectable, signal } from '@angular/core';
import { Localized } from '../i18n/localized.type';
import { PRODUCTS } from '../mock-data/products.data';
import { PURCHASE_ORDERS, PurchaseOrder, PurchaseOrderLine } from '../mock-data/purchase-orders.data';
import { PUTAWAY_TASKS, PutawayTask } from '../mock-data/putaway-tasks.data';
import { RECEIPTS, Receipt, ReceiptLineDetail } from '../mock-data/receipts.data';

export interface CreatePurchaseOrderLineInput {
  sku: string;
  qty: number;
}

export interface CreatePurchaseOrderInput {
  supplier: string;
  dock: string;
  lines: CreatePurchaseOrderLineInput[];
}

export interface DockReceiptLineInput {
  sku: string;
  qty: number;
  exceptionReason?: Localized<string>;
}

let poSeq = 10500;
let receiptSeq = 20500;
let putawaySeq = 7800;

function productName(sku: string): Localized<string> {
  return PRODUCTS.find((p) => p.sku === sku)?.name ?? { en: sku, vi: sku };
}

@Injectable({ providedIn: 'root' })
export class InboundStore {
  readonly purchaseOrders = signal<PurchaseOrder[]>([...PURCHASE_ORDERS]);
  readonly receipts = signal<Receipt[]>([...RECEIPTS]);
  readonly putawayTasks = signal<PutawayTask[]>([...PUTAWAY_TASKS]);

  createPurchaseOrder(input: CreatePurchaseOrderInput): PurchaseOrder {
    const lines: PurchaseOrderLine[] = input.lines.map((line) => ({
      sku: line.sku,
      productName: productName(line.sku),
      expectedQty: line.qty,
      receivedQty: 0,
    }));

    const order: PurchaseOrder = {
      po: `PO-${poSeq++}`,
      supplier: input.supplier,
      expected: lines.reduce((sum, l) => sum + l.expectedQty, 0),
      received: 0,
      dock: input.dock,
      eta: '—',
      status: 'inbound',
      label: { en: 'Expected', vi: 'Dự kiến' },
      lines,
    };

    this.purchaseOrders.update((orders) => [order, ...orders]);
    return order;
  }

  recordDockReceipt(poId: string, lines: DockReceiptLineInput[]): void {
    const order = this.purchaseOrders().find((o) => o.po === poId);
    if (!order) return;

    const updatedLines = order.lines.map((line) => {
      const received = lines.find((l) => l.sku === line.sku);
      return received ? { ...line, receivedQty: line.receivedQty + received.qty } : line;
    });

    const hasException = lines.some((l) => l.exceptionReason);
    const isComplete = updatedLines.every((l) => l.receivedQty >= l.expectedQty);
    const status = hasException ? 'low-stock' : isComplete ? 'in-stock' : 'inbound';
    const label: Localized<string> = hasException
      ? { en: 'Short', vi: 'Thiếu' }
      : isComplete
        ? { en: 'Posted', vi: 'Đã ghi nhận' }
        : { en: 'Receiving', vi: 'Đang nhận' };
    const totalReceived = updatedLines.reduce((sum, l) => sum + l.receivedQty, 0);

    const updatedOrder: PurchaseOrder = { ...order, lines: updatedLines, received: totalReceived, status, label };
    this.purchaseOrders.update((orders) => orders.map((o) => (o.po === poId ? updatedOrder : o)));

    const lineDetails: ReceiptLineDetail[] = lines.map((l) => ({
      sku: l.sku,
      productName: productName(l.sku),
      qty: l.qty,
      exceptionReason: l.exceptionReason,
    }));

    const receipt: Receipt = {
      id: `RCP-${receiptSeq++}`,
      po: poId,
      supplier: order.supplier,
      lines: `${totalReceived} / ${order.expected}`,
      dock: order.dock,
      time: 'Now',
      status,
      label,
      lineDetails,
    };
    this.receipts.update((receipts) => [receipt, ...receipts]);

    const newTasks: PutawayTask[] = lines
      .filter((l) => l.qty > 0)
      .map((l) => ({
        id: `PUT-${putawaySeq++}`,
        poId,
        sku: l.sku,
        productName: productName(l.sku),
        fromDock: order.dock,
        toBin: PRODUCTS.find((p) => p.sku === l.sku)?.bin ?? '—',
        qty: l.qty,
        operator: '—',
        status: 'inbound',
        label: { en: 'Assigned', vi: 'Đã giao' },
      }));
    this.putawayTasks.update((tasks) => [...tasks, ...newTasks]);
  }

  confirmPutaway(taskId: string): void {
    this.putawayTasks.update((tasks) => tasks.filter((t) => t.id !== taskId));
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm nx test ikho-ui --testFile=inbound-store.spec.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add source/apps/ikho-ui/src/app/core/state/inbound-store.ts source/apps/ikho-ui/src/app/core/state/inbound-store.spec.ts
git commit -m "feat(ikho-ui): add InboundStore for mock purchase order/receipt/putaway state"
```

---

## Task 7: `OfficeInbound` component

**Files:**
- Create: `source/apps/ikho-ui/src/app/features/office/inbound/office-inbound.ts`
- Test: `source/apps/ikho-ui/src/app/features/office/inbound/office-inbound.spec.ts`

**Interfaces:**
- Consumes: `OfficeScreen`/`OfficeDetailPanel` + `primaryAction` output (Task 1), `ADMIN_SCREENS.inbound` (Task 5), `InboundStore` (Task 6), `PRODUCTS` (existing), `resolveKpis`/`resolveTabs` (existing `admin-screen.util.ts`), `resolveStatusLabel` (existing), `Button`/`DataPanel`/`TextInput` (existing shared-ui).
- Produces: `OfficeInbound` component, selector `app-office-inbound`. Consumed by Task 8's route.

- [ ] **Step 1: Write the failing test**

```typescript
import { provideRouter } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { OfficeInbound } from './office-inbound';

describe('OfficeInbound', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OfficeInbound],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('renders the purchase orders table with seeded rows', () => {
    const fixture = TestBed.createComponent(OfficeInbound);
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('PO-10482');
    expect(text).toContain('Vanderberg Steel');
  });

  it('opens the create-purchase-order form when the primary action fires, and adds a row on submit', () => {
    const fixture = TestBed.createComponent(OfficeInbound);
    fixture.detectChanges();

    const instance = fixture.componentInstance as unknown as {
      showCreateForm: { set: (v: boolean) => void };
      formSupplier: { set: (v: string) => void };
      formDock: { set: (v: string) => void };
      updateLineSku: (i: number, v: string) => void;
      updateLineQty: (i: number, v: string) => void;
      submitCreate: () => void;
    };

    instance.showCreateForm.set(true);
    instance.formSupplier.set('New Supplier BV');
    instance.formDock.set('Dock 5');
    instance.updateLineSku(0, 'IKH-482910');
    instance.updateLineQty(0, '15');
    instance.submitCreate();
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('New Supplier BV');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm nx test ikho-ui --testFile=office-inbound.spec.ts`
Expected: FAIL — `office-inbound.ts` does not exist yet.

- [ ] **Step 3: Implement `OfficeInbound`**

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
import { InboundStore } from '../../../core/state/inbound-store';
import { OfficeDetailPanel, OfficeScreen } from '../../../shared/components/office-screen/office-screen';

const DATA = ADMIN_SCREENS.inbound;

interface DraftLine {
  sku: string;
  qty: string;
}

@Component({
  selector: 'app-office-inbound',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Button, DataPanel, OfficeScreen, TextInput],
  template: `
    @if (showCreateForm()) {
      <lib-data-panel [title]="formTitle()" [subtitle]="formSubtitle()">
        <div class="flex flex-col gap-4">
          <div class="grid grid-cols-2 gap-4">
            <lib-text-input [label]="supplierLabel()" [value]="formSupplier()" (valueChange)="formSupplier.set($event)" />
            <lib-text-input [label]="dockLabel()" [value]="formDock()" (valueChange)="formDock.set($event)" />
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
export class OfficeInbound {
  private readonly lang = inject(LangService);
  private readonly store = inject(InboundStore);

  protected readonly title = computed(() => screenTitle('inbound', 'admin', this.lang.lang()));
  protected readonly meta = computed(() => screenMeta('inbound', 'admin', this.lang.lang()));
  protected readonly primaryActionLabel = computed(() => SCREENS.inbound.action[this.lang.lang()]);
  protected readonly kpis = computed(() => resolveKpis(DATA.kpis, this.lang.lang()));

  protected readonly tabs = computed(() =>
    resolveTabs(
      [
        { ...DATA.tabs[0], rows: this.store.purchaseOrders() },
        { ...DATA.tabs[1], rows: this.store.receipts() },
        { ...DATA.tabs[2], rows: this.store.putawayTasks() },
      ],
      this.lang.lang(),
    ),
  );

  protected readonly searchPlaceholder = computed(() =>
    this.lang.lang() === 'en' ? 'Search PO, supplier' : 'Tìm đơn mua, nhà cung cấp',
  );
  protected readonly searchFields = ['po', 'supplier'];
  protected readonly rowKey = (row: Record<string, unknown>) => String(row['po']);

  protected readonly detail = computed(() => {
    const lang = this.lang.lang();
    const eyebrow = lang === 'en' ? 'Purchase order detail' : 'Chi tiết đơn mua';
    const receiptsLabel = lang === 'en' ? 'Receipts' : 'Phiếu nhập';
    return (row: Record<string, unknown>): OfficeDetailPanel => {
      const status = row['status'] as OfficeDetailPanel['status'];
      const lines = row['lines'] as { sku: string; productName: Localized<string>; expectedQty: number; receivedQty: number }[];
      const poReceipts = this.store.receipts().filter((r) => r.po === row['po']);
      return {
        eyebrow,
        title: String(row['supplier']),
        code: String(row['po']),
        status,
        statusLabel: resolveStatusLabel({ status, label: row['label'] as Localized<string> | undefined }, lang),
        fields: [
          { label: lang === 'en' ? 'Dock' : 'Cửa kho', value: String(row['dock']) },
          { label: lang === 'en' ? 'ETA' : 'Giờ đến', value: String(row['eta']) },
          ...lines.map((l) => ({ label: l.productName[lang], value: `${l.receivedQty} / ${l.expectedQty}` })),
          { label: receiptsLabel, value: poReceipts.length ? poReceipts.map((r) => `${r.id} (${r.lines})`).join(', ') : '—' },
        ],
      };
    };
  });

  protected readonly formTitle = computed(() => (this.lang.lang() === 'en' ? 'Create purchase order' : 'Tạo đơn mua hàng'));
  protected readonly formSubtitle = computed(() =>
    this.lang.lang() === 'en' ? 'Supplier, dock and expected lines' : 'Nhà cung cấp, cửa kho và dòng dự kiến',
  );
  protected readonly supplierLabel = computed(() => (this.lang.lang() === 'en' ? 'Supplier' : 'Nhà cung cấp'));
  protected readonly dockLabel = computed(() => (this.lang.lang() === 'en' ? 'Dock' : 'Cửa kho'));
  protected readonly skuLabel = computed(() => 'SKU');
  protected readonly qtyLabel = computed(() => (this.lang.lang() === 'en' ? 'Quantity' : 'Số lượng'));
  protected readonly addLineLabel = computed(() => (this.lang.lang() === 'en' ? 'Add line' : 'Thêm dòng'));
  protected readonly removeLabel = computed(() => (this.lang.lang() === 'en' ? 'Remove' : 'Xoá'));
  protected readonly submitLabel = computed(() => (this.lang.lang() === 'en' ? 'Create' : 'Tạo'));
  protected readonly cancelLabel = computed(() => (this.lang.lang() === 'en' ? 'Cancel' : 'Huỷ'));

  protected readonly showCreateForm = signal(false);
  protected readonly formSupplier = signal('');
  protected readonly formDock = signal('');
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
    const supplier = this.formSupplier().trim();
    const dock = this.formDock().trim();
    const lang = this.lang.lang();

    if (!supplier || !dock) {
      this.formError.set(lang === 'en' ? 'Supplier and dock are required.' : 'Cần nhập nhà cung cấp và cửa kho.');
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

    this.store.createPurchaseOrder({ supplier, dock, lines });
    this.formError.set(null);
    this.formSupplier.set('');
    this.formDock.set('');
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

Run: `pnpm nx test ikho-ui --testFile=office-inbound.spec.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add source/apps/ikho-ui/src/app/features/office/inbound/office-inbound.ts source/apps/ikho-ui/src/app/features/office/inbound/office-inbound.spec.ts
git commit -m "feat(ikho-ui): add dedicated OfficeInbound screen with inline create form"
```

---

## Task 8: Route Office Console's Inbound to `OfficeInbound`

**Files:**
- Modify: `source/apps/ikho-ui/src/app/features/office/office.routes.ts`
- Modify: `source/apps/ikho-ui/src/app/features/office/generic-screen/office-generic-screen.ts`

**Interfaces:**
- Consumes: `OfficeInbound` (Task 7).

- [ ] **Step 1: Update `office.routes.ts`**

Replace `genericScreen('inbound'),` with a dedicated route entry (keep it in the same list position):

```typescript
  {
    path: 'inbound',
    loadComponent: () => import('./inbound/office-inbound').then((m) => m.OfficeInbound),
  },
  genericScreen('organization'),
  genericScreen('partners'),
  genericScreen('outbound'),
  genericScreen('returns'),
  genericScreen('billing'),
  genericScreen('reporting'),
```

- [ ] **Step 2: Update `GenericScreenId` in `office-generic-screen.ts`**

```typescript
type GenericScreenId = Exclude<ScreenId, 'dashboard' | 'catalogue' | 'inventory' | 'inbound'>;
```

- [ ] **Step 3: Verify the app builds and routes**

Run: `pnpm nx build ikho-ui`
Expected: Build succeeds (no leftover reference to `genericScreen('inbound')` and `GenericScreenId` still compiles against `ADMIN_SCREENS`'s `Exclude<ScreenId, 'dashboard'>` keys).

- [ ] **Step 4: Commit**

```bash
git add source/apps/ikho-ui/src/app/features/office/office.routes.ts source/apps/ikho-ui/src/app/features/office/generic-screen/office-generic-screen.ts
git commit -m "feat(ikho-ui): route Office Inbound to the dedicated screen"
```

---

## Task 9: `OperatorInboundEntry` component

**Files:**
- Create: `source/apps/ikho-ui/src/app/features/operator/inbound/operator-inbound-entry.ts`
- Test: `source/apps/ikho-ui/src/app/features/operator/inbound/operator-inbound-entry.spec.ts`

**Interfaces:**
- Consumes: `InboundStore` (Task 6).
- Produces: `OperatorInboundEntry` component, selector `app-operator-inbound-entry`. Navigates to `/operator/inbound/receive/:poId` and `/operator/inbound/putaway/:taskId` (routes added in Task 12).

- [ ] **Step 1: Write the failing test**

```typescript
import { Router } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { OperatorInboundEntry } from './operator-inbound-entry';

describe('OperatorInboundEntry', () => {
  let navigateCalls: unknown[][];

  beforeEach(async () => {
    navigateCalls = [];
    await TestBed.configureTestingModule({
      imports: [OperatorInboundEntry],
      providers: [
        { provide: Router, useValue: { navigate: (...args: unknown[]) => navigateCalls.push(args) } },
      ],
    }).compileComponents();
  });

  it('shows open purchase orders in the receiving tab, excluding fully-received ones', () => {
    const fixture = TestBed.createComponent(OperatorInboundEntry);
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('PO-10488');
    expect(text).not.toContain('PO-10482');
  });

  it('navigates to the receiving flow when a PO card is opened', () => {
    const fixture = TestBed.createComponent(OperatorInboundEntry);
    fixture.detectChanges();

    (fixture.componentInstance as unknown as { openReceive: (id: string) => void }).openReceive('PO-10488');

    expect(navigateCalls[0][0]).toEqual(['/operator/inbound/receive', 'PO-10488']);
  });

  it('switches to the putaway tab and lists active putaway tasks', () => {
    const fixture = TestBed.createComponent(OperatorInboundEntry);
    fixture.detectChanges();

    (fixture.componentInstance as unknown as { view: { set: (v: string) => void } }).view.set('putaway');
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('PUT-7741');
    expect(text).not.toContain('PUT-7739');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm nx test ikho-ui --testFile=operator-inbound-entry.spec.ts`
Expected: FAIL — `operator-inbound-entry.ts` does not exist yet.

- [ ] **Step 3: Implement `OperatorInboundEntry`**

```typescript
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Icon, StatusBadge } from '@ikho/shared-ui';
import { LangService } from '../../../core/i18n/lang.service';
import { resolveStatusLabel } from '../../../core/i18n/status-label.util';
import { InboundStore } from '../../../core/state/inbound-store';

type InboundView = 'receiving' | 'putaway';

@Component({
  selector: 'app-operator-inbound-entry',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon, StatusBadge],
  host: { class: 'flex flex-col gap-6' },
  template: `
    <div class="flex gap-2.5">
      <button type="button" [class]="tabClasses('receiving')" (click)="view.set('receiving')">{{ receivingLabel() }}</button>
      <button type="button" [class]="tabClasses('putaway')" (click)="view.set('putaway')">{{ putawayLabel() }}</button>
    </div>

    @if (view() === 'receiving') {
      <div class="flex flex-col gap-3.5">
        @for (po of openOrders(); track po.po) {
          <div
            class="flex min-h-14 cursor-pointer items-center gap-[18px] rounded-lg bg-canvas-operator-elevated p-5"
            tabindex="0"
            role="button"
            (click)="openReceive(po.po)"
            (keydown.enter)="openReceive(po.po)"
          >
            <lib-icon name="truck" [size]="32" color="var(--color-accent-teal)" />
            <div class="flex min-w-0 flex-1 flex-col gap-1.5">
              <div class="flex items-center gap-2.5">
                <span class="font-mono text-xs text-shade-40">{{ po.po }}</span>
                <lib-status-badge [status]="po.status" [label]="po.statusLabel" />
              </div>
              <span class="font-core text-xl font-bold text-on-primary">{{ po.supplier }}</span>
              <span class="font-mono text-sm text-accent-teal">{{ po.dock }} · {{ po.received }} / {{ po.expected }}</span>
            </div>
            <lib-icon name="chevron-right" [size]="28" color="var(--color-shade-50)" />
          </div>
        } @empty {
          <div class="p-6 font-core text-[15px] text-shade-40">{{ emptyLabel() }}</div>
        }
      </div>
    } @else {
      <div class="flex flex-col gap-3.5">
        @for (task of activePutaway(); track task.id) {
          <div
            class="flex min-h-14 cursor-pointer items-center gap-[18px] rounded-lg bg-canvas-operator-elevated p-5"
            tabindex="0"
            role="button"
            (click)="openPutaway(task.id)"
            (keydown.enter)="openPutaway(task.id)"
          >
            <lib-icon name="truck" [size]="32" color="var(--color-accent-teal)" />
            <div class="flex min-w-0 flex-1 flex-col gap-1.5">
              <div class="flex items-center gap-2.5">
                <span class="font-mono text-xs text-shade-40">{{ task.id }}</span>
                <lib-status-badge [status]="task.status" [label]="task.statusLabel" />
              </div>
              <span class="font-core text-xl font-bold text-on-primary">{{ task.productNameText }}</span>
              <span class="font-mono text-sm text-accent-teal">{{ task.fromDock }} → {{ task.toBin }} · {{ task.qty }}</span>
            </div>
            <lib-icon name="chevron-right" [size]="28" color="var(--color-shade-50)" />
          </div>
        } @empty {
          <div class="p-6 font-core text-[15px] text-shade-40">{{ emptyLabel() }}</div>
        }
      </div>
    }
  `,
})
export class OperatorInboundEntry {
  private readonly router = inject(Router);
  protected readonly lang = inject(LangService);
  private readonly store = inject(InboundStore);

  protected readonly view = signal<InboundView>('receiving');

  protected readonly openOrders = computed(() => {
    const lang = this.lang.lang();
    return this.store
      .purchaseOrders()
      .filter((po) => po.status !== 'in-stock')
      .map((po) => ({ ...po, statusLabel: resolveStatusLabel(po, lang) }));
  });

  protected readonly activePutaway = computed(() => {
    const lang = this.lang.lang();
    return this.store
      .putawayTasks()
      .filter((t) => t.status !== 'in-stock')
      .map((t) => ({ ...t, statusLabel: resolveStatusLabel(t, lang), productNameText: t.productName[lang] }));
  });

  protected readonly receivingLabel = computed(() => (this.lang.lang() === 'en' ? 'Receiving' : 'Đang nhận'));
  protected readonly putawayLabel = computed(() => (this.lang.lang() === 'en' ? 'Putaway' : 'Cất kho'));
  protected readonly emptyLabel = computed(() => (this.lang.lang() === 'en' ? 'Nothing here right now' : 'Hiện chưa có gì'));

  protected tabClasses(id: InboundView): string {
    const base = 'min-h-11 cursor-pointer rounded-pill border px-4 py-2 font-core text-sm font-semibold';
    return id === this.view()
      ? `${base} border-accent-teal bg-accent-teal/14 text-on-primary`
      : `${base} border-hairline-operator bg-transparent text-shade-40`;
  }

  protected openReceive(poId: string): void {
    this.router.navigate(['/operator/inbound/receive', poId]);
  }

  protected openPutaway(taskId: string): void {
    this.router.navigate(['/operator/inbound/putaway', taskId]);
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm nx test ikho-ui --testFile=operator-inbound-entry.spec.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add source/apps/ikho-ui/src/app/features/operator/inbound/operator-inbound-entry.ts source/apps/ikho-ui/src/app/features/operator/inbound/operator-inbound-entry.spec.ts
git commit -m "feat(ikho-ui): add operator Inbound entry list (receiving + putaway queues)"
```

---

## Task 10: `OperatorInboundReceive` component (dock-receiving stepper)

**Files:**
- Create: `source/apps/ikho-ui/src/app/features/operator/inbound/operator-inbound-receive.ts`
- Test: `source/apps/ikho-ui/src/app/features/operator/inbound/operator-inbound-receive.spec.ts`

**Interfaces:**
- Consumes: `InboundStore`, `DockReceiptLineInput` (Task 6), `PRODUCTS` (existing).
- Produces: `OperatorInboundReceive` component, selector `app-operator-inbound-receive`, `readonly poId = input.required<string>()` bound from the `:poId` route param (Task 12).

- [ ] **Step 1: Write the failing test**

```typescript
import { Router } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { InboundStore } from '../../../core/state/inbound-store';
import { OperatorInboundReceive } from './operator-inbound-receive';

describe('OperatorInboundReceive', () => {
  let navigateCalls: unknown[][];

  beforeEach(async () => {
    navigateCalls = [];
    await TestBed.configureTestingModule({
      imports: [OperatorInboundReceive],
      providers: [
        { provide: Router, useValue: { navigate: (...args: unknown[]) => navigateCalls.push(args) } },
      ],
    }).compileComponents();
  });

  it('shows the current line for the given PO', () => {
    const fixture = TestBed.createComponent(OperatorInboundReceive);
    fixture.componentRef.setInput('poId', 'PO-10488');
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Barcode label roll');
    expect(text).toContain('IKH-330298');
  });

  it('flags a mismatch and requires a reason before confirming an exact-vs-entered quantity difference', () => {
    const fixture = TestBed.createComponent(OperatorInboundReceive);
    fixture.componentRef.setInput('poId', 'PO-10488');
    fixture.detectChanges();

    const instance = fixture.componentInstance as unknown as {
      qtyInput: { set: (v: string) => void };
      canConfirmLine: () => boolean;
      reasonInput: { set: (v: string) => void };
    };

    instance.qtyInput.set('3');
    fixture.detectChanges();
    expect(instance.canConfirmLine()).toBe(false);

    instance.reasonInput.set('Short-shipped');
    fixture.detectChanges();
    expect(instance.canConfirmLine()).toBe(true);
  });

  it('completing the last line moves to the summary view, and completing calls the store and navigates back', () => {
    const store = TestBed.inject(InboundStore);
    const fixture = TestBed.createComponent(OperatorInboundReceive);
    fixture.componentRef.setInput('poId', 'PO-10490');
    fixture.detectChanges();

    const instance = fixture.componentInstance as unknown as {
      qtyInput: { set: (v: string) => void };
      confirmLine: () => void;
      view: { (): string };
      complete: () => void;
    };

    instance.qtyInput.set('24');
    instance.confirmLine();
    fixture.detectChanges();

    expect(instance.view()).toBe('summary');

    const receiptsBefore = store.receipts().length;
    instance.complete();

    expect(store.receipts().length).toBe(receiptsBefore + 1);
    expect(navigateCalls[0][0]).toEqual(['/operator/inbound']);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm nx test ikho-ui --testFile=operator-inbound-receive.spec.ts`
Expected: FAIL — `operator-inbound-receive.ts` does not exist yet.

- [ ] **Step 3: Implement `OperatorInboundReceive`**

```typescript
import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Button, TextInput } from '@ikho/shared-ui';
import { LangService } from '../../../core/i18n/lang.service';
import { PRODUCTS } from '../../../core/mock-data/products.data';
import { DockReceiptLineInput, InboundStore } from '../../../core/state/inbound-store';

interface ConfirmedLine {
  sku: string;
  productName: string;
  qty: number;
  exceptionReason?: string;
}

@Component({
  selector: 'app-operator-inbound-receive',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Button, TextInput],
  host: { class: 'flex flex-col gap-6' },
  template: `
    @if (!order()) {
      <div class="p-6 font-core text-[15px] text-shade-40">{{ notFoundLabel() }}</div>
    } @else if (view() === 'summary') {
      <div class="flex flex-col gap-4">
        <span class="font-core text-xl font-bold text-on-primary">{{ summaryTitle() }}</span>
        @for (line of confirmed(); track line.sku) {
          <div class="flex flex-col gap-1 rounded-lg bg-canvas-operator-elevated p-5">
            <span class="font-core text-lg font-bold text-on-primary">{{ line.productName }}</span>
            <span class="font-mono text-sm text-accent-teal">{{ line.qty }} {{ unitsLabel() }}</span>
            @if (line.exceptionReason) {
              <span class="font-core text-sm text-status-low-stock">{{ line.exceptionReason }}</span>
            }
          </div>
        }
        <lib-button variant="operator" [fullWidth]="true" (click)="complete()">{{ completeLabel() }}</lib-button>
      </div>
    } @else if (currentLine(); as line) {
      <div class="flex flex-col gap-5">
        <div>
          <span class="font-mono text-xs text-shade-40">{{ order()!.po }} · {{ lineProgressLabel() }}</span>
          <div class="font-core text-2xl font-bold text-on-primary">{{ line.productName[lang.lang()] }}</div>
          <span class="font-mono text-sm text-accent-teal">{{ line.sku }} · {{ expectedLabel() }} {{ remainingQty() }}</span>
        </div>

        <lib-text-input [label]="qtyLabel()" type="number" [value]="qtyInput()" (valueChange)="qtyInput.set($event)" />

        @if (needsLot()) {
          <lib-text-input [label]="lotLabel()" [value]="lotInput()" (valueChange)="lotInput.set($event)" />
          <lib-text-input [label]="expirationLabel()" [value]="expirationInput()" (valueChange)="expirationInput.set($event)" />
        }
        @if (needsSerial()) {
          <lib-text-input [label]="serialLabel()" [value]="serialInput()" (valueChange)="serialInput.set($event)" [hint]="serialHint()" />
        }

        @if (hasMismatch()) {
          <div class="flex flex-col gap-2 rounded-lg bg-status-low-stock-10 p-4">
            <span class="font-core text-sm font-semibold text-status-low-stock">{{ mismatchLabel() }}</span>
            <lib-text-input [label]="reasonLabel()" [value]="reasonInput()" (valueChange)="reasonInput.set($event)" />
          </div>
        }

        <lib-button variant="operator" [fullWidth]="true" [disabled]="!canConfirmLine()" (click)="confirmLine()">{{ confirmLabel() }}</lib-button>
      </div>
    }
  `,
})
export class OperatorInboundReceive {
  private readonly router = inject(Router);
  protected readonly lang = inject(LangService);
  private readonly store = inject(InboundStore);

  readonly poId = input.required<string>();

  protected readonly order = computed(() => this.store.purchaseOrders().find((po) => po.po === this.poId()));

  protected readonly lineIndex = signal(0);
  protected readonly view = signal<'lines' | 'summary'>('lines');
  protected readonly confirmed = signal<ConfirmedLine[]>([]);

  protected readonly qtyInput = signal('');
  protected readonly lotInput = signal('');
  protected readonly expirationInput = signal('');
  protected readonly serialInput = signal('');
  protected readonly reasonInput = signal('');

  protected readonly currentLine = computed(() => this.order()?.lines[this.lineIndex()]);

  protected readonly remainingQty = computed(() => {
    const line = this.currentLine();
    return line ? line.expectedQty - line.receivedQty : 0;
  });

  protected readonly product = computed(() => PRODUCTS.find((p) => p.sku === this.currentLine()?.sku));
  protected readonly needsLot = computed(() => this.product()?.tracking.en === 'Lot-controlled');
  protected readonly needsSerial = computed(() => this.product()?.tracking.en === 'Serial-controlled');

  protected readonly hasMismatch = computed(() => {
    const qty = Number(this.qtyInput());
    return this.qtyInput() !== '' && Number.isFinite(qty) && qty !== this.remainingQty();
  });

  protected readonly canConfirmLine = computed(() => {
    const qty = Number(this.qtyInput());
    if (this.qtyInput() === '' || !Number.isFinite(qty) || qty < 0) return false;
    return !this.hasMismatch() || this.reasonInput().trim().length > 0;
  });

  protected readonly lineProgressLabel = computed(() => {
    const total = this.order()?.lines.length ?? 0;
    return this.lang.lang() === 'en' ? `Line ${this.lineIndex() + 1} of ${total}` : `Dòng ${this.lineIndex() + 1}/${total}`;
  });

  protected readonly notFoundLabel = computed(() => (this.lang.lang() === 'en' ? 'Purchase order not found' : 'Không tìm thấy đơn mua'));
  protected readonly expectedLabel = computed(() => (this.lang.lang() === 'en' ? 'Remaining:' : 'Còn lại:'));
  protected readonly qtyLabel = computed(() => (this.lang.lang() === 'en' ? 'Quantity received' : 'Số lượng nhận'));
  protected readonly lotLabel = computed(() => (this.lang.lang() === 'en' ? 'Lot number' : 'Số lô'));
  protected readonly expirationLabel = computed(() => (this.lang.lang() === 'en' ? 'Expiration date' : 'Hạn sử dụng'));
  protected readonly serialLabel = computed(() => (this.lang.lang() === 'en' ? 'Serial numbers' : 'Số serial'));
  protected readonly serialHint = computed(() => (this.lang.lang() === 'en' ? 'Comma-separated' : 'Cách nhau bằng dấu phẩy'));
  protected readonly mismatchLabel = computed(() =>
    this.lang.lang() === 'en' ? 'Quantity differs from expected — a reason is required.' : 'Số lượng khác dự kiến — cần nhập lý do.',
  );
  protected readonly reasonLabel = computed(() => (this.lang.lang() === 'en' ? 'Reason' : 'Lý do'));
  protected readonly confirmLabel = computed(() => (this.lang.lang() === 'en' ? 'Confirm line' : 'Xác nhận dòng'));
  protected readonly summaryTitle = computed(() => (this.lang.lang() === 'en' ? 'Review and complete' : 'Xem lại và hoàn tất'));
  protected readonly unitsLabel = computed(() => (this.lang.lang() === 'en' ? 'units' : 'cái'));
  protected readonly completeLabel = computed(() => (this.lang.lang() === 'en' ? 'Complete receiving' : 'Hoàn tất nhận hàng'));

  protected confirmLine(): void {
    const line = this.currentLine();
    const order = this.order();
    if (!line || !order) return;

    const qty = Number(this.qtyInput());
    const mismatch = this.hasMismatch();
    this.confirmed.update((lines) => [
      ...lines,
      {
        sku: line.sku,
        productName: line.productName[this.lang.lang()],
        qty,
        exceptionReason: mismatch ? this.reasonInput().trim() : undefined,
      },
    ]);

    this.qtyInput.set('');
    this.lotInput.set('');
    this.expirationInput.set('');
    this.serialInput.set('');
    this.reasonInput.set('');

    if (this.lineIndex() + 1 < order.lines.length) {
      this.lineIndex.update((i) => i + 1);
    } else {
      this.view.set('summary');
    }
  }

  protected complete(): void {
    const lines: DockReceiptLineInput[] = this.confirmed().map((c) => ({
      sku: c.sku,
      qty: c.qty,
      exceptionReason: c.exceptionReason ? { en: c.exceptionReason, vi: c.exceptionReason } : undefined,
    }));
    this.store.recordDockReceipt(this.poId(), lines);
    this.router.navigate(['/operator/inbound']);
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm nx test ikho-ui --testFile=operator-inbound-receive.spec.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add source/apps/ikho-ui/src/app/features/operator/inbound/operator-inbound-receive.ts source/apps/ikho-ui/src/app/features/operator/inbound/operator-inbound-receive.spec.ts
git commit -m "feat(ikho-ui): add operator dock-receiving stepper with exception handling"
```

---

## Task 11: `OperatorInboundPutaway` component

**Files:**
- Create: `source/apps/ikho-ui/src/app/features/operator/inbound/operator-inbound-putaway.ts`
- Test: `source/apps/ikho-ui/src/app/features/operator/inbound/operator-inbound-putaway.spec.ts`

**Interfaces:**
- Consumes: `InboundStore` (Task 6).
- Produces: `OperatorInboundPutaway` component, selector `app-operator-inbound-putaway`, `readonly taskId = input.required<string>()` bound from the `:taskId` route param (Task 12). Consumed by Task 13 (`OperatorDashboard` links here).

- [ ] **Step 1: Write the failing test**

```typescript
import { Router } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { InboundStore } from '../../../core/state/inbound-store';
import { OperatorInboundPutaway } from './operator-inbound-putaway';

describe('OperatorInboundPutaway', () => {
  let navigateCalls: unknown[][];

  beforeEach(async () => {
    navigateCalls = [];
    await TestBed.configureTestingModule({
      imports: [OperatorInboundPutaway],
      providers: [
        { provide: Router, useValue: { navigate: (...args: unknown[]) => navigateCalls.push(args) } },
      ],
    }).compileComponents();
  });

  it('shows the task detail for the given taskId', () => {
    const fixture = TestBed.createComponent(OperatorInboundPutaway);
    fixture.componentRef.setInput('taskId', 'PUT-7741');
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Dock 3');
    expect(text).toContain('A-12-04');
  });

  it('confirming removes the task from the store and navigates back to the entry list', () => {
    const store = TestBed.inject(InboundStore);
    const fixture = TestBed.createComponent(OperatorInboundPutaway);
    fixture.componentRef.setInput('taskId', 'PUT-7741');
    fixture.detectChanges();

    (fixture.componentInstance as unknown as { confirm: () => void }).confirm();

    expect(store.putawayTasks().some((t) => t.id === 'PUT-7741')).toBe(false);
    expect(navigateCalls[0][0]).toEqual(['/operator/inbound']);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm nx test ikho-ui --testFile=operator-inbound-putaway.spec.ts`
Expected: FAIL — `operator-inbound-putaway.ts` does not exist yet.

- [ ] **Step 3: Implement `OperatorInboundPutaway`**

```typescript
import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { Router } from '@angular/router';
import { Button, Icon } from '@ikho/shared-ui';
import { LangService } from '../../../core/i18n/lang.service';
import { InboundStore } from '../../../core/state/inbound-store';

@Component({
  selector: 'app-operator-inbound-putaway',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Button, Icon],
  host: { class: 'flex flex-col gap-6' },
  template: `
    @if (!task()) {
      <div class="p-6 font-core text-[15px] text-shade-40">{{ notFoundLabel() }}</div>
    } @else {
      <div class="flex flex-col gap-5">
        <div class="flex items-start gap-4 rounded-lg bg-canvas-operator-elevated p-6">
          <lib-icon name="truck" [size]="32" color="var(--color-accent-teal)" />
          <div class="flex min-w-0 flex-1 flex-col gap-1.5">
            <span class="font-mono text-xs text-shade-40">{{ task()!.id }}</span>
            <span class="font-core text-2xl font-bold text-on-primary">{{ task()!.productName[lang.lang()] }}</span>
            <span class="font-mono text-sm text-accent-teal">{{ task()!.fromDock }} → {{ task()!.toBin }} · {{ task()!.qty }} {{ unitsLabel() }}</span>
          </div>
        </div>
        <lib-button variant="operator" [fullWidth]="true" (click)="confirm()">{{ confirmLabel() }}</lib-button>
      </div>
    }
  `,
})
export class OperatorInboundPutaway {
  private readonly router = inject(Router);
  protected readonly lang = inject(LangService);
  private readonly store = inject(InboundStore);

  readonly taskId = input.required<string>();

  protected readonly task = computed(() => this.store.putawayTasks().find((t) => t.id === this.taskId()));

  protected readonly notFoundLabel = computed(() => (this.lang.lang() === 'en' ? 'Putaway task not found' : 'Không tìm thấy nhiệm vụ cất kho'));
  protected readonly unitsLabel = computed(() => (this.lang.lang() === 'en' ? 'units' : 'cái'));
  protected readonly confirmLabel = computed(() => (this.lang.lang() === 'en' ? 'Confirm putaway' : 'Xác nhận cất kho'));

  protected confirm(): void {
    this.store.confirmPutaway(this.taskId());
    this.router.navigate(['/operator/inbound']);
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm nx test ikho-ui --testFile=operator-inbound-putaway.spec.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add source/apps/ikho-ui/src/app/features/operator/inbound/operator-inbound-putaway.ts source/apps/ikho-ui/src/app/features/operator/inbound/operator-inbound-putaway.spec.ts
git commit -m "feat(ikho-ui): add operator putaway confirmation screen"
```

---

## Task 12: Route Operator Mode's Inbound to the new components

**Files:**
- Modify: `source/apps/ikho-ui/src/app/features/operator/operator.routes.ts`
- Modify: `source/apps/ikho-ui/src/app/features/operator/outlined-screen/operator-outlined-screen-route.ts`

**Interfaces:**
- Consumes: `OperatorInboundEntry` (Task 9), `OperatorInboundReceive` (Task 10), `OperatorInboundPutaway` (Task 11).

- [ ] **Step 1: Update `operator.routes.ts`**

Replace `outlinedScreen('inbound'),` with three route entries:

```typescript
  {
    path: 'inbound',
    loadComponent: () => import('./inbound/operator-inbound-entry').then((m) => m.OperatorInboundEntry),
  },
  {
    path: 'inbound/receive/:poId',
    loadComponent: () => import('./inbound/operator-inbound-receive').then((m) => m.OperatorInboundReceive),
  },
  {
    path: 'inbound/putaway/:taskId',
    loadComponent: () => import('./inbound/operator-inbound-putaway').then((m) => m.OperatorInboundPutaway),
  },
  outlinedScreen('outbound'),
  outlinedScreen('inventory'),
  outlinedScreen('returns'),
```

- [ ] **Step 2: Update `OutlinedScreenId` in `operator-outlined-screen-route.ts`**

```typescript
type OutlinedScreenId = Exclude<ScreenId, 'dashboard' | 'catalogue' | 'inbound'>;
```

- [ ] **Step 3: Verify the app builds and routes**

Run: `pnpm nx build ikho-ui`
Expected: Build succeeds. Manually verify with `pnpm nx serve ikho-ui`: `/operator/inbound` loads the entry list, tapping a PO navigates to `/operator/inbound/receive/PO-10488`, and the dashboard's `/operator/dashboard` nav item for Inbound still highlights correctly on all three nested routes (per `OperatorShell.activeScreen`'s `segments[1]` check).

- [ ] **Step 4: Commit**

```bash
git add source/apps/ikho-ui/src/app/features/operator/operator.routes.ts source/apps/ikho-ui/src/app/features/operator/outlined-screen/operator-outlined-screen-route.ts
git commit -m "feat(ikho-ui): route Operator Inbound to the new receiving/putaway screens"
```

---

## Task 13: Wire `OperatorDashboard` to the live putaway queue

**Files:**
- Modify: `source/apps/ikho-ui/src/app/features/operator/dashboard/operator-dashboard.ts`
- Test: `source/apps/ikho-ui/src/app/features/operator/dashboard/operator-dashboard.spec.ts`

**Interfaces:**
- Consumes: `InboundStore.putawayTasks()` (Task 6), `STATIC_TASKS` (Task 4).
- Produces: `OperatorDashboard`'s task queue now reflects live putaway state and navigates `PUT-`-kind cards to `/operator/inbound/putaway/:taskId` on click.

- [ ] **Step 1: Write the failing test**

```typescript
import { Router } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { InboundStore } from '../../../core/state/inbound-store';
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

  it('lists active putaway tasks from the store alongside the static pick task', () => {
    const fixture = TestBed.createComponent(OperatorDashboard);
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('PUT-7741');
    expect(text).toContain('PIK-3318');
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

    (fixture.componentInstance as unknown as { onTaskClick: (t: { clickable: boolean; taskId?: string }) => void }).onTaskClick({
      clickable: true,
      taskId: 'PUT-7741',
    });

    expect(navigateCalls[0][0]).toEqual(['/operator/inbound/putaway', 'PUT-7741']);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm nx test ikho-ui --testFile=operator-dashboard.spec.ts`
Expected: FAIL — `OperatorDashboard` still imports the removed `TASKS` export and has no store wiring / `onTaskClick`.

- [ ] **Step 3: Replace `operator-dashboard.ts` contents**

```typescript
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Icon, StatusBadge, StockStatus } from '@ikho/shared-ui';
import { LangService } from '../../../core/i18n/lang.service';
import { OPERATOR_STATS, TASK_QUEUE_LABEL } from '../../../core/mock-data/dashboard.data';
import { STATIC_TASKS } from '../../../core/mock-data/tasks.data';
import { InboundStore } from '../../../core/state/inbound-store';

interface QueueCard {
  id: string;
  status: StockStatus;
  icon: string;
  kind: string;
  title: string;
  route: string;
  qty: string;
  clickable: boolean;
  taskId?: string;
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
  private readonly store = inject(InboundStore);

  protected readonly stats = computed(() =>
    OPERATOR_STATS.map((s) => ({ label: s.label[this.lang.lang()], value: s.value })),
  );
  protected readonly queueLabel = computed(() => this.lang.pick(TASK_QUEUE_LABEL));

  protected readonly tasks = computed<QueueCard[]>(() => {
    const lang = this.lang.lang();

    const putaway: QueueCard[] = this.store
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
        taskId: t.id,
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

    return [...putaway, ...staticTasks];
  });

  protected onTaskClick(task: QueueCard): void {
    if (task.clickable && task.taskId) {
      this.router.navigate(['/operator/inbound/putaway', task.taskId]);
    }
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm nx test ikho-ui --testFile=operator-dashboard.spec.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add source/apps/ikho-ui/src/app/features/operator/dashboard/operator-dashboard.ts source/apps/ikho-ui/src/app/features/operator/dashboard/operator-dashboard.spec.ts
git commit -m "feat(ikho-ui): source operator dashboard putaway tasks from InboundStore"
```

---

## Final verification

- [ ] **Run the full test suite and build**

```bash
pnpm nx test ikho-ui
pnpm nx build ikho-ui
```

Expected: All tests pass (existing `app.spec.ts` plus the 8 new spec files), and the production build succeeds with no type errors.

- [ ] **Manual smoke test**

Run: `pnpm nx serve ikho-ui`, then in the browser:
1. `/office/inbound` — confirm the 3 tabs render (Purchase orders/Receipts/Putaway tasks), click a PO row to see the detail panel, click "Create purchase order" to expand the inline form, submit a valid PO and confirm it appears at the top of the table.
2. `/operator/inbound` — confirm the Receiving tab lists open POs (not the fully-received one), tap one, step through its line(s) with a quantity that differs from expected to confirm the exception banner/reason requirement, complete the receipt, confirm it returns to the entry list and a new putaway task appears in the Putaway tab.
3. `/operator/dashboard` — confirm the new putaway task appears in the task queue and tapping it opens the putaway confirmation screen; confirming it removes it from both the dashboard queue and the Operator Inbound putaway tab.

- [ ] **Update the rollout tracking table**

In `docs/plans/warehouse-ui-rollout-plan.md`, set Inbound's "Implementation plan" column to link this file and update its status to "Implemented" once the above passes.
