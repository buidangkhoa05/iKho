# Returns Office/Operator UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the placeholder Returns screens in `ikho-ui` (Office Console's `OfficeGenericScreen`, Operator Mode's `OperatorOutlinedScreen`) with real, mock-data-driven screens covering Return orders, Inspections, and Dispositions — per `docs/superpowers/specs/2026-08-10-returns-office-operator-ui-design.md`.

**Architecture:** A new `ReturnsStore` Angular service (signals, `providedIn: 'root'`), same shape as the already-shipped `InboundStore`/`OutboundStore`, owns mutable in-memory mock state for return orders, inspections, and dispositions. Office Console gets a dedicated `OfficeReturns` component (list+detail+inline "Log return" create form with a Customer/Supplier type toggle) — no action button on the detail panel, since Office only creates and reviews; all physical/decision steps live in Operator Mode. Operator Mode gets one grouped entry list (three sections: To receive / To inspect / To disposition) plus three dedicated confirm screens (Receive, Inspect, Disposition), each a whole-order action mirroring Outbound's Allocate/Dispatch pattern rather than Inbound's line-by-line one. The Operator Dashboard's task queue gains a third source alongside putaway tasks and dispatch-ready orders: return orders not yet dispositioned, one card per order labeled with its next action.

**Tech Stack:** Angular 19 standalone components, Signals, `@ikho/shared-ui` (Button, DataPanel, DataTable, Icon, KpiCard, StatusBadge, TextInput), vitest-angular (`TestBed`), Tailwind v4 utility classes against existing design tokens.

## Global Constraints

- No `HttpClient` — all data is in-memory mock state (spec non-goal: real API wiring is a future plan).
- **No line-level inspection/disposition.** Despite the real `ikho-warehouse-returns` backend tracking both per line, this UI records one inspection result and one disposition outcome per whole order — consistent with Outbound's whole-order model, not Inbound's line-by-line one. All Inspections/Dispositions tab rows and mock seed orders in this plan use single-line orders; a whole-order action reads/writes the first line's SKU for tab display purposes.
- **No combined inspect+disposition step.** These are two separate Operator actions/screens with their own routes, matching the backend's own `Inspected`/`Dispositioned` status distinction.
- **Guard every store mutation on the order's current `stage` before acting, and gate the corresponding UI control on the same condition.** This directly avoids the double-dispatch class of bug found in Outbound's final review (`OutboundStore.dispatch()` originally didn't check whether an order had already shipped, and the "Confirm dispatch" button didn't hide itself for an already-dispatched order reached via the browser Back button). Every one of `receive`/`inspect`/`disposition` in this plan checks `stage` first and returns `{ ok: false, error }` if the order isn't at the expected stage; every confirm screen hides its action control(s) and shows a "not available" message under the same condition.
- **Reuse each store computed as the single source of truth — never re-derive a stage filter inline in a second place.** `ReturnsStore.toReceive`/`toInspect`/`toDisposition` are consumed identically by `OperatorReturnsEntry` and `OperatorDashboard`; `ReturnsStore`'s exported `DISPOSITION_RULE` constant is consumed identically by the store's own `disposition()` guard and by `OperatorReturnsDisposition`'s outcome-button filtering. This directly avoids the duplicated-predicate class of finding from Outbound's final review.
- No new shared Modal/Dialog component — "Log return" is an inline expandable panel, matching Inbound's "Create purchase order" / Outbound's "Create sales order". No new shared Select component either — the reason-code dropdown is a plain native `<select>` styled inline with Tailwind utilities to visually match `TextInput`, scoped to `OfficeReturns` only.
- Use only existing icon names from `libs/ikho-shared-ui/src/lib/icon/icon-paths.ts`: `layout-dashboard`, `building-2`, `package`, `users`, `boxes`, `truck`, `package-check`, `undo-2`, `receipt-text`, `chart-line`, `x`, `chevron-right`, `check`, `search`, `chevron-down`, `bell`, `menu`. This plan uses `undo-2` for Returns (already used for the `returns` screen icon in `screens.data.ts`).
- All user-facing strings are `{ en, vi }` `Localized<string>` pairs, resolved via `LangService.lang()` / `LangService.pick()`, matching the rest of the app. Store-returned error strings are the one accepted exception (plain `string`, matching the settled Outbound precedent) — not user-facing copy requirements, just internal error text surfaced inline.
- `OnPush` change detection, `standalone: true` (implicit — no component in this codebase sets it explicitly; Angular 19+ defaults to standalone), named exports, `inject()` for DI.
- Follow the existing flat/display-row mock-data convention (`Record<string, unknown>`-compatible interfaces with an index signature).
- Colocated `.spec.ts` tests per new/modified component and the store, following the `TestBed` + `fixture.componentInstance` pattern already established by Inbound/Outbound. Plain-object `Router` provider stubs (`{ provide: Router, useValue: { navigate: (...args) => calls.push(args) } }`) for navigation tests — no real routing config needed in unit tests.
- **Disposition rule**: `DISPOSITION_RULE: Record<InspectionResult, DispositionOutcome[]> = { Good: ['Restock'], Damaged: ['Quarantine', 'Scrap', 'VendorReturn'], Defective: ['Quarantine', 'Scrap', 'VendorReturn'] }`. `disposition()` rejects any outcome not in the set for the order's recorded `inspectionResult`. `Restock`/`Quarantine` additionally require a non-empty `bin` argument; `Scrap`/`VendorReturn` ignore it.

---

## Task 1: Return order mock data

**Files:**
- Create: `source/apps/ikho-ui/src/app/core/mock-data/return-orders.data.ts`

**Interfaces:**
- Produces: `ReturnStage = 'created' | 'received' | 'inspected' | 'dispositioned'`, `ReturnReasonCode = 'Damaged' | 'WrongItem' | 'Defective' | 'CustomerCancelled' | 'NoLongerNeeded'`, `InspectionResult = 'Good' | 'Damaged' | 'Defective'`, `DispositionOutcome = 'Restock' | 'Quarantine' | 'Scrap' | 'VendorReturn'`, `REASON_LABELS: Record<ReturnReasonCode, Localized<string>>`, `INSPECTION_RESULT_LABELS: Record<InspectionResult, Localized<string>>`, `DISPOSITION_OUTCOME_LABELS: Record<DispositionOutcome, Localized<string>>`, `ReturnOrderLine { sku: string; productName: Localized<string>; qty: number; reasonCode: ReturnReasonCode }`, `ReturnOrder { [key: string]: unknown; rma: string; type: 'customer' | 'supplier'; partner: string; sourceRef: string; qty: number; stage: ReturnStage; status: StockStatus; label: Localized<string>; inspectionResult?: InspectionResult; dispositionOutcome?: DispositionOutcome; dispositionBin?: string; lines: ReturnOrderLine[] }`, `RETURN_ORDERS: ReturnOrder[]`.
- Note the deliberate split between `stage` (a plain lifecycle discriminator, filtered on by store computeds — never displayed) and `status: StockStatus` (purely a badge color, freely reused across stages/outcomes since nothing filters on it). Keeping these separate avoids a real ambiguity: `Quarantine` (a terminal `dispositioned` outcome) and `Received` (a pre-terminal, awaiting-inspection stage) both read naturally as "amber/low-stock" colors, but must never be confused by a stage filter — if `status` alone were the filter key, reusing `low-stock` for both would silently corrupt `toInspect()`. `stage` exists specifically so `status` is free to reuse colors without that risk.

No standalone spec — this is pure data, covered by Task 5's store tests and Task 6/8's component tests (same convention as Inbound's Task 2 / Outbound's Task 2, confirmed acceptable there).

- [ ] **Step 1: Create the file**

```typescript
import { StockStatus } from '@ikho/shared-ui';
import { Localized } from '../i18n/localized.type';

export type ReturnStage = 'created' | 'received' | 'inspected' | 'dispositioned';
export type ReturnReasonCode = 'Damaged' | 'WrongItem' | 'Defective' | 'CustomerCancelled' | 'NoLongerNeeded';
export type InspectionResult = 'Good' | 'Damaged' | 'Defective';
export type DispositionOutcome = 'Restock' | 'Quarantine' | 'Scrap' | 'VendorReturn';

export const REASON_LABELS: Record<ReturnReasonCode, Localized<string>> = {
  Damaged: { en: 'Damaged', vi: 'Hư hỏng' },
  WrongItem: { en: 'Wrong item shipped', vi: 'Giao sai hàng' },
  Defective: { en: 'Defective', vi: 'Lỗi' },
  CustomerCancelled: { en: 'Customer cancelled', vi: 'Khách huỷ đơn' },
  NoLongerNeeded: { en: 'No longer needed', vi: 'Không còn cần' },
};

export const INSPECTION_RESULT_LABELS: Record<InspectionResult, Localized<string>> = {
  Good: { en: 'Good', vi: 'Tốt' },
  Damaged: { en: 'Damaged', vi: 'Hư hỏng' },
  Defective: { en: 'Defective', vi: 'Lỗi' },
};

export const DISPOSITION_OUTCOME_LABELS: Record<DispositionOutcome, Localized<string>> = {
  Restock: { en: 'Restock', vi: 'Nhập lại' },
  Quarantine: { en: 'Quarantine', vi: 'Cách ly' },
  Scrap: { en: 'Scrap', vi: 'Huỷ' },
  VendorReturn: { en: 'Vendor return', vi: 'Trả nhà cung cấp' },
};

export interface ReturnOrderLine {
  sku: string;
  productName: Localized<string>;
  qty: number;
  reasonCode: ReturnReasonCode;
}

export interface ReturnOrder {
  [key: string]: unknown;
  rma: string;
  type: 'customer' | 'supplier';
  partner: string;
  sourceRef: string;
  qty: number;
  stage: ReturnStage;
  status: StockStatus;
  label: Localized<string>;
  inspectionResult?: InspectionResult;
  dispositionOutcome?: DispositionOutcome;
  dispositionBin?: string;
  lines: ReturnOrderLine[];
}

export const RETURN_ORDERS: ReturnOrder[] = [
  {
    rma: 'RMA-0331', type: 'customer', partner: 'Meijer Retail Group', sourceRef: 'SO-88112', qty: 4,
    stage: 'dispositioned', status: 'out-of-stock', label: { en: 'Scrapped', vi: 'Đã huỷ' },
    inspectionResult: 'Damaged', dispositionOutcome: 'Scrap',
    lines: [
      { sku: 'IKH-105522', productName: { en: 'Corrugated box, 305×229×229mm', vi: 'Thùng carton, 305×229×229mm' }, qty: 4, reasonCode: 'Damaged' },
    ],
  },
  {
    rma: 'RMA-0334', type: 'customer', partner: 'Brico Bouwmarkt', sourceRef: 'SO-88140', qty: 12,
    stage: 'dispositioned', status: 'in-stock', label: { en: 'Restocked', vi: 'Đã nhập lại' },
    inspectionResult: 'Good', dispositionOutcome: 'Restock', dispositionBin: 'A-11-06',
    lines: [
      { sku: 'IKH-318440', productName: { en: 'Shelf divider, 600mm', vi: 'Vách ngăn kệ, 600mm' }, qty: 12, reasonCode: 'WrongItem' },
    ],
  },
  {
    rma: 'RMA-0337', type: 'customer', partner: 'Hafen Bremen GmbH', sourceRef: 'SO-88155', qty: 6,
    stage: 'received', status: 'low-stock', label: { en: 'Awaiting inspection', vi: 'Chờ kiểm tra' },
    lines: [
      { sku: 'IKH-482910', productName: { en: 'Steel shelving bracket, 400mm', vi: 'Giá đỡ kệ thép, 400mm' }, qty: 6, reasonCode: 'CustomerCancelled' },
    ],
  },
  {
    rma: 'RMA-0340', type: 'customer', partner: 'Meijer Retail Group', sourceRef: 'SO-88214', qty: 20,
    stage: 'inspected', status: 'outbound', label: { en: 'Inspected', vi: 'Đã kiểm tra' },
    inspectionResult: 'Damaged',
    lines: [
      { sku: 'IKH-559071', productName: { en: 'Void fill paper, 380mm', vi: 'Giấy chèn lót, 380mm' }, qty: 20, reasonCode: 'Defective' },
    ],
  },
  {
    rma: 'RMA-0343', type: 'supplier', partner: 'Wrapline BV', sourceRef: 'PO-10477', qty: 6,
    stage: 'created', status: 'returns', label: { en: 'Open', vi: 'Đang mở' },
    lines: [
      { sku: 'IKH-664120', productName: { en: 'Pallet wrap film, 500mm', vi: 'Màng quấn pallet, 500mm' }, qty: 6, reasonCode: 'Defective' },
    ],
  },
];
```

Note: `RMA-0340` is inspected with result `'Damaged'`, so only `Quarantine`/`Scrap`/`VendorReturn` are valid dispositions for it — this deliberately demonstrates the disposition-rule rejection path in Task 5's store and Task 11's UI (attempting `'Restock'` on it must fail), the same role `SO-88208` played for Outbound's insufficient-stock demo.

- [ ] **Step 2: Commit**

```bash
git add source/apps/ikho-ui/src/app/core/mock-data/return-orders.data.ts
git commit -m "feat(ikho-ui): add return order mock data with reason/inspection/disposition enums"
```

---

## Task 2: Inspection mock data

**Files:**
- Create: `source/apps/ikho-ui/src/app/core/mock-data/inspections.data.ts`

**Interfaces:**
- Produces: `Inspection { [key: string]: unknown; id: string; rma: string; sku: string; outcome: Localized<string>; inspector: string }`, `INSPECTIONS: Inspection[]`.
- Represents completed inspection records — one per order that has reached `inspected` or `dispositioned` stage (`RMA-0331`, `RMA-0334`, `RMA-0340` from Task 1; `RMA-0337` is only `received`, not yet inspected, so has no row; `RMA-0343` is only `created`).

No standalone spec — covered by Task 5's store tests.

- [ ] **Step 1: Create the file**

```typescript
import { Localized } from '../i18n/localized.type';

export interface Inspection {
  [key: string]: unknown;
  id: string;
  rma: string;
  sku: string;
  outcome: Localized<string>;
  inspector: string;
}

export const INSPECTIONS: Inspection[] = [
  { id: 'INS-0912', rma: 'RMA-0331', sku: 'IKH-105522', outcome: { en: 'Unsellable — crushed', vi: 'Không bán được — bị bẹp' }, inspector: 'S. Peeters' },
  { id: 'INS-0914', rma: 'RMA-0334', sku: 'IKH-318440', outcome: { en: 'Sellable — unopened', vi: 'Bán được — chưa mở' }, inspector: 'S. Peeters' },
  { id: 'INS-0915', rma: 'RMA-0340', sku: 'IKH-559071', outcome: { en: 'Unsellable — water damage', vi: 'Không bán được — hư nước' }, inspector: 'S. Peeters' },
];
```

- [ ] **Step 2: Commit**

```bash
git add source/apps/ikho-ui/src/app/core/mock-data/inspections.data.ts
git commit -m "feat(ikho-ui): add inspection mock data"
```

---

## Task 3: Disposition mock data

**Files:**
- Create: `source/apps/ikho-ui/src/app/core/mock-data/dispositions.data.ts`

**Interfaces:**
- Produces: `Disposition { [key: string]: unknown; id: string; rma: string; sku: string; action: Localized<string>; qty: number }`, `DISPOSITIONS: Disposition[]`.
- Represents completed disposition decisions — only for orders that have reached `dispositioned` stage (`RMA-0331`, `RMA-0334` from Task 1; `RMA-0340` is only `inspected`, not yet dispositioned, so has no row).

No standalone spec — covered by Task 5's store tests.

- [ ] **Step 1: Create the file**

```typescript
import { Localized } from '../i18n/localized.type';

export interface Disposition {
  [key: string]: unknown;
  id: string;
  rma: string;
  sku: string;
  action: Localized<string>;
  qty: number;
}

export const DISPOSITIONS: Disposition[] = [
  { id: 'DIS-0441', rma: 'RMA-0331', sku: 'IKH-105522', action: { en: 'Scrap', vi: 'Huỷ' }, qty: 4 },
  { id: 'DIS-0442', rma: 'RMA-0334', sku: 'IKH-318440', action: { en: 'Restock to A-11-06', vi: 'Nhập lại vào A-11-06' }, qty: 12 },
];
```

- [ ] **Step 2: Commit**

```bash
git add source/apps/ikho-ui/src/app/core/mock-data/dispositions.data.ts
git commit -m "feat(ikho-ui): add disposition mock data"
```

---

## Task 4: Wire Returns into `ADMIN_SCREENS`

**Files:**
- Modify: `source/apps/ikho-ui/src/app/core/mock-data/admin-screens.data.ts`

**Interfaces:**
- Consumes: `RETURN_ORDERS` (Task 1), `INSPECTIONS` (Task 2), `DISPOSITIONS` (Task 3).
- Produces: `ADMIN_SCREENS.returns.detailedTabId === 'main'`; `ADMIN_SCREENS.returns.tabs[0].rows === RETURN_ORDERS` with its `main` tab's `customer`/`ref`/`lines`/`reason`/`disposition` columns replaced by `partner`/`sourceRef`/`qty` (matching `ReturnOrder`'s field names — line-level `reason` and `disposition` detail move to the detail panel and the dedicated tabs, the same simplification Outbound made when it dropped its own inline aggregate `lines` column); `tabs[1].rows === INSPECTIONS`; `tabs[2].rows === DISPOSITIONS`.

- [ ] **Step 1: Add imports**

At the top of `admin-screens.data.ts`, alongside the existing mock-data imports (keep alphabetical order):

```typescript
import { DISPOSITIONS } from './dispositions.data';
import { INSPECTIONS } from './inspections.data';
import { RETURN_ORDERS } from './return-orders.data';
```

- [ ] **Step 2: Update the `returns` entry**

Replace the `returns: { ... }` block — add `detailedTabId: 'main'`, replace the `main` tab's columns/rows, point `inspections`/`dispositions` tab rows at the new typed mock data:

```typescript
  returns: {
    panelTitle: { en: 'Return orders', vi: 'Đơn trả hàng' },
    panelSubtitle: { en: 'Inspection and disposition · WH-3 Utrecht', vi: 'Kiểm tra và xử lý · WH-3 Utrecht' },
    detailedTabId: 'main',
    kpis: [
      { label: { en: 'Open returns', vi: 'Đơn trả đang mở' }, value: '8' },
      { label: { en: 'Awaiting inspection', vi: 'Chờ kiểm tra' }, value: '3', trendStatus: 'low-stock' },
      { label: { en: 'Restocked', vi: 'Đã nhập lại' }, value: '14' },
      { label: { en: 'Scrapped', vi: 'Đã huỷ' }, value: '2', trendStatus: 'out-of-stock' },
    ],
    tabs: [
      {
        id: 'main',
        label: { en: 'Return orders', vi: 'Đơn trả hàng' },
        columns: [
          { key: 'rma', label: same('RMA'), mono: true },
          { key: 'partner', label: { en: 'Partner', vi: 'Đối tác' } },
          { key: 'sourceRef', label: { en: 'Source', vi: 'Nguồn gốc' }, mono: true },
          { key: 'qty', label: { en: 'Quantity', vi: 'Số lượng' }, align: 'right', mono: true },
          { key: 'status', label: { en: 'Status', vi: 'Trạng thái' }, status: true },
        ],
        rows: RETURN_ORDERS,
      },
      {
        id: 'inspections',
        label: { en: 'Inspections', vi: 'Kiểm tra' },
        subtitle: { en: 'Condition assessment before disposition', vi: 'Đánh giá tình trạng trước khi xử lý' },
        columns: [
          { key: 'id', label: { en: 'Inspection', vi: 'Phiếu kiểm tra' }, mono: true },
          { key: 'rma', label: same('RMA'), mono: true },
          { key: 'sku', label: same('SKU'), mono: true },
          { key: 'outcome', label: { en: 'Outcome', vi: 'Kết quả' }, localized: true },
          { key: 'inspector', label: { en: 'Inspector', vi: 'Người kiểm tra' } },
        ],
        rows: INSPECTIONS,
      },
      {
        id: 'dispositions',
        label: { en: 'Dispositions', vi: 'Xử lý' },
        subtitle: { en: 'Restock, quarantine, scrap or vendor return', vi: 'Nhập lại, cách ly, huỷ hoặc trả nhà cung cấp' },
        columns: [
          { key: 'id', label: { en: 'Disposition', vi: 'Quyết định' }, mono: true },
          { key: 'rma', label: same('RMA'), mono: true },
          { key: 'sku', label: same('SKU'), mono: true },
          { key: 'action', label: { en: 'Action', vi: 'Hành động' }, localized: true },
          { key: 'qty', label: { en: 'Quantity', vi: 'Số lượng' }, align: 'right', mono: true },
        ],
        rows: DISPOSITIONS,
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
git commit -m "feat(ikho-ui): point ADMIN_SCREENS.returns at typed mock data"
```

---

## Task 5: `ReturnsStore`

**Files:**
- Create: `source/apps/ikho-ui/src/app/core/state/returns-store.ts`
- Test: `source/apps/ikho-ui/src/app/core/state/returns-store.spec.ts`

**Interfaces:**
- Consumes: `RETURN_ORDERS`/`ReturnOrder`/`ReturnOrderLine`/`ReturnReasonCode`/`InspectionResult`/`DispositionOutcome` (Task 1), `INSPECTIONS`/`Inspection` (Task 2), `DISPOSITIONS`/`Disposition` (Task 3), `PRODUCTS` (existing).
- Produces: `ReturnsStore` (`providedIn: 'root'`) with `returnOrders: Signal<ReturnOrder[]>`, `inspections: Signal<Inspection[]>`, `dispositions: Signal<Disposition[]>`, `toReceive: Signal<ReturnOrder[]>`, `toInspect: Signal<ReturnOrder[]>`, `toDisposition: Signal<ReturnOrder[]>`, `createReturnOrder(input: CreateReturnOrderInput): ReturnOrder`, `receive(rma: string): ReceiveResult`, `inspect(rma: string, result: InspectionResult): InspectResult`, `disposition(rma: string, outcome: DispositionOutcome, bin?: string): DispositionResult`. Also exports `CreateReturnOrderInput`, `CreateReturnOrderLineInput`, `ReceiveResult`, `InspectResult`, `DispositionResult`, `DISPOSITION_RULE`. Consumed by Tasks 6, 8, 9, 10, 11, 13.

- [ ] **Step 1: Write the failing tests**

```typescript
import { ReturnsStore } from './returns-store';

describe('ReturnsStore', () => {
  let store: ReturnsStore;

  beforeEach(() => {
    store = new ReturnsStore();
  });

  it('seeds return orders, inspections and dispositions from mock data', () => {
    expect(store.returnOrders().length).toBeGreaterThan(0);
    expect(store.inspections().length).toBeGreaterThan(0);
    expect(store.dispositions().length).toBeGreaterThan(0);
  });

  it('createReturnOrder prepends a new order with aggregated qty and the created stage', () => {
    const order = store.createReturnOrder({
      type: 'customer',
      partner: 'Test Retail BV',
      sourceRef: 'SO-99001',
      lines: [{ sku: 'IKH-482910', qty: 3, reasonCode: 'WrongItem' }],
    });

    expect(store.returnOrders()[0]).toBe(order);
    expect(order.qty).toBe(3);
    expect(order.stage).toBe('created');
    expect(order.status).toBe('returns');
    expect(order.lines[0].productName.en).toBe('Steel shelving bracket, 400mm');
  });

  it('toReceive/toInspect/toDisposition only include orders at the matching stage', () => {
    expect(store.toReceive().every((o) => o.stage === 'created')).toBe(true);
    expect(store.toInspect().every((o) => o.stage === 'received')).toBe(true);
    expect(store.toDisposition().every((o) => o.stage === 'inspected')).toBe(true);
    expect(store.toReceive().some((o) => o.rma === 'RMA-0343')).toBe(true);
    expect(store.toInspect().some((o) => o.rma === 'RMA-0337')).toBe(true);
    expect(store.toDisposition().some((o) => o.rma === 'RMA-0340')).toBe(true);
  });

  it('receive succeeds for a created order and moves it to the received stage', () => {
    const result = store.receive('RMA-0343');

    expect(result.ok).toBe(true);
    const order = store.returnOrders().find((o) => o.rma === 'RMA-0343')!;
    expect(order.stage).toBe('received');
  });

  it('receive fails for an order not awaiting receipt', () => {
    const result = store.receive('RMA-0337'); // already received

    expect(result.ok).toBe(false);
    const order = store.returnOrders().find((o) => o.rma === 'RMA-0337')!;
    expect(order.stage).toBe('received');
  });

  it('inspect succeeds for a received order, records an inspection, and moves it to the inspected stage', () => {
    const inspectionsBefore = store.inspections().length;

    const result = store.inspect('RMA-0337', 'Good');

    expect(result.ok).toBe(true);
    const order = store.returnOrders().find((o) => o.rma === 'RMA-0337')!;
    expect(order.stage).toBe('inspected');
    expect(order.inspectionResult).toBe('Good');
    expect(store.inspections().length).toBe(inspectionsBefore + 1);
  });

  it('inspect fails for an order not awaiting inspection', () => {
    const result = store.inspect('RMA-0340', 'Good'); // already inspected

    expect(result.ok).toBe(false);
  });

  it('disposition succeeds for an outcome matching the inspection result, records a disposition, and moves it to the dispositioned stage', () => {
    const dispositionsBefore = store.dispositions().length;

    const result = store.disposition('RMA-0340', 'Scrap');

    expect(result.ok).toBe(true);
    const order = store.returnOrders().find((o) => o.rma === 'RMA-0340')!;
    expect(order.stage).toBe('dispositioned');
    expect(order.dispositionOutcome).toBe('Scrap');
    expect(store.dispositions().length).toBe(dispositionsBefore + 1);
  });

  it('disposition fails when the outcome does not match the inspection-result rule', () => {
    const dispositionsBefore = store.dispositions().length;

    // RMA-0340 was inspected as Damaged, so Restock (Good-only) is not a valid outcome.
    const result = store.disposition('RMA-0340', 'Restock');

    expect(result.ok).toBe(false);
    const order = store.returnOrders().find((o) => o.rma === 'RMA-0340')!;
    expect(order.stage).toBe('inspected');
    expect(store.dispositions().length).toBe(dispositionsBefore);
  });

  it('disposition requires a bin for Restock/Quarantine and fails without one', () => {
    store.receive('RMA-0343');
    store.inspect('RMA-0343', 'Good');
    const dispositionsBefore = store.dispositions().length;

    const result = store.disposition('RMA-0343', 'Restock');

    expect(result.ok).toBe(false);
    expect(store.dispositions().length).toBe(dispositionsBefore);
  });

  it('disposition succeeds with a bin for Restock and records it on the order', () => {
    store.receive('RMA-0343');
    store.inspect('RMA-0343', 'Good');

    const result = store.disposition('RMA-0343', 'Restock', 'A-04-02');

    expect(result.ok).toBe(true);
    const order = store.returnOrders().find((o) => o.rma === 'RMA-0343')!;
    expect(order.dispositionBin).toBe('A-04-02');
  });

  it('disposition fails for an order not awaiting disposition (double-disposition guard)', () => {
    const dispositionsBefore = store.dispositions().length;

    const result = store.disposition('RMA-0331', 'Scrap'); // RMA-0331 is already dispositioned

    expect(result.ok).toBe(false);
    expect(store.dispositions().length).toBe(dispositionsBefore);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm nx test ikho-ui --include="**/returns-store.spec.ts"`
Expected: FAIL — `returns-store.ts` does not exist yet.

- [ ] **Step 3: Implement `ReturnsStore`**

```typescript
import { computed, Injectable, signal } from '@angular/core';
import { Localized } from '../i18n/localized.type';
import { Disposition, DISPOSITIONS } from '../mock-data/dispositions.data';
import { Inspection, INSPECTIONS } from '../mock-data/inspections.data';
import { PRODUCTS } from '../mock-data/products.data';
import {
  DISPOSITION_OUTCOME_LABELS,
  DispositionOutcome,
  INSPECTION_RESULT_LABELS,
  InspectionResult,
  ReturnOrder,
  ReturnOrderLine,
  ReturnReasonCode,
  RETURN_ORDERS,
} from '../mock-data/return-orders.data';

export interface CreateReturnOrderLineInput {
  sku: string;
  qty: number;
  reasonCode: ReturnReasonCode;
}

export interface CreateReturnOrderInput {
  type: 'customer' | 'supplier';
  partner: string;
  sourceRef: string;
  lines: CreateReturnOrderLineInput[];
}

export type ReceiveResult = { ok: true } | { ok: false; error: string };
export type InspectResult = { ok: true } | { ok: false; error: string };
export type DispositionResult = { ok: true; disposition: Disposition } | { ok: false; error: string };

/** Single source of truth for which disposition outcomes are valid for a given inspection result. */
export const DISPOSITION_RULE: Record<InspectionResult, DispositionOutcome[]> = {
  Good: ['Restock'],
  Damaged: ['Quarantine', 'Scrap', 'VendorReturn'],
  Defective: ['Quarantine', 'Scrap', 'VendorReturn'],
};

let rmaSeq = 344;
let inspectionSeq = 920;
let dispositionSeq = 443;

function productName(sku: string): Localized<string> {
  return PRODUCTS.find((p) => p.sku === sku)?.name ?? { en: sku, vi: sku };
}

@Injectable({ providedIn: 'root' })
export class ReturnsStore {
  readonly returnOrders = signal<ReturnOrder[]>([...RETURN_ORDERS]);
  readonly inspections = signal<Inspection[]>([...INSPECTIONS]);
  readonly dispositions = signal<Disposition[]>([...DISPOSITIONS]);

  /** Single source of truth for which orders are awaiting each next step. */
  readonly toReceive = computed(() => this.returnOrders().filter((o) => o.stage === 'created'));
  readonly toInspect = computed(() => this.returnOrders().filter((o) => o.stage === 'received'));
  readonly toDisposition = computed(() => this.returnOrders().filter((o) => o.stage === 'inspected'));

  createReturnOrder(input: CreateReturnOrderInput): ReturnOrder {
    const lines: ReturnOrderLine[] = input.lines.map((line) => ({
      sku: line.sku,
      productName: productName(line.sku),
      qty: line.qty,
      reasonCode: line.reasonCode,
    }));

    const order: ReturnOrder = {
      rma: `RMA-${rmaSeq++}`,
      type: input.type,
      partner: input.partner,
      sourceRef: input.sourceRef,
      qty: lines.reduce((sum, l) => sum + l.qty, 0),
      stage: 'created',
      status: 'returns',
      label: { en: 'Open', vi: 'Đang mở' },
      lines,
    };

    this.returnOrders.update((orders) => [order, ...orders]);
    return order;
  }

  receive(rma: string): ReceiveResult {
    const order = this.returnOrders().find((o) => o.rma === rma);
    if (!order || order.stage !== 'created') {
      return { ok: false, error: `Return order '${rma}' is not awaiting receipt.` };
    }

    const updated: ReturnOrder = {
      ...order,
      stage: 'received',
      status: 'low-stock',
      label: { en: 'Awaiting inspection', vi: 'Chờ kiểm tra' },
    };
    this.returnOrders.update((orders) => orders.map((o) => (o.rma === rma ? updated : o)));
    return { ok: true };
  }

  inspect(rma: string, result: InspectionResult): InspectResult {
    const order = this.returnOrders().find((o) => o.rma === rma);
    if (!order || order.stage !== 'received') {
      return { ok: false, error: `Return order '${rma}' is not awaiting inspection.` };
    }

    const updated: ReturnOrder = {
      ...order,
      stage: 'inspected',
      status: 'outbound',
      label: { en: 'Inspected', vi: 'Đã kiểm tra' },
      inspectionResult: result,
    };
    this.returnOrders.update((orders) => orders.map((o) => (o.rma === rma ? updated : o)));

    const newInspection: Inspection = {
      id: `INS-${inspectionSeq++}`,
      rma,
      sku: order.lines[0].sku,
      outcome: INSPECTION_RESULT_LABELS[result],
      inspector: 'Operator',
    };
    this.inspections.update((ins) => [newInspection, ...ins]);

    return { ok: true };
  }

  disposition(rma: string, outcome: DispositionOutcome, bin?: string): DispositionResult {
    const order = this.returnOrders().find((o) => o.rma === rma);
    if (!order || order.stage !== 'inspected' || !order.inspectionResult) {
      return { ok: false, error: `Return order '${rma}' is not awaiting disposition.` };
    }

    if (!DISPOSITION_RULE[order.inspectionResult].includes(outcome)) {
      return { ok: false, error: `'${outcome}' is not a valid disposition for a '${order.inspectionResult}' inspection result.` };
    }

    const needsBin = outcome === 'Restock' || outcome === 'Quarantine';
    const trimmedBin = bin?.trim();
    if (needsBin && !trimmedBin) {
      return { ok: false, error: 'A bin is required for Restock or Quarantine.' };
    }

    const label: Localized<string> =
      outcome === 'Restock'
        ? { en: 'Restocked', vi: 'Đã nhập lại' }
        : outcome === 'Quarantine'
          ? { en: 'Quarantined', vi: 'Đã cách ly' }
          : outcome === 'Scrap'
            ? { en: 'Scrapped', vi: 'Đã huỷ' }
            : { en: 'Sent to vendor', vi: 'Đã gửi trả NCC' };
    const status = outcome === 'Restock' ? 'in-stock' : outcome === 'Quarantine' ? 'low-stock' : 'out-of-stock';

    const updated: ReturnOrder = {
      ...order,
      stage: 'dispositioned',
      status,
      label,
      dispositionOutcome: outcome,
      dispositionBin: needsBin ? trimmedBin : undefined,
    };
    this.returnOrders.update((orders) => orders.map((o) => (o.rma === rma ? updated : o)));

    const actionText: Localized<string> = needsBin
      ? {
          en: `${DISPOSITION_OUTCOME_LABELS[outcome].en} to ${trimmedBin}`,
          vi: `${DISPOSITION_OUTCOME_LABELS[outcome].vi} vào ${trimmedBin}`,
        }
      : DISPOSITION_OUTCOME_LABELS[outcome];
    const disposition: Disposition = {
      id: `DIS-${dispositionSeq++}`,
      rma,
      sku: order.lines[0].sku,
      action: actionText,
      qty: order.qty,
    };
    this.dispositions.update((d) => [disposition, ...d]);

    return { ok: true, disposition };
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm nx test ikho-ui --include="**/returns-store.spec.ts"`
Expected: PASS (12 tests: seeds, createReturnOrder, stage-computeds, receive-success, receive-fail, inspect-success, inspect-fail, disposition-success, disposition-rule-fail, disposition-bin-required-fail, disposition-with-bin-success, disposition-double-guard-fail)

- [ ] **Step 5: Commit**

```bash
git add source/apps/ikho-ui/src/app/core/state/returns-store.ts source/apps/ikho-ui/src/app/core/state/returns-store.spec.ts
git commit -m "feat(ikho-ui): add ReturnsStore for mock return order/inspection/disposition state"
```

---

## Task 6: `OfficeReturns` component

**Files:**
- Create: `source/apps/ikho-ui/src/app/features/office/returns/office-returns.ts`
- Test: `source/apps/ikho-ui/src/app/features/office/returns/office-returns.spec.ts`

**Interfaces:**
- Consumes: `OfficeScreen`/`OfficeDetailPanel` (existing, unmodified — no action button needed for Returns), `ADMIN_SCREENS.returns` (Task 4), `ReturnsStore` (Task 5), `PRODUCTS` (existing), `resolveKpis`/`resolveTabs` (existing), `resolveStatusLabel` (existing), `Button`/`DataPanel`/`TextInput` (existing shared-ui), `REASON_LABELS`/`ReturnReasonCode`/`ReturnOrderLine`/`InspectionResult`/`DispositionOutcome`/`INSPECTION_RESULT_LABELS`/`DISPOSITION_OUTCOME_LABELS` (Task 1).
- Produces: `OfficeReturns` component, selector `app-office-returns`. Consumed by Task 7's route.

- [ ] **Step 1: Write the failing test**

```typescript
import { provideRouter } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { OfficeReturns } from './office-returns';

describe('OfficeReturns', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OfficeReturns],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('renders the return orders table with seeded rows', () => {
    const fixture = TestBed.createComponent(OfficeReturns);
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('RMA-0331');
    expect(text).toContain('Meijer Retail Group');
  });

  it('opens the log-return form, supports switching to a supplier return, and adds a row on submit', () => {
    const fixture = TestBed.createComponent(OfficeReturns);
    fixture.detectChanges();

    const instance = fixture.componentInstance as unknown as {
      showCreateForm: { set: (v: boolean) => void };
      formType: { set: (v: 'customer' | 'supplier') => void };
      formPartner: { set: (v: string) => void };
      formSourceRef: { set: (v: string) => void };
      updateLineSku: (i: number, v: string) => void;
      updateLineQty: (i: number, v: string) => void;
      updateLineReason: (i: number, v: string) => void;
      submitCreate: () => void;
    };

    instance.showCreateForm.set(true);
    instance.formType.set('supplier');
    instance.formPartner.set('Nordic Labels A/S');
    instance.formSourceRef.set('PO-10488');
    instance.updateLineSku(0, 'IKH-330298');
    instance.updateLineQty(0, '5');
    instance.updateLineReason(0, 'Defective');
    instance.submitCreate();
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Nordic Labels A/S');
  });

  it('detail panel shows inspection and disposition fields for a dispositioned order, with no action button', () => {
    const fixture = TestBed.createComponent(OfficeReturns);
    fixture.detectChanges();

    const instance = fixture.componentInstance as unknown as {
      detail: () => (row: Record<string, unknown>) => { action?: unknown; fields: { label: string; value: string }[] };
    };

    const dispositionedRow = {
      rma: 'RMA-0331', type: 'customer', partner: 'Meijer Retail Group', sourceRef: 'SO-88112', qty: 4,
      status: 'out-of-stock', label: { en: 'Scrapped', vi: 'Đã huỷ' },
      inspectionResult: 'Damaged', dispositionOutcome: 'Scrap',
      lines: [{ sku: 'IKH-105522', productName: { en: 'Corrugated box, 305×229×229mm', vi: 'Thùng carton, 305×229×229mm' }, qty: 4, reasonCode: 'Damaged' }],
    };

    const panel = instance.detail()(dispositionedRow);

    expect(panel.action).toBeUndefined();
    expect(panel.fields.some((f) => f.value.includes('Damaged'))).toBe(true);
    expect(panel.fields.some((f) => f.value.includes('Scrap'))).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm nx test ikho-ui --include="**/office-returns.spec.ts"`
Expected: FAIL — `office-returns.ts` does not exist yet.

- [ ] **Step 3: Implement `OfficeReturns`**

```typescript
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Button, DataPanel, TextInput } from '@ikho/shared-ui';
import { LangService } from '../../../core/i18n/lang.service';
import { Localized } from '../../../core/i18n/localized.type';
import { resolveStatusLabel } from '../../../core/i18n/status-label.util';
import { resolveKpis, resolveTabs } from '../../../core/mock-data/admin-screen.util';
import { ADMIN_SCREENS } from '../../../core/mock-data/admin-screens.data';
import { PRODUCTS } from '../../../core/mock-data/products.data';
import {
  DISPOSITION_OUTCOME_LABELS,
  DispositionOutcome,
  INSPECTION_RESULT_LABELS,
  InspectionResult,
  REASON_LABELS,
  ReturnOrderLine,
  ReturnReasonCode,
} from '../../../core/mock-data/return-orders.data';
import { screenMeta, screenTitle, SCREENS } from '../../../core/mock-data/screens.data';
import { ReturnsStore } from '../../../core/state/returns-store';
import { OfficeDetailPanel, OfficeScreen } from '../../../shared/components/office-screen/office-screen';

const DATA = ADMIN_SCREENS.returns;
const REASON_CODES: ReturnReasonCode[] = ['Damaged', 'WrongItem', 'Defective', 'CustomerCancelled', 'NoLongerNeeded'];

interface DraftLine {
  sku: string;
  qty: string;
  reasonCode: ReturnReasonCode;
}

@Component({
  selector: 'app-office-returns',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Button, DataPanel, OfficeScreen, TextInput],
  template: `
    @if (showCreateForm()) {
      <lib-data-panel [title]="formTitle()" [subtitle]="formSubtitle()">
        <div class="flex flex-col gap-4">
          <div class="flex gap-3">
            <lib-button [variant]="formType() === 'customer' ? 'primary' : 'secondary'" (click)="formType.set('customer')">{{ customerTypeLabel() }}</lib-button>
            <lib-button [variant]="formType() === 'supplier' ? 'primary' : 'secondary'" (click)="formType.set('supplier')">{{ supplierTypeLabel() }}</lib-button>
          </div>
          <div class="grid grid-cols-2 gap-4">
            <lib-text-input [label]="partnerLabel()" [value]="formPartner()" (valueChange)="formPartner.set($event)" />
            <lib-text-input [label]="sourceRefLabel()" [value]="formSourceRef()" (valueChange)="formSourceRef.set($event)" />
          </div>
          @for (line of formLines(); track $index; let i = $index) {
            <div class="flex items-end gap-3">
              <lib-text-input [label]="skuLabel()" [value]="line.sku" (valueChange)="updateLineSku(i, $event)" />
              <lib-text-input [label]="qtyLabel()" type="number" [value]="line.qty" (valueChange)="updateLineQty(i, $event)" />
              <label class="flex w-full flex-col gap-1.5">
                <span class="font-core text-[13px] font-semibold text-ink">{{ reasonLabel() }}</span>
                <select
                  class="rounded-input border border-hairline-light bg-canvas-light px-3 py-2 font-core text-body-md text-text-body outline-none focus:border-primary"
                  [value]="line.reasonCode"
                  (change)="updateLineReason(i, $any($event.target).value)"
                >
                  @for (code of reasonCodes; track code) {
                    <option [value]="code">{{ reasonCodeLabel(code) }}</option>
                  }
                </select>
              </label>
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
export class OfficeReturns {
  private readonly lang = inject(LangService);
  private readonly store = inject(ReturnsStore);

  protected readonly reasonCodes = REASON_CODES;

  protected readonly title = computed(() => screenTitle('returns', 'admin', this.lang.lang()));
  protected readonly meta = computed(() => screenMeta('returns', 'admin', this.lang.lang()));
  protected readonly primaryActionLabel = computed(() => SCREENS.returns.action[this.lang.lang()]);
  protected readonly kpis = computed(() => resolveKpis(DATA.kpis, this.lang.lang()));

  protected readonly tabs = computed(() =>
    resolveTabs(
      [
        { ...DATA.tabs[0], rows: this.store.returnOrders() },
        { ...DATA.tabs[1], rows: this.store.inspections() },
        { ...DATA.tabs[2], rows: this.store.dispositions() },
      ],
      this.lang.lang(),
    ),
  );

  protected readonly searchPlaceholder = computed(() =>
    this.lang.lang() === 'en' ? 'Search RMA, partner' : 'Tìm phiếu trả, đối tác',
  );
  protected readonly searchFields = ['rma', 'partner'];
  protected readonly rowKey = (row: Record<string, unknown>) => String(row['rma']);

  protected readonly detail = computed(() => {
    const lang = this.lang.lang();
    const eyebrow = lang === 'en' ? 'Return order detail' : 'Chi tiết đơn trả hàng';
    const sourceRefLabel = lang === 'en' ? 'Source' : 'Nguồn gốc';
    const inspectionLabel = lang === 'en' ? 'Inspection' : 'Kiểm tra';
    const dispositionLabel = lang === 'en' ? 'Disposition' : 'Xử lý';
    return (row: Record<string, unknown>): OfficeDetailPanel => {
      const status = row['status'] as OfficeDetailPanel['status'];
      const lines = row['lines'] as ReturnOrderLine[];
      const inspectionResult = row['inspectionResult'] as InspectionResult | undefined;
      const dispositionOutcome = row['dispositionOutcome'] as DispositionOutcome | undefined;
      const dispositionBin = row['dispositionBin'] as string | undefined;
      return {
        eyebrow,
        title: String(row['partner']),
        code: String(row['rma']),
        status,
        statusLabel: resolveStatusLabel({ status, label: row['label'] as Localized<string> | undefined }, lang),
        fields: [
          { label: sourceRefLabel, value: String(row['sourceRef']) },
          ...lines.map((l) => ({ label: l.productName[lang], value: `${l.qty} · ${REASON_LABELS[l.reasonCode][lang]}` })),
          { label: inspectionLabel, value: inspectionResult ? INSPECTION_RESULT_LABELS[inspectionResult][lang] : '—' },
          {
            label: dispositionLabel,
            value: dispositionOutcome
              ? `${DISPOSITION_OUTCOME_LABELS[dispositionOutcome][lang]}${dispositionBin ? ` (${dispositionBin})` : ''}`
              : '—',
          },
        ],
      };
    };
  });

  protected readonly formTitle = computed(() => (this.lang.lang() === 'en' ? 'Log return' : 'Ghi nhận trả hàng'));
  protected readonly formSubtitle = computed(() =>
    this.lang.lang() === 'en' ? 'Type, partner, source reference and returned lines' : 'Loại, đối tác, chứng từ gốc và dòng trả hàng',
  );
  protected readonly customerTypeLabel = computed(() => (this.lang.lang() === 'en' ? 'Customer return' : 'Trả từ khách hàng'));
  protected readonly supplierTypeLabel = computed(() => (this.lang.lang() === 'en' ? 'Supplier return' : 'Trả cho NCC'));
  protected readonly partnerLabel = computed(() =>
    this.formType() === 'customer'
      ? this.lang.lang() === 'en' ? 'Customer' : 'Khách hàng'
      : this.lang.lang() === 'en' ? 'Supplier' : 'Nhà cung cấp',
  );
  protected readonly sourceRefLabel = computed(() =>
    this.formType() === 'customer'
      ? this.lang.lang() === 'en' ? 'Original SO' : 'Đơn bán gốc'
      : this.lang.lang() === 'en' ? 'Original PO' : 'Đơn mua gốc',
  );
  protected readonly reasonLabel = computed(() => (this.lang.lang() === 'en' ? 'Reason' : 'Lý do'));
  protected readonly skuLabel = computed(() => 'SKU');
  protected readonly qtyLabel = computed(() => (this.lang.lang() === 'en' ? 'Quantity' : 'Số lượng'));
  protected readonly addLineLabel = computed(() => (this.lang.lang() === 'en' ? 'Add line' : 'Thêm dòng'));
  protected readonly removeLabel = computed(() => (this.lang.lang() === 'en' ? 'Remove' : 'Xoá'));
  protected readonly submitLabel = computed(() => (this.lang.lang() === 'en' ? 'Create' : 'Tạo'));
  protected readonly cancelLabel = computed(() => (this.lang.lang() === 'en' ? 'Cancel' : 'Huỷ'));

  protected readonly showCreateForm = signal(false);
  protected readonly formType = signal<'customer' | 'supplier'>('customer');
  protected readonly formPartner = signal('');
  protected readonly formSourceRef = signal('');
  protected readonly formLines = signal<DraftLine[]>([{ sku: '', qty: '', reasonCode: 'Damaged' }]);
  protected readonly formError = signal<string | null>(null);

  protected reasonCodeLabel(code: ReturnReasonCode): string {
    return REASON_LABELS[code][this.lang.lang()];
  }

  protected addLine(): void {
    this.formLines.update((lines) => [...lines, { sku: '', qty: '', reasonCode: 'Damaged' }]);
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

  protected updateLineReason(index: number, reasonCode: string): void {
    this.formLines.update((lines) => lines.map((l, i) => (i === index ? { ...l, reasonCode: reasonCode as ReturnReasonCode } : l)));
  }

  protected submitCreate(): void {
    const partner = this.formPartner().trim();
    const sourceRef = this.formSourceRef().trim();
    const lang = this.lang.lang();

    if (!partner || !sourceRef) {
      this.formError.set(lang === 'en' ? 'Partner and source reference are required.' : 'Cần nhập đối tác và chứng từ gốc.');
      return;
    }

    const lines: { sku: string; qty: number; reasonCode: ReturnReasonCode }[] = [];
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
      lines.push({ sku, qty, reasonCode: line.reasonCode });
    }

    this.store.createReturnOrder({ type: this.formType(), partner, sourceRef, lines });
    this.formError.set(null);
    this.formPartner.set('');
    this.formSourceRef.set('');
    this.formLines.set([{ sku: '', qty: '', reasonCode: 'Damaged' }]);
    this.showCreateForm.set(false);
  }

  protected cancelCreate(): void {
    this.formError.set(null);
    this.showCreateForm.set(false);
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm nx test ikho-ui --include="**/office-returns.spec.ts"`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add source/apps/ikho-ui/src/app/features/office/returns/office-returns.ts source/apps/ikho-ui/src/app/features/office/returns/office-returns.spec.ts
git commit -m "feat(ikho-ui): add dedicated OfficeReturns screen with type toggle and reason-code create form"
```

---

## Task 7: Route Office Console's Returns to `OfficeReturns`

**Files:**
- Modify: `source/apps/ikho-ui/src/app/features/office/office.routes.ts`
- Modify: `source/apps/ikho-ui/src/app/features/office/generic-screen/office-generic-screen.ts`

**Interfaces:**
- Consumes: `OfficeReturns` (Task 6).

- [ ] **Step 1: Update `office.routes.ts`**

Replace `genericScreen('returns'),` with a dedicated route entry (keep it in the same list position):

```typescript
  {
    path: 'returns',
    loadComponent: () => import('./returns/office-returns').then((m) => m.OfficeReturns),
  },
  genericScreen('billing'),
  genericScreen('reporting'),
```

- [ ] **Step 2: Update `GenericScreenId` in `office-generic-screen.ts`**

```typescript
type GenericScreenId = Exclude<ScreenId, 'dashboard' | 'catalogue' | 'inventory' | 'inbound' | 'outbound' | 'returns'>;
```

- [ ] **Step 3: Verify the app builds**

Run: `pnpm nx build ikho-ui`
Expected: clean build.

- [ ] **Step 4: Commit**

```bash
git add source/apps/ikho-ui/src/app/features/office/office.routes.ts source/apps/ikho-ui/src/app/features/office/generic-screen/office-generic-screen.ts
git commit -m "feat(ikho-ui): route Office Returns to the dedicated screen"
```

---

## Task 8: `OperatorReturnsEntry` component

**Files:**
- Create: `source/apps/ikho-ui/src/app/features/operator/returns/operator-returns-entry.ts`
- Test: `source/apps/ikho-ui/src/app/features/operator/returns/operator-returns-entry.spec.ts`

**Interfaces:**
- Consumes: `ReturnsStore` (Task 5).
- Produces: `OperatorReturnsEntry` component, selector `app-operator-returns-entry`. Navigates to `/operator/returns/receive/:rma`, `/operator/returns/inspect/:rma`, `/operator/returns/disposition/:rma` (routes added in Task 12).

- [ ] **Step 1: Write the failing test**

```typescript
import { Router } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { OperatorReturnsEntry } from './operator-returns-entry';

describe('OperatorReturnsEntry', () => {
  let navigateCalls: unknown[][];

  beforeEach(async () => {
    navigateCalls = [];
    await TestBed.configureTestingModule({
      imports: [OperatorReturnsEntry],
      providers: [
        { provide: Router, useValue: { navigate: (...args: unknown[]) => navigateCalls.push(args) } },
      ],
    }).compileComponents();
  });

  it('groups orders into the correct section by stage', () => {
    const fixture = TestBed.createComponent(OperatorReturnsEntry);
    fixture.detectChanges();

    const instance = fixture.componentInstance as unknown as {
      toReceive: () => { rma: string }[];
      toInspect: () => { rma: string }[];
      toDisposition: () => { rma: string }[];
    };

    expect(instance.toReceive().some((o) => o.rma === 'RMA-0343')).toBe(true);
    expect(instance.toInspect().some((o) => o.rma === 'RMA-0337')).toBe(true);
    expect(instance.toDisposition().some((o) => o.rma === 'RMA-0340')).toBe(true);
    // A dispositioned order (RMA-0331) must not appear in any pending section.
    expect(instance.toReceive().some((o) => o.rma === 'RMA-0331')).toBe(false);
    expect(instance.toInspect().some((o) => o.rma === 'RMA-0331')).toBe(false);
    expect(instance.toDisposition().some((o) => o.rma === 'RMA-0331')).toBe(false);
  });

  it('navigates to the correct route per section when a card is opened', () => {
    const fixture = TestBed.createComponent(OperatorReturnsEntry);
    fixture.detectChanges();

    const instance = fixture.componentInstance as unknown as {
      openReceive: (rma: string) => void;
      openInspect: (rma: string) => void;
      openDisposition: (rma: string) => void;
    };

    instance.openReceive('RMA-0343');
    expect(navigateCalls[0][0]).toEqual(['/operator/returns/receive', 'RMA-0343']);

    instance.openInspect('RMA-0337');
    expect(navigateCalls[1][0]).toEqual(['/operator/returns/inspect', 'RMA-0337']);

    instance.openDisposition('RMA-0340');
    expect(navigateCalls[2][0]).toEqual(['/operator/returns/disposition', 'RMA-0340']);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm nx test ikho-ui --include="**/operator-returns-entry.spec.ts"`
Expected: FAIL — `operator-returns-entry.ts` does not exist yet.

- [ ] **Step 3: Implement `OperatorReturnsEntry`**

```typescript
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Icon, StatusBadge } from '@ikho/shared-ui';
import { LangService } from '../../../core/i18n/lang.service';
import { resolveStatusLabel } from '../../../core/i18n/status-label.util';
import { ReturnsStore } from '../../../core/state/returns-store';

@Component({
  selector: 'app-operator-returns-entry',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon, StatusBadge],
  host: { class: 'flex flex-col gap-6' },
  template: `
    <div class="flex flex-col gap-4">
      <span class="font-core text-sm font-semibold tracking-[0.5px] text-shade-40 uppercase">{{ toReceiveLabel() }}</span>
      <div class="flex flex-col gap-3.5">
        @for (o of toReceive(); track o.rma) {
          <div
            class="flex min-h-14 cursor-pointer items-center gap-[18px] rounded-lg bg-canvas-operator-elevated p-5"
            tabindex="0"
            role="button"
            (click)="openReceive(o.rma)"
            (keydown.enter)="openReceive(o.rma)"
          >
            <lib-icon name="undo-2" [size]="32" color="var(--color-accent-teal)" />
            <div class="flex min-w-0 flex-1 flex-col gap-1.5">
              <div class="flex items-center gap-2.5">
                <span class="font-mono text-xs text-shade-40">{{ o.rma }}</span>
                <lib-status-badge [status]="o.status" [label]="o.statusLabel" />
              </div>
              <span class="font-core text-xl font-bold text-on-primary">{{ o.partner }}</span>
              <span class="font-mono text-sm text-accent-teal">{{ o.sourceRef }} · {{ o.qty }} {{ unitsLabel() }}</span>
            </div>
            <lib-icon name="chevron-right" [size]="28" color="var(--color-shade-50)" />
          </div>
        } @empty {
          <div class="p-6 font-core text-[15px] text-shade-40">{{ emptyLabel() }}</div>
        }
      </div>
    </div>

    <div class="flex flex-col gap-4">
      <span class="font-core text-sm font-semibold tracking-[0.5px] text-shade-40 uppercase">{{ toInspectLabel() }}</span>
      <div class="flex flex-col gap-3.5">
        @for (o of toInspect(); track o.rma) {
          <div
            class="flex min-h-14 cursor-pointer items-center gap-[18px] rounded-lg bg-canvas-operator-elevated p-5"
            tabindex="0"
            role="button"
            (click)="openInspect(o.rma)"
            (keydown.enter)="openInspect(o.rma)"
          >
            <lib-icon name="undo-2" [size]="32" color="var(--color-accent-teal)" />
            <div class="flex min-w-0 flex-1 flex-col gap-1.5">
              <div class="flex items-center gap-2.5">
                <span class="font-mono text-xs text-shade-40">{{ o.rma }}</span>
                <lib-status-badge [status]="o.status" [label]="o.statusLabel" />
              </div>
              <span class="font-core text-xl font-bold text-on-primary">{{ o.partner }}</span>
              <span class="font-mono text-sm text-accent-teal">{{ o.sourceRef }} · {{ o.qty }} {{ unitsLabel() }}</span>
            </div>
            <lib-icon name="chevron-right" [size]="28" color="var(--color-shade-50)" />
          </div>
        } @empty {
          <div class="p-6 font-core text-[15px] text-shade-40">{{ emptyLabel() }}</div>
        }
      </div>
    </div>

    <div class="flex flex-col gap-4">
      <span class="font-core text-sm font-semibold tracking-[0.5px] text-shade-40 uppercase">{{ toDispositionLabel() }}</span>
      <div class="flex flex-col gap-3.5">
        @for (o of toDisposition(); track o.rma) {
          <div
            class="flex min-h-14 cursor-pointer items-center gap-[18px] rounded-lg bg-canvas-operator-elevated p-5"
            tabindex="0"
            role="button"
            (click)="openDisposition(o.rma)"
            (keydown.enter)="openDisposition(o.rma)"
          >
            <lib-icon name="undo-2" [size]="32" color="var(--color-accent-teal)" />
            <div class="flex min-w-0 flex-1 flex-col gap-1.5">
              <div class="flex items-center gap-2.5">
                <span class="font-mono text-xs text-shade-40">{{ o.rma }}</span>
                <lib-status-badge [status]="o.status" [label]="o.statusLabel" />
              </div>
              <span class="font-core text-xl font-bold text-on-primary">{{ o.partner }}</span>
              <span class="font-mono text-sm text-accent-teal">{{ o.sourceRef }} · {{ o.qty }} {{ unitsLabel() }}</span>
            </div>
            <lib-icon name="chevron-right" [size]="28" color="var(--color-shade-50)" />
          </div>
        } @empty {
          <div class="p-6 font-core text-[15px] text-shade-40">{{ emptyLabel() }}</div>
        }
      </div>
    </div>
  `,
})
export class OperatorReturnsEntry {
  private readonly router = inject(Router);
  protected readonly lang = inject(LangService);
  private readonly store = inject(ReturnsStore);

  protected readonly toReceive = computed(() => {
    const lang = this.lang.lang();
    return this.store.toReceive().map((o) => ({ ...o, statusLabel: resolveStatusLabel(o, lang) }));
  });
  protected readonly toInspect = computed(() => {
    const lang = this.lang.lang();
    return this.store.toInspect().map((o) => ({ ...o, statusLabel: resolveStatusLabel(o, lang) }));
  });
  protected readonly toDisposition = computed(() => {
    const lang = this.lang.lang();
    return this.store.toDisposition().map((o) => ({ ...o, statusLabel: resolveStatusLabel(o, lang) }));
  });

  protected readonly toReceiveLabel = computed(() => (this.lang.lang() === 'en' ? 'To receive' : 'Chờ nhận hàng'));
  protected readonly toInspectLabel = computed(() => (this.lang.lang() === 'en' ? 'To inspect' : 'Chờ kiểm tra'));
  protected readonly toDispositionLabel = computed(() => (this.lang.lang() === 'en' ? 'To disposition' : 'Chờ xử lý'));
  protected readonly unitsLabel = computed(() => (this.lang.lang() === 'en' ? 'units' : 'cái'));
  protected readonly emptyLabel = computed(() => (this.lang.lang() === 'en' ? 'Nothing here right now' : 'Hiện chưa có gì'));

  protected openReceive(rma: string): void {
    this.router.navigate(['/operator/returns/receive', rma]);
  }

  protected openInspect(rma: string): void {
    this.router.navigate(['/operator/returns/inspect', rma]);
  }

  protected openDisposition(rma: string): void {
    this.router.navigate(['/operator/returns/disposition', rma]);
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm nx test ikho-ui --include="**/operator-returns-entry.spec.ts"`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add source/apps/ikho-ui/src/app/features/operator/returns/operator-returns-entry.ts source/apps/ikho-ui/src/app/features/operator/returns/operator-returns-entry.spec.ts
git commit -m "feat(ikho-ui): add operator Returns entry list (receive/inspect/disposition queues)"
```

---

## Task 9: `OperatorReturnsReceive` component

**Files:**
- Create: `source/apps/ikho-ui/src/app/features/operator/returns/operator-returns-receive.ts`
- Test: `source/apps/ikho-ui/src/app/features/operator/returns/operator-returns-receive.spec.ts`

**Interfaces:**
- Consumes: `ReturnsStore` (Task 5).
- Produces: `OperatorReturnsReceive` component, selector `app-operator-returns-receive`, `readonly rma = input.required<string>()` bound from the `:rma` route param (Task 12).

- [ ] **Step 1: Write the failing test**

```typescript
import { Router } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { ReturnsStore } from '../../../core/state/returns-store';
import { OperatorReturnsReceive } from './operator-returns-receive';

describe('OperatorReturnsReceive', () => {
  let navigateCalls: unknown[][];

  beforeEach(async () => {
    navigateCalls = [];
    await TestBed.configureTestingModule({
      imports: [OperatorReturnsReceive],
      providers: [
        { provide: Router, useValue: { navigate: (...args: unknown[]) => navigateCalls.push(args) } },
      ],
    }).compileComponents();
  });

  it('shows the order lines for the given rma', () => {
    const fixture = TestBed.createComponent(OperatorReturnsReceive);
    fixture.componentRef.setInput('rma', 'RMA-0343');
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Wrapline BV');
    expect(text).toContain('Pallet wrap film');
  });

  it('confirming receipt calls the store, moves the order to the received stage, and navigates back to the entry list', () => {
    const store = TestBed.inject(ReturnsStore);
    const fixture = TestBed.createComponent(OperatorReturnsReceive);
    fixture.componentRef.setInput('rma', 'RMA-0343');
    fixture.detectChanges();

    (fixture.componentInstance as unknown as { confirm: () => void }).confirm();

    expect(store.returnOrders().find((o) => o.rma === 'RMA-0343')!.stage).toBe('received');
    expect(navigateCalls[0][0]).toEqual(['/operator/returns']);
  });

  it('surfaces the store error and does not navigate if the order is not awaiting receipt', () => {
    const fixture = TestBed.createComponent(OperatorReturnsReceive);
    fixture.componentRef.setInput('rma', 'RMA-0337'); // already received
    fixture.detectChanges();

    (fixture.componentInstance as unknown as { confirm: () => void }).confirm();
    fixture.detectChanges();

    const instance = fixture.componentInstance as unknown as { receiveError: () => string | null };
    expect(instance.receiveError()).toContain('not awaiting receipt');
    expect(navigateCalls.length).toBe(0);
  });

  it('hides the confirm button and shows an already-received message for an order not awaiting receipt', () => {
    const fixture = TestBed.createComponent(OperatorReturnsReceive);
    fixture.componentRef.setInput('rma', 'RMA-0337'); // already received
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    const buttons = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button'));
    expect(buttons.length).toBe(0);
    expect(text).toContain('already been received');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm nx test ikho-ui --include="**/operator-returns-receive.spec.ts"`
Expected: FAIL — `operator-returns-receive.ts` does not exist yet.

- [ ] **Step 3: Implement `OperatorReturnsReceive`**

```typescript
import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Button } from '@ikho/shared-ui';
import { LangService } from '../../../core/i18n/lang.service';
import { ReturnsStore } from '../../../core/state/returns-store';

@Component({
  selector: 'app-operator-returns-receive',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Button],
  host: { class: 'flex flex-col gap-6' },
  template: `
    @if (!order()) {
      <div class="p-6 font-core text-[15px] text-shade-40">{{ notFoundLabel() }}</div>
    } @else {
      <div class="flex flex-col gap-5">
        <div class="flex flex-col gap-1 rounded-lg bg-canvas-operator-elevated p-6">
          <span class="font-mono text-xs text-shade-40">{{ order()!.rma }}</span>
          <span class="font-core text-2xl font-bold text-on-primary">{{ order()!.partner }}</span>
          <span class="font-mono text-sm text-accent-teal">{{ order()!.sourceRef }}</span>
        </div>
        @for (line of order()!.lines; track line.sku) {
          <div class="flex flex-col gap-1 rounded-lg bg-canvas-operator-elevated p-5">
            <span class="font-core text-lg font-bold text-on-primary">{{ line.productName[lang.lang()] }}</span>
            <span class="font-mono text-sm text-accent-teal">{{ line.sku }} · {{ line.qty }} {{ unitsLabel() }}</span>
          </div>
        }
        @if (receiveError(); as err) {
          <span class="font-core text-sm text-status-out-of-stock">{{ err }}</span>
        }
        @if (order()!.stage !== 'created') {
          <span class="font-core text-sm text-shade-40">{{ alreadyReceivedLabel() }}</span>
        } @else {
          <lib-button variant="operator" [fullWidth]="true" (click)="confirm()">{{ confirmLabel() }}</lib-button>
        }
      </div>
    }
  `,
})
export class OperatorReturnsReceive {
  private readonly router = inject(Router);
  protected readonly lang = inject(LangService);
  private readonly store = inject(ReturnsStore);

  readonly rma = input.required<string>();

  protected readonly order = computed(() => this.store.returnOrders().find((o) => o.rma === this.rma()));
  protected readonly receiveError = signal<string | null>(null);

  protected readonly notFoundLabel = computed(() => (this.lang.lang() === 'en' ? 'Return order not found' : 'Không tìm thấy đơn trả hàng'));
  protected readonly unitsLabel = computed(() => (this.lang.lang() === 'en' ? 'units' : 'cái'));
  protected readonly confirmLabel = computed(() => (this.lang.lang() === 'en' ? 'Confirm receipt' : 'Xác nhận đã nhận'));
  protected readonly alreadyReceivedLabel = computed(() =>
    this.lang.lang() === 'en' ? 'This order has already been received' : 'Đơn hàng này đã được nhận',
  );

  protected confirm(): void {
    const result = this.store.receive(this.rma());
    if (!result.ok) {
      this.receiveError.set(result.error);
      return;
    }
    this.receiveError.set(null);
    this.router.navigate(['/operator/returns']);
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm nx test ikho-ui --include="**/operator-returns-receive.spec.ts"`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add source/apps/ikho-ui/src/app/features/operator/returns/operator-returns-receive.ts source/apps/ikho-ui/src/app/features/operator/returns/operator-returns-receive.spec.ts
git commit -m "feat(ikho-ui): add operator return-receipt confirmation screen"
```

---

## Task 10: `OperatorReturnsInspect` component

**Files:**
- Create: `source/apps/ikho-ui/src/app/features/operator/returns/operator-returns-inspect.ts`
- Test: `source/apps/ikho-ui/src/app/features/operator/returns/operator-returns-inspect.spec.ts`

**Interfaces:**
- Consumes: `ReturnsStore` (Task 5), `INSPECTION_RESULT_LABELS`/`InspectionResult`/`REASON_LABELS`/`ReturnReasonCode` (Task 1).
- Produces: `OperatorReturnsInspect` component, selector `app-operator-returns-inspect`, `readonly rma = input.required<string>()` bound from the `:rma` route param (Task 12).

- [ ] **Step 1: Write the failing test**

```typescript
import { Router } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { ReturnsStore } from '../../../core/state/returns-store';
import { OperatorReturnsInspect } from './operator-returns-inspect';

describe('OperatorReturnsInspect', () => {
  let navigateCalls: unknown[][];

  beforeEach(async () => {
    navigateCalls = [];
    await TestBed.configureTestingModule({
      imports: [OperatorReturnsInspect],
      providers: [
        { provide: Router, useValue: { navigate: (...args: unknown[]) => navigateCalls.push(args) } },
      ],
    }).compileComponents();
  });

  it('shows the order lines and return reason for the given rma', () => {
    const fixture = TestBed.createComponent(OperatorReturnsInspect);
    fixture.componentRef.setInput('rma', 'RMA-0337');
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Hafen Bremen GmbH');
    expect(text).toContain('Steel shelving bracket');
  });

  it('submitting a result calls the store, moves the order to the inspected stage, and navigates back', () => {
    const store = TestBed.inject(ReturnsStore);
    const fixture = TestBed.createComponent(OperatorReturnsInspect);
    fixture.componentRef.setInput('rma', 'RMA-0337');
    fixture.detectChanges();

    (fixture.componentInstance as unknown as { submit: (r: 'Good' | 'Damaged' | 'Defective') => void }).submit('Good');

    const order = store.returnOrders().find((o) => o.rma === 'RMA-0337')!;
    expect(order.stage).toBe('inspected');
    expect(order.inspectionResult).toBe('Good');
    expect(navigateCalls[0][0]).toEqual(['/operator/returns']);
  });

  it('surfaces the store error and does not navigate if the order is not awaiting inspection', () => {
    const fixture = TestBed.createComponent(OperatorReturnsInspect);
    fixture.componentRef.setInput('rma', 'RMA-0340'); // already inspected
    fixture.detectChanges();

    (fixture.componentInstance as unknown as { submit: (r: 'Good' | 'Damaged' | 'Defective') => void }).submit('Good');
    fixture.detectChanges();

    const instance = fixture.componentInstance as unknown as { inspectError: () => string | null };
    expect(instance.inspectError()).toContain('not awaiting inspection');
    expect(navigateCalls.length).toBe(0);
  });

  it('hides the result buttons and shows an already-inspected message for an order not awaiting inspection', () => {
    const fixture = TestBed.createComponent(OperatorReturnsInspect);
    fixture.componentRef.setInput('rma', 'RMA-0340'); // already inspected
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    const buttons = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button'));
    expect(buttons.length).toBe(0);
    expect(text).toContain('already been inspected');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm nx test ikho-ui --include="**/operator-returns-inspect.spec.ts"`
Expected: FAIL — `operator-returns-inspect.ts` does not exist yet.

- [ ] **Step 3: Implement `OperatorReturnsInspect`**

```typescript
import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Button } from '@ikho/shared-ui';
import { LangService } from '../../../core/i18n/lang.service';
import { INSPECTION_RESULT_LABELS, InspectionResult, REASON_LABELS, ReturnReasonCode } from '../../../core/mock-data/return-orders.data';
import { ReturnsStore } from '../../../core/state/returns-store';

@Component({
  selector: 'app-operator-returns-inspect',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Button],
  host: { class: 'flex flex-col gap-6' },
  template: `
    @if (!order()) {
      <div class="p-6 font-core text-[15px] text-shade-40">{{ notFoundLabel() }}</div>
    } @else {
      <div class="flex flex-col gap-5">
        <div class="flex flex-col gap-1 rounded-lg bg-canvas-operator-elevated p-6">
          <span class="font-mono text-xs text-shade-40">{{ order()!.rma }}</span>
          <span class="font-core text-2xl font-bold text-on-primary">{{ order()!.partner }}</span>
          <span class="font-mono text-sm text-accent-teal">{{ order()!.sourceRef }}</span>
        </div>
        @for (line of order()!.lines; track line.sku) {
          <div class="flex flex-col gap-1 rounded-lg bg-canvas-operator-elevated p-5">
            <span class="font-core text-lg font-bold text-on-primary">{{ line.productName[lang.lang()] }}</span>
            <span class="font-mono text-sm text-accent-teal">{{ line.sku }} · {{ line.qty }} {{ unitsLabel() }} · {{ reasonLabel(line.reasonCode) }}</span>
          </div>
        }
        @if (inspectError(); as err) {
          <span class="font-core text-sm text-status-out-of-stock">{{ err }}</span>
        }
        @if (order()!.stage !== 'received') {
          <span class="font-core text-sm text-shade-40">{{ alreadyInspectedLabel() }}</span>
        } @else {
          <div class="flex flex-col gap-3">
            <lib-button variant="operator" [fullWidth]="true" (click)="submit('Good')">{{ goodLabel() }}</lib-button>
            <lib-button variant="operator" [fullWidth]="true" (click)="submit('Damaged')">{{ damagedLabel() }}</lib-button>
            <lib-button variant="operator" [fullWidth]="true" (click)="submit('Defective')">{{ defectiveLabel() }}</lib-button>
          </div>
        }
      </div>
    }
  `,
})
export class OperatorReturnsInspect {
  private readonly router = inject(Router);
  protected readonly lang = inject(LangService);
  private readonly store = inject(ReturnsStore);

  readonly rma = input.required<string>();

  protected readonly order = computed(() => this.store.returnOrders().find((o) => o.rma === this.rma()));
  protected readonly inspectError = signal<string | null>(null);

  protected readonly notFoundLabel = computed(() => (this.lang.lang() === 'en' ? 'Return order not found' : 'Không tìm thấy đơn trả hàng'));
  protected readonly unitsLabel = computed(() => (this.lang.lang() === 'en' ? 'units' : 'cái'));
  protected readonly goodLabel = computed(() => INSPECTION_RESULT_LABELS.Good[this.lang.lang()]);
  protected readonly damagedLabel = computed(() => INSPECTION_RESULT_LABELS.Damaged[this.lang.lang()]);
  protected readonly defectiveLabel = computed(() => INSPECTION_RESULT_LABELS.Defective[this.lang.lang()]);
  protected readonly alreadyInspectedLabel = computed(() =>
    this.lang.lang() === 'en' ? 'This order has already been inspected' : 'Đơn hàng này đã được kiểm tra',
  );

  protected reasonLabel(code: ReturnReasonCode): string {
    return REASON_LABELS[code][this.lang.lang()];
  }

  protected submit(result: InspectionResult): void {
    const outcome = this.store.inspect(this.rma(), result);
    if (!outcome.ok) {
      this.inspectError.set(outcome.error);
      return;
    }
    this.inspectError.set(null);
    this.router.navigate(['/operator/returns']);
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm nx test ikho-ui --include="**/operator-returns-inspect.spec.ts"`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add source/apps/ikho-ui/src/app/features/operator/returns/operator-returns-inspect.ts source/apps/ikho-ui/src/app/features/operator/returns/operator-returns-inspect.spec.ts
git commit -m "feat(ikho-ui): add operator inspection confirmation screen"
```

---

## Task 11: `OperatorReturnsDisposition` component

**Files:**
- Create: `source/apps/ikho-ui/src/app/features/operator/returns/operator-returns-disposition.ts`
- Test: `source/apps/ikho-ui/src/app/features/operator/returns/operator-returns-disposition.spec.ts`

**Interfaces:**
- Consumes: `ReturnsStore`/`DISPOSITION_RULE` (Task 5), `DISPOSITION_OUTCOME_LABELS`/`DispositionOutcome`/`INSPECTION_RESULT_LABELS` (Task 1), `PRODUCTS` (existing).
- Produces: `OperatorReturnsDisposition` component, selector `app-operator-returns-disposition`, `readonly rma = input.required<string>()` bound from the `:rma` route param (Task 12).

- [ ] **Step 1: Write the failing test**

```typescript
import { Router } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { ReturnsStore } from '../../../core/state/returns-store';
import { OperatorReturnsDisposition } from './operator-returns-disposition';

describe('OperatorReturnsDisposition', () => {
  let navigateCalls: unknown[][];

  beforeEach(async () => {
    navigateCalls = [];
    await TestBed.configureTestingModule({
      imports: [OperatorReturnsDisposition],
      providers: [
        { provide: Router, useValue: { navigate: (...args: unknown[]) => navigateCalls.push(args) } },
      ],
    }).compileComponents();
  });

  it('shows the order lines and inspection result for the given rma', () => {
    const fixture = TestBed.createComponent(OperatorReturnsDisposition);
    fixture.componentRef.setInput('rma', 'RMA-0340');
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Meijer Retail Group');
    expect(text).toContain('Void fill paper');
    expect(text).toContain('Damaged');
  });

  it('shows only the outcome buttons allowed for the recorded inspection result', () => {
    const fixture = TestBed.createComponent(OperatorReturnsDisposition);
    fixture.componentRef.setInput('rma', 'RMA-0340'); // inspected as Damaged
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Quarantine');
    expect(text).toContain('Scrap');
    expect(text).toContain('Vendor return');
    expect(text).not.toContain('Restock');
  });

  it('submitting an allowed outcome calls the store, moves the order to the dispositioned stage, and navigates back', () => {
    const store = TestBed.inject(ReturnsStore);
    const fixture = TestBed.createComponent(OperatorReturnsDisposition);
    fixture.componentRef.setInput('rma', 'RMA-0340');
    fixture.detectChanges();

    (fixture.componentInstance as unknown as { submit: (o: 'Restock' | 'Quarantine' | 'Scrap' | 'VendorReturn') => void }).submit('Scrap');

    const order = store.returnOrders().find((o) => o.rma === 'RMA-0340')!;
    expect(order.stage).toBe('dispositioned');
    expect(order.dispositionOutcome).toBe('Scrap');
    expect(navigateCalls[0][0]).toEqual(['/operator/returns']);
  });

  it('surfaces the store error and does not navigate if the order is not awaiting disposition', () => {
    const fixture = TestBed.createComponent(OperatorReturnsDisposition);
    fixture.componentRef.setInput('rma', 'RMA-0331'); // already dispositioned
    fixture.detectChanges();

    (fixture.componentInstance as unknown as { submit: (o: 'Restock' | 'Quarantine' | 'Scrap' | 'VendorReturn') => void }).submit('Scrap');
    fixture.detectChanges();

    const instance = fixture.componentInstance as unknown as { dispositionError: () => string | null };
    expect(instance.dispositionError()).toContain('not awaiting disposition');
    expect(navigateCalls.length).toBe(0);
  });

  it('hides the outcome buttons and shows an already-dispositioned message for an order not awaiting disposition', () => {
    const fixture = TestBed.createComponent(OperatorReturnsDisposition);
    fixture.componentRef.setInput('rma', 'RMA-0331'); // already dispositioned
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    const buttons = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button'));
    expect(buttons.length).toBe(0);
    expect(text).toContain('already been dispositioned');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm nx test ikho-ui --include="**/operator-returns-disposition.spec.ts"`
Expected: FAIL — `operator-returns-disposition.ts` does not exist yet.

- [ ] **Step 3: Implement `OperatorReturnsDisposition`**

```typescript
import { ChangeDetectionStrategy, Component, computed, inject, input, linkedSignal, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Button, TextInput } from '@ikho/shared-ui';
import { LangService } from '../../../core/i18n/lang.service';
import { PRODUCTS } from '../../../core/mock-data/products.data';
import { DISPOSITION_OUTCOME_LABELS, DispositionOutcome, INSPECTION_RESULT_LABELS } from '../../../core/mock-data/return-orders.data';
import { DISPOSITION_RULE, ReturnsStore } from '../../../core/state/returns-store';

@Component({
  selector: 'app-operator-returns-disposition',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Button, TextInput],
  host: { class: 'flex flex-col gap-6' },
  template: `
    @if (!order()) {
      <div class="p-6 font-core text-[15px] text-shade-40">{{ notFoundLabel() }}</div>
    } @else {
      <div class="flex flex-col gap-5">
        <div class="flex flex-col gap-1 rounded-lg bg-canvas-operator-elevated p-6">
          <span class="font-mono text-xs text-shade-40">{{ order()!.rma }}</span>
          <span class="font-core text-2xl font-bold text-on-primary">{{ order()!.partner }}</span>
          <span class="font-mono text-sm text-accent-teal">{{ order()!.sourceRef }} · {{ resultLabel() }}</span>
        </div>
        @for (line of order()!.lines; track line.sku) {
          <div class="flex flex-col gap-1 rounded-lg bg-canvas-operator-elevated p-5">
            <span class="font-core text-lg font-bold text-on-primary">{{ line.productName[lang.lang()] }}</span>
            <span class="font-mono text-sm text-accent-teal">{{ line.sku }} · {{ line.qty }} {{ unitsLabel() }}</span>
          </div>
        }
        @if (dispositionError(); as err) {
          <span class="font-core text-sm text-status-out-of-stock">{{ err }}</span>
        }
        @if (order()!.stage !== 'inspected') {
          <span class="font-core text-sm text-shade-40">{{ alreadyDispositionedLabel() }}</span>
        } @else {
          @if (needsBin()) {
            <lib-text-input [label]="binLabel()" [value]="binInput()" (valueChange)="binInput.set($event)" />
          }
          <div class="flex flex-col gap-3">
            @for (outcome of allowedOutcomes(); track outcome) {
              <lib-button variant="operator" [fullWidth]="true" (click)="submit(outcome)">{{ outcomeLabel(outcome) }}</lib-button>
            }
          </div>
        }
      </div>
    }
  `,
})
export class OperatorReturnsDisposition {
  private readonly router = inject(Router);
  protected readonly lang = inject(LangService);
  private readonly store = inject(ReturnsStore);

  readonly rma = input.required<string>();

  protected readonly order = computed(() => this.store.returnOrders().find((o) => o.rma === this.rma()));
  protected readonly dispositionError = signal<string | null>(null);

  protected readonly allowedOutcomes = computed(() => {
    const result = this.order()?.inspectionResult;
    return result ? DISPOSITION_RULE[result] : [];
  });

  /**
   * Shown whenever any currently-offered outcome could need a bin (Restock or Quarantine).
   * Each outcome is a single tap with no intermediate "select outcome, then confirm" step, so
   * the bin has to be visible and fillable before that tap for outcomes that require it — a
   * value entered here is only actually used by the store when the tapped outcome needs one.
   */
  protected readonly needsBin = computed(() => this.allowedOutcomes().some((o) => o === 'Restock' || o === 'Quarantine'));
  protected readonly binInput = linkedSignal(() => {
    const sku = this.order()?.lines[0]?.sku;
    return sku ? (PRODUCTS.find((p) => p.sku === sku)?.bin ?? '') : '';
  });

  protected readonly notFoundLabel = computed(() => (this.lang.lang() === 'en' ? 'Return order not found' : 'Không tìm thấy đơn trả hàng'));
  protected readonly unitsLabel = computed(() => (this.lang.lang() === 'en' ? 'units' : 'cái'));
  protected readonly binLabel = computed(() => (this.lang.lang() === 'en' ? 'Disposition bin' : 'Ô kệ xử lý'));
  protected readonly resultLabel = computed(() => {
    const result = this.order()?.inspectionResult;
    return result ? INSPECTION_RESULT_LABELS[result][this.lang.lang()] : '';
  });
  protected readonly alreadyDispositionedLabel = computed(() =>
    this.lang.lang() === 'en' ? 'This order has already been dispositioned' : 'Đơn hàng này đã được xử lý',
  );

  protected outcomeLabel(outcome: DispositionOutcome): string {
    return DISPOSITION_OUTCOME_LABELS[outcome][this.lang.lang()];
  }

  protected submit(outcome: DispositionOutcome): void {
    const result = this.store.disposition(this.rma(), outcome, this.binInput());
    if (!result.ok) {
      this.dispositionError.set(result.error);
      return;
    }
    this.dispositionError.set(null);
    this.router.navigate(['/operator/returns']);
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm nx test ikho-ui --include="**/operator-returns-disposition.spec.ts"`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add source/apps/ikho-ui/src/app/features/operator/returns/operator-returns-disposition.ts source/apps/ikho-ui/src/app/features/operator/returns/operator-returns-disposition.spec.ts
git commit -m "feat(ikho-ui): add operator disposition confirmation screen with rule-gated outcomes"
```

---

## Task 12: Route Operator Mode's Returns to the new components

**Files:**
- Modify: `source/apps/ikho-ui/src/app/features/operator/operator.routes.ts`
- Modify: `source/apps/ikho-ui/src/app/features/operator/outlined-screen/operator-outlined-screen-route.ts`
- Modify: `source/apps/ikho-ui/src/app/app.routes.server.ts`

**Interfaces:**
- Consumes: `OperatorReturnsEntry` (Task 8), `OperatorReturnsReceive` (Task 9), `OperatorReturnsInspect` (Task 10), `OperatorReturnsDisposition` (Task 11).

- [ ] **Step 1: Update `operator.routes.ts`**

Replace `outlinedScreen('returns'),` with four route entries:

```typescript
  {
    path: 'returns',
    loadComponent: () => import('./returns/operator-returns-entry').then((m) => m.OperatorReturnsEntry),
  },
  {
    path: 'returns/receive/:rma',
    loadComponent: () => import('./returns/operator-returns-receive').then((m) => m.OperatorReturnsReceive),
  },
  {
    path: 'returns/inspect/:rma',
    loadComponent: () => import('./returns/operator-returns-inspect').then((m) => m.OperatorReturnsInspect),
  },
  {
    path: 'returns/disposition/:rma',
    loadComponent: () => import('./returns/operator-returns-disposition').then((m) => m.OperatorReturnsDisposition),
  },
```

- [ ] **Step 2: Update `OutlinedScreenId` in `operator-outlined-screen-route.ts`**

```typescript
type OutlinedScreenId = Exclude<ScreenId, 'dashboard' | 'catalogue' | 'inbound' | 'outbound' | 'returns'>;
```

- [ ] **Step 3: Update `app.routes.server.ts`**

Add three `RenderMode.Client` carve-outs for the new parameterized routes (same pattern as the existing `operator/inbound/putaway/:taskId` and `operator/outbound/dispatch/:soId` entries — these routes carry runtime-generated RMA ids from `ReturnsStore`, so there is no fixed param set to prerender against), and update the file's leading comment to mention `ReturnsStore` alongside `InboundStore`:

```typescript
import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  // These routes carry runtime-generated IDs (mock data created client-side via
  // InboundStore/OutboundStore/ReturnsStore), so there is no fixed param set to prerender
  // against — render them on the client instead.
  {
    path: 'operator/inbound/receive/:poId',
    renderMode: RenderMode.Client,
  },
  {
    path: 'operator/inbound/putaway/:taskId',
    renderMode: RenderMode.Client,
  },
  {
    path: 'operator/outbound/dispatch/:soId',
    renderMode: RenderMode.Client,
  },
  {
    path: 'operator/returns/receive/:rma',
    renderMode: RenderMode.Client,
  },
  {
    path: 'operator/returns/inspect/:rma',
    renderMode: RenderMode.Client,
  },
  {
    path: 'operator/returns/disposition/:rma',
    renderMode: RenderMode.Client,
  },
  {
    path: '**',
    renderMode: RenderMode.Prerender
  }
];
```

- [ ] **Step 4: Verify the app builds**

Run: `pnpm nx build ikho-ui`
Expected: clean build. Manually verify with `pnpm nx serve ikho-ui`: `/operator/returns` loads the three-section entry list, tapping a to-receive/to-inspect/to-disposition card navigates to the matching confirm screen, and the sidebar's Returns item stays highlighted on the nested confirm routes (same `segments[1]` mechanism already verified for Inbound/Outbound).

- [ ] **Step 5: Commit**

```bash
git add source/apps/ikho-ui/src/app/features/operator/operator.routes.ts source/apps/ikho-ui/src/app/features/operator/outlined-screen/operator-outlined-screen-route.ts source/apps/ikho-ui/src/app/app.routes.server.ts
git commit -m "feat(ikho-ui): route Operator Returns to the new entry/receive/inspect/disposition screens"
```

---

## Task 13: Wire `OperatorDashboard` to Returns' next-action queue

**Files:**
- Modify: `source/apps/ikho-ui/src/app/features/operator/dashboard/operator-dashboard.ts`
- Modify: `source/apps/ikho-ui/src/app/features/operator/dashboard/operator-dashboard.spec.ts` (already exists — gains three new tests; existing putaway/dispatch-ready tests are unaffected since `QueueCard`'s shape does not change in this task)

**Interfaces:**
- Consumes: `ReturnsStore.toReceive()`/`toInspect()`/`toDisposition()` (Task 5), `InboundStore.putawayTasks()` (existing, unchanged), `OutboundStore.dispatchReady()` (existing, unchanged), `STATIC_TASKS` (existing, unchanged).
- Produces: `OperatorDashboard`'s task queue now merges four sources (putaway, dispatch-ready, returns-next-action, static) — each return order not yet dispositioned contributes one card labeled with its next action, routing to the matching confirm screen.

- [ ] **Step 1: Add the new tests to `operator-dashboard.spec.ts`**

Add these three tests to the existing `describe('OperatorDashboard', ...)` block, and add the `ReturnsStore` import alongside the existing `InboundStore`/`OutboundStore` ones:

```typescript
import { ReturnsStore } from '../../../core/state/returns-store';
```

```typescript
  it('lists a return order needing receipt alongside putaway and dispatch-ready tasks', () => {
    const fixture = TestBed.createComponent(OperatorDashboard);
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('PUT-7741');
    expect(text).toContain('SO-88219');
    expect(text).toContain('RMA-0343');
  });

  it('reflects a return order moving to its next stage, updating its dashboard card', () => {
    const store = TestBed.inject(ReturnsStore);
    const fixture = TestBed.createComponent(OperatorDashboard);
    fixture.detectChanges();

    store.receive('RMA-0343');
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('RMA-0343');
  });

  it('navigates to the returns receive screen when a to-receive card is clicked', () => {
    const fixture = TestBed.createComponent(OperatorDashboard);
    fixture.detectChanges();

    (fixture.componentInstance as unknown as { onTaskClick: (t: { clickable: boolean; navTarget?: string[] }) => void }).onTaskClick({
      clickable: true,
      navTarget: ['/operator/returns/receive', 'RMA-0343'],
    });

    expect(navigateCalls[0][0]).toEqual(['/operator/returns/receive', 'RMA-0343']);
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm nx test ikho-ui --include="**/operator-dashboard.spec.ts"`
Expected: FAIL — the dashboard doesn't source from `ReturnsStore` yet, so `RMA-0343` never appears.

- [ ] **Step 3: Update `operator-dashboard.ts`**

Add the `ReturnsStore` import and injection, and merge in a fourth source inside the `tasks` computed:

```typescript
import { ReturnsStore } from '../../../core/state/returns-store';
```

```typescript
  private readonly returnsStore = inject(ReturnsStore);
```

Inside the `tasks` computed, after the `dispatchReady` block and before `staticTasks`, add:

```typescript
    const returnsNext: QueueCard[] = [
      ...this.returnsStore.toReceive().map((order) => ({ order, kind: lang === 'en' ? 'Receive' : 'Nhận hàng', path: '/operator/returns/receive' })),
      ...this.returnsStore.toInspect().map((order) => ({ order, kind: lang === 'en' ? 'Inspect' : 'Kiểm tra', path: '/operator/returns/inspect' })),
      ...this.returnsStore.toDisposition().map((order) => ({ order, kind: lang === 'en' ? 'Disposition' : 'Xử lý', path: '/operator/returns/disposition' })),
    ].map(({ order, kind, path }) => ({
      id: order.rma,
      status: order.status,
      icon: 'undo-2',
      kind,
      title: order.partner,
      route: `${order.sourceRef} · ${kind}`,
      qty: `${order.qty} ${lang === 'en' ? 'units' : 'cái'}`,
      clickable: true,
      navTarget: [path, order.rma],
    }));
```

And update the final return statement to include it:

```typescript
    return [...putaway, ...dispatchReady, ...returnsNext, ...staticTasks];
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm nx test ikho-ui --include="**/operator-dashboard.spec.ts"`
Expected: PASS — 9 tests total (3 putaway-related, 3 dispatch-ready-related, 3 returns-related, new).

- [ ] **Step 5: Commit**

```bash
git add source/apps/ikho-ui/src/app/features/operator/dashboard/operator-dashboard.ts source/apps/ikho-ui/src/app/features/operator/dashboard/operator-dashboard.spec.ts
git commit -m "feat(ikho-ui): source operator dashboard returns next-action queue from ReturnsStore"
```

---

## Final verification

- [ ] **Run the full test suite and build**

```bash
pnpm nx test ikho-ui
pnpm nx build ikho-ui
```

Expected: all tests pass (existing suite plus the new spec files from this plan), production build succeeds with no type errors, SSR prerendering clean (the three new `:rma` parameterized routes need the client-render carve-out from Task 12 — verify the build log shows no prerendering errors for them, the same check Outbound's plan called out for its own new parameterized route).

- [ ] **Manual smoke test**

Run: `pnpm nx serve ikho-ui`, then in the browser:
1. `/office/returns` — confirm the 3 tabs render (Return orders / Inspections / Dispositions), click the `RMA-0331` row to see its detail panel with inspection ("Damaged") and disposition ("Scrap") fields and no action button. Click "Log return", switch the type toggle to "Supplier return" (confirm the source-reference label changes to "Original PO"), submit a valid return with a well-stocked SKU and a reason code, then confirm the new row appears in the Return orders tab in `Open` status.
2. `/operator/returns` — confirm the three sections show the seeded orders correctly grouped (`RMA-0343` under "To receive", `RMA-0337` under "To inspect", `RMA-0340` under "To disposition"). Tap `RMA-0343`, confirm receipt, and verify it disappears from "To receive" and its status updates. Tap `RMA-0337` (now also reachable via "To inspect"), record a "Good" result, and verify it moves. Tap `RMA-0340` under "To disposition", confirm only Quarantine/Scrap/Vendor return are offered (not Restock, since it was inspected Damaged), pick "Scrap", and verify it moves to dispositioned and a new row appears in Office Console's Dispositions tab.
3. `/operator/dashboard` — confirm return orders needing action appear in the task queue alongside putaway tasks and dispatch-ready orders, labeled with their next action (Receive/Inspect/Disposition), and tapping one opens the matching confirm screen.

- [ ] **Update the rollout tracking table**

In `docs/plans/warehouse-ui-rollout-plan.md`, set Returns' "Design spec" and "Implementation plan" columns to link this file and its design spec, and update its status to "Implemented" once the above passes.
