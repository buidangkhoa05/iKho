# Inventory Office/Operator UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn `/office/inventory` into an actionable stock console (positions with receive/adjust, reservations with release) backed by a mock `InventoryStore`, and turn the Operator Mode inventory route into a real read-only stock lookup screen — replacing the static `OfficeScreen`+`ADMIN_SCREENS` placeholder and the `outlinedScreen('inventory')` stub respectively.

**Architecture:** `OfficeInventory` bypasses `OfficeScreen` (same as every prior module) and composes `lib-data-panel`/`lib-data-table`/`lib-kpi-card` directly. A 2-way section-toggle signal switches between Stock Positions and Reservations, each with its own table and detail panel; only Stock Positions has a create panel ("Receive stock"). `StockItemDetailPanel` and `ReservationDetailPanel` are both custom components (not the shared `OfficeDetailPanel`, which only supports one action). `OperatorInventory` mirrors `operator-catalogue.ts`'s read-only card-list pattern exactly, over the same `InventoryStore`.

**Tech Stack:** Angular 19 standalone components, Signals (no RxJS), Tailwind v4 utility classes, `vitest-angular`, `@ikho/shared-ui` (`DataPanel`, `DataTable`, `KpiCard`, `TextInput`, `Button`, `StatusBadge`, `Icon`). No `HttpClient` — plain in-memory signal store seeded from static mock data, reading `CatalogStore` (product master) and `OrganizationStore` (warehouse master) for cross-store lookups.

## Global Constraints

- **`@angular-eslint/no-output-native`**: no Angular `output()` may be named `close` — use `closePanel`.
- **`DataTable.rows` typing**: any row interface bound to `lib-data-table`'s `[rows]` must `extends Record<string, unknown>`.
- **`DataTable.emptyLabel`**: always bind `[emptyLabel]` to a bilingual `t()` key — never leave it to the component's hardcoded English default (`'No results'`).
- **Store owns validation, in the backend's exact order**, as documented in the design spec's Context section: `receiveStock` checks quantity/bin blank → product-not-found/inactive → lot-required (if lot-controlled) → serial-required/serial-count-mismatch/duplicate-serial (if serial-controlled, in that order) → applies the receipt; `adjustStock` checks blank reason code → stock item not found → would-go-negative; `releaseReservation` checks not-found → not-active. Components only translate outcome strings into bilingual error text, never duplicate the guard logic itself, beyond the same client-side blank/zero-check pattern established in every prior module.
- **Every mutation's outcome must be surfaced to the UI**, never discarded. Every `submit*`/`onToggle*` handler must branch on every non-`'ok'` outcome and call the relevant `setXError` method on the child panel via a `viewChild` reference.
- **`effect()` reset pattern**: any detail panel with local mutable form state must reset ALL of it (visibility flags AND typed field values) via a constructor `effect()` keyed on the relevant input signal — not just on selection change, but implicitly on every successful save too, since the store's immutable updates give the input a new object identity on every mutation.
- **Cancel handlers must clear stale state.** Every "Cancel" button must reset the same fields a successful save resets, not just close the form.
- **Switching sections must reset every open form and selection.** The 2-way section toggle must clear the create-panel form and both detail-panel selections when the active section changes — the exact lesson from Billing's final review (finding F4), now a binding rule from the start rather than a fix-round discovery.
- **ID generation**: this module is the first mock store whose primary records (`StockItem`, `StockLedgerEntry`, `StockReservation`) have no natural caller-supplied business key. Follow `billing-store.ts`'s existing convention exactly: a module-level `let xSeq = <n>;` counter per prefix, incremented at each use (e.g. `` `SI-${stockItemSeq++}` ``), seeded to continue after the last seed id.
- **Status labels for `StockStatus` values reuse `resolveStatusLabel` from `core/i18n/status-label.util.ts`** (already bilingual) rather than hand-rolling new translations for `'in-stock'`/`'low-stock'`/`'out-of-stock'` — this module is the first to have a data field that is a real `StockStatus`, so lean on the existing utility instead of duplicating its strings.
- **No `Fulfill` action, no manual reservation creation, no quarantine-receive, no Lot/SerialNumber directory screens, no Bin validation against a directory (bin stays free text), no delete, no pagination, no modal/dialog** anywhere in this module — see the design spec's Non-goals section.
- **No changes to `products.data.ts`, `operator-catalogue.ts`, `inbound-store.ts`, `outbound-store.ts`, `INVENTORY_POSITIONS`/`reporting-store.ts`, or any other already-reviewed code.** Inventory is additive, referencing `CatalogStore` and `OrganizationStore` fresh.
- **No forward-references across tasks.** A task's template must never reference a signal/method a *later* task defines — if the header's primary action needs to branch on section state a later task adds, that later task modifies the header itself rather than the earlier task pre-declaring an empty hook for it.

---

### Task 1: Inventory data model & `InventoryStore`

**Files:**
- Create: `source/apps/ikho-ui/src/app/core/mock-data/inventory.data.ts`
- Create: `source/apps/ikho-ui/src/app/core/state/inventory-store.ts`
- Test: `source/apps/ikho-ui/src/app/core/state/inventory-store.spec.ts`

**Interfaces:**
- Consumes: `CatalogStore` (existing, `source/apps/ikho-ui/src/app/core/state/catalogue-store.ts`) — reads `.products()` for `sku`/`isActive`/`isLotControlled`/`isSerialControlled`.
- Produces: types `Lot`, `SerialNumber`, `MovementType`, `StockLedgerEntry`, `StockItem`, `ReservationStatus`, `StockReservation` (`inventory.data.ts`); `InventoryStore` (`providedIn: 'root'`) exposing `stockItems`/`ledger`/`reservations` readonly signals plus `receiveStock`/`adjustStock`/`releaseReservation` and their input/outcome types. All of Tasks 2–6 depend on these exact names and shapes.

- [ ] **Step 1: Write `inventory.data.ts`**

```ts
// source/apps/ikho-ui/src/app/core/mock-data/inventory.data.ts
export interface Lot {
  lotNumber: string;
  expirationDateUtc?: string;
}

export interface SerialNumber {
  serialValue: string;
  status: 'in-stock' | 'reserved' | 'shipped' | 'damaged';
}

export type MovementType = 'receipt' | 'adjustment' | 'reservation' | 'release' | 'shipment' | 'quarantine-receipt';

export interface StockLedgerEntry {
  id: string;
  stockItemId: string;
  movementType: MovementType;
  quantityDelta: number;
  reasonCode?: string;
  referenceType?: string;
  referenceId?: string;
  occurredOnUtc: string;
}

export interface StockItem {
  id: string;
  sku: string;
  warehouseCode: string;
  bin: string;
  lot?: Lot;
  serial?: SerialNumber;
  onHand: number;
  reserved: number;
  damaged: number;
  quarantine: number;
  status: 'in-stock' | 'low-stock' | 'out-of-stock';
  createdOnUtc: string;
  updatedOnUtc: string;
}

export type ReservationStatus = 'active' | 'released' | 'fulfilled';

export interface StockReservation {
  id: string;
  stockItemId: string;
  sku: string;
  warehouseCode: string;
  quantity: number;
  status: ReservationStatus;
  referenceType?: string;
  referenceId?: string;
  createdOnUtc: string;
  releasedOnUtc?: string;
}

// Reshaped from INVENTORY_POSITIONS (left untouched — still used by reporting-store.ts) for
// continuity, remapped to real OrganizationStore warehouse codes and bins carried over from
// PUTAWAY_TASKS where the sku matches. Two extra rows (IKH-201884, serial-controlled) are added
// to exercise per-unit serial tracking, matching Catalogue's seeded isSerialControlled products.
export const STOCK_ITEMS: StockItem[] = [
  {
    id: 'SI-1', sku: 'IKH-482910', warehouseCode: 'WH-1', bin: 'A-12-04',
    onHand: 240, reserved: 40, damaged: 0, quarantine: 0, status: 'in-stock',
    createdOnUtc: '2024-02-10T09:00:00Z', updatedOnUtc: '2024-02-10T09:00:00Z',
  },
  {
    id: 'SI-2', sku: 'IKH-330298', warehouseCode: 'WH-1', bin: 'A-04-09',
    lot: { lotNumber: 'LOT-2026-0392', expirationDateUtc: '2027-03-02T00:00:00Z' },
    onHand: 60, reserved: 12, damaged: 0, quarantine: 0, status: 'low-stock',
    createdOnUtc: '2024-02-15T09:00:00Z', updatedOnUtc: '2024-02-15T09:00:00Z',
  },
  {
    // Seeded out-of-stock — gives the status badge and adjustStock's would-go-negative guard
    // something real to exercise. Its ledger (below) records the receipt-then-shrinkage history
    // that explains why it's at zero.
    id: 'SI-3', sku: 'IKH-770145', warehouseCode: 'WH-1', bin: 'B-02-01',
    onHand: 0, reserved: 0, damaged: 0, quarantine: 0, status: 'out-of-stock',
    createdOnUtc: '2024-03-01T09:00:00Z', updatedOnUtc: '2024-07-10T09:00:00Z',
  },
  {
    id: 'SI-4', sku: 'IKH-105522', warehouseCode: 'WH-3', bin: 'C-01-02',
    onHand: 1840, reserved: 300, damaged: 4, quarantine: 20, status: 'in-stock',
    createdOnUtc: '2024-03-10T09:00:00Z', updatedOnUtc: '2024-03-10T09:00:00Z',
  },
  {
    id: 'SI-5', sku: 'IKH-664120', warehouseCode: 'WH-1', bin: 'A-04-02',
    lot: { lotNumber: 'LOT-2026-0401', expirationDateUtc: '2026-12-01T00:00:00Z' },
    onHand: 18, reserved: 6, damaged: 0, quarantine: 6, status: 'low-stock',
    createdOnUtc: '2024-03-20T09:00:00Z', updatedOnUtc: '2024-03-20T09:00:00Z',
  },
  {
    id: 'SI-6', sku: 'IKH-318440', warehouseCode: 'WH-3', bin: 'A-11-06',
    lot: { lotNumber: 'LOT-2026-0410', expirationDateUtc: '2027-01-15T00:00:00Z' },
    onHand: 34, reserved: 10, damaged: 0, quarantine: 0, status: 'low-stock',
    createdOnUtc: '2024-04-05T09:00:00Z', updatedOnUtc: '2024-04-05T09:00:00Z',
  },
  {
    // One stock item per serial unit, matching the backend's own modeling.
    id: 'SI-7', sku: 'IKH-201884', warehouseCode: 'WH-1', bin: 'D-01-01',
    serial: { serialValue: 'SN-VDB-0001', status: 'in-stock' },
    onHand: 1, reserved: 0, damaged: 0, quarantine: 0, status: 'in-stock',
    createdOnUtc: '2024-05-01T09:00:00Z', updatedOnUtc: '2024-05-01T09:00:00Z',
  },
  {
    // Backs the seeded active StockReservation (RES-1) below.
    id: 'SI-8', sku: 'IKH-201884', warehouseCode: 'WH-1', bin: 'D-01-01',
    serial: { serialValue: 'SN-VDB-0002', status: 'reserved' },
    onHand: 1, reserved: 1, damaged: 0, quarantine: 0, status: 'in-stock',
    createdOnUtc: '2024-05-01T09:00:00Z', updatedOnUtc: '2024-08-01T09:00:00Z',
  },
];

export const STOCK_LEDGER: StockLedgerEntry[] = [
  { id: 'LED-1', stockItemId: 'SI-1', movementType: 'receipt', quantityDelta: 240, occurredOnUtc: '2024-02-10T09:00:00Z' },
  { id: 'LED-2', stockItemId: 'SI-2', movementType: 'receipt', quantityDelta: 60, occurredOnUtc: '2024-02-15T09:00:00Z' },
  { id: 'LED-3', stockItemId: 'SI-3', movementType: 'receipt', quantityDelta: 50, occurredOnUtc: '2024-03-01T09:00:00Z' },
  { id: 'LED-4', stockItemId: 'SI-4', movementType: 'receipt', quantityDelta: 1840, occurredOnUtc: '2024-03-10T09:00:00Z' },
  { id: 'LED-5', stockItemId: 'SI-5', movementType: 'receipt', quantityDelta: 18, occurredOnUtc: '2024-03-20T09:00:00Z' },
  { id: 'LED-6', stockItemId: 'SI-6', movementType: 'receipt', quantityDelta: 34, occurredOnUtc: '2024-04-05T09:00:00Z' },
  { id: 'LED-7', stockItemId: 'SI-7', movementType: 'receipt', quantityDelta: 1, occurredOnUtc: '2024-05-01T09:00:00Z' },
  { id: 'LED-8', stockItemId: 'SI-8', movementType: 'receipt', quantityDelta: 1, occurredOnUtc: '2024-05-01T09:00:00Z' },
  { id: 'LED-9', stockItemId: 'SI-3', movementType: 'adjustment', quantityDelta: -50, reasonCode: 'SHRINKAGE', occurredOnUtc: '2024-07-10T09:00:00Z' },
];

export const STOCK_RESERVATIONS: StockReservation[] = [
  {
    id: 'RES-1', stockItemId: 'SI-8', sku: 'IKH-201884', warehouseCode: 'WH-1', quantity: 1, status: 'active',
    referenceType: 'SalesOrder', referenceId: 'SO-3301', createdOnUtc: '2024-08-01T09:00:00Z',
  },
  {
    id: 'RES-2', stockItemId: 'SI-2', sku: 'IKH-330298', warehouseCode: 'WH-1', quantity: 5, status: 'released',
    referenceType: 'SalesOrder', referenceId: 'SO-3288', createdOnUtc: '2024-07-20T09:00:00Z', releasedOnUtc: '2024-07-25T09:00:00Z',
  },
];
```

- [ ] **Step 2: Write `inventory-store.ts`**

```ts
// source/apps/ikho-ui/src/app/core/state/inventory-store.ts
import { Injectable, inject, signal } from '@angular/core';
import {
  STOCK_ITEMS, STOCK_LEDGER, STOCK_RESERVATIONS,
  StockItem, StockLedgerEntry, StockReservation,
} from '../mock-data/inventory.data';
import { CatalogStore } from './catalogue-store';

export type ReceiveStockOutcome =
  | 'ok' | 'invalid' | 'product-not-found' | 'lot-required' | 'serial-required' | 'serial-count-mismatch' | 'duplicate-serial';
export type AdjustStockOutcome = 'ok' | 'invalid' | 'not-found' | 'would-go-negative';
export type ReleaseReservationOutcome = 'ok' | 'not-found' | 'not-active';

export interface ReceiveStockInput {
  sku: string;
  warehouseCode: string;
  bin: string;
  quantity: number;
  lotNumber?: string;
  expirationDateUtc?: string;
  serialNumbers?: string[];
}

export interface AdjustStockInput {
  quantityDelta: number;
  reasonCode: string;
  notes: string;
}

let stockItemSeq = 9;
let ledgerSeq = 10;

@Injectable({ providedIn: 'root' })
export class InventoryStore {
  private readonly catalog = inject(CatalogStore);

  readonly stockItems = signal<StockItem[]>([...STOCK_ITEMS]);
  readonly ledger = signal<StockLedgerEntry[]>([...STOCK_LEDGER]);
  readonly reservations = signal<StockReservation[]>([...STOCK_RESERVATIONS]);

  receiveStock(input: ReceiveStockInput): ReceiveStockOutcome {
    const sku = input.sku.trim();
    const bin = input.bin.trim();
    if (!sku || !bin || input.quantity <= 0) return 'invalid';

    const product = this.catalog.products().find((p) => p.sku === sku);
    if (!product || !product.isActive) return 'product-not-found';

    if (product.isLotControlled && !input.lotNumber?.trim()) return 'lot-required';

    if (product.isSerialControlled) {
      const serials = input.serialNumbers ?? [];
      if (serials.length === 0) return 'serial-required';
      if (serials.length !== input.quantity) return 'serial-count-mismatch';
      const normalized = serials.map((s) => s.trim().toLowerCase());
      if (new Set(normalized).size !== normalized.length) return 'duplicate-serial';

      const now = new Date().toISOString();
      const newItems: StockItem[] = serials.map((serialValue) => ({
        id: `SI-${stockItemSeq++}`,
        sku,
        warehouseCode: input.warehouseCode,
        bin,
        serial: { serialValue: serialValue.trim(), status: 'in-stock' },
        onHand: 1,
        reserved: 0,
        damaged: 0,
        quarantine: 0,
        status: 'in-stock',
        createdOnUtc: now,
        updatedOnUtc: now,
      }));
      this.stockItems.update((list) => [...newItems, ...list]);
      this.ledger.update((list) => [
        ...newItems.map((item) => ({
          id: `LED-${ledgerSeq++}`,
          stockItemId: item.id,
          movementType: 'receipt' as const,
          quantityDelta: 1,
          occurredOnUtc: now,
        })),
        ...list,
      ]);
      return 'ok';
    }

    const now = new Date().toISOString();
    const lot = product.isLotControlled ? { lotNumber: input.lotNumber!.trim(), expirationDateUtc: input.expirationDateUtc } : undefined;
    const existing = this.stockItems().find(
      (item) => item.sku === sku && item.warehouseCode === input.warehouseCode && item.bin === bin && item.lot?.lotNumber === lot?.lotNumber,
    );

    let affectedId: string;
    if (existing) {
      affectedId = existing.id;
      this.stockItems.update((list) =>
        list.map((item) => (item.id === existing.id ? { ...item, onHand: item.onHand + input.quantity, updatedOnUtc: now } : item)),
      );
    } else {
      affectedId = `SI-${stockItemSeq++}`;
      const created: StockItem = {
        id: affectedId,
        sku,
        warehouseCode: input.warehouseCode,
        bin,
        lot,
        onHand: input.quantity,
        reserved: 0,
        damaged: 0,
        quarantine: 0,
        status: 'in-stock',
        createdOnUtc: now,
        updatedOnUtc: now,
      };
      this.stockItems.update((list) => [created, ...list]);
    }

    this.ledger.update((list) => [
      { id: `LED-${ledgerSeq++}`, stockItemId: affectedId, movementType: 'receipt', quantityDelta: input.quantity, occurredOnUtc: now },
      ...list,
    ]);
    return 'ok';
  }

  adjustStock(stockItemId: string, input: AdjustStockInput): AdjustStockOutcome {
    const reasonCode = input.reasonCode.trim();
    if (!reasonCode) return 'invalid';

    const stockItem = this.stockItems().find((s) => s.id === stockItemId);
    if (!stockItem) return 'not-found';

    const newOnHand = stockItem.onHand + input.quantityDelta;
    if (newOnHand < 0) return 'would-go-negative';

    const now = new Date().toISOString();
    this.stockItems.update((list) => list.map((s) => (s.id === stockItemId ? { ...s, onHand: newOnHand, updatedOnUtc: now } : s)));
    this.ledger.update((list) => [
      { id: `LED-${ledgerSeq++}`, stockItemId, movementType: 'adjustment', quantityDelta: input.quantityDelta, reasonCode, occurredOnUtc: now },
      ...list,
    ]);
    return 'ok';
  }

  releaseReservation(id: string): ReleaseReservationOutcome {
    const reservation = this.reservations().find((r) => r.id === id);
    if (!reservation) return 'not-found';
    if (reservation.status !== 'active') return 'not-active';

    const now = new Date().toISOString();
    this.stockItems.update((list) =>
      list.map((s) => (s.id === reservation.stockItemId ? { ...s, reserved: s.reserved - reservation.quantity, updatedOnUtc: now } : s)),
    );
    this.reservations.update((list) => list.map((r) => (r.id === id ? { ...r, status: 'released' as const, releasedOnUtc: now } : r)));
    this.ledger.update((list) => [
      {
        id: `LED-${ledgerSeq++}`,
        stockItemId: reservation.stockItemId,
        movementType: 'release',
        quantityDelta: 0,
        referenceType: reservation.referenceType,
        referenceId: reservation.referenceId,
        occurredOnUtc: now,
      },
      ...list,
    ]);
    return 'ok';
  }
}
```

- [ ] **Step 3: Write `inventory-store.spec.ts`**

```ts
// source/apps/ikho-ui/src/app/core/state/inventory-store.spec.ts
import { TestBed } from '@angular/core/testing';
import { InventoryStore } from './inventory-store';

describe('InventoryStore', () => {
  let store: InventoryStore;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    store = TestBed.inject(InventoryStore);
  });

  it('seeds 8 stock items, 9 ledger entries, and 2 reservations', () => {
    expect(store.stockItems().length).toBe(8);
    expect(store.ledger().length).toBe(9);
    expect(store.reservations().length).toBe(2);
  });

  it('seeds IKH-201884 as two stock items, one per serial unit', () => {
    const items = store.stockItems().filter((s) => s.sku === 'IKH-201884');
    expect(items.length).toBe(2);
    expect(items.map((i) => i.serial?.serialValue).sort()).toEqual(['SN-VDB-0001', 'SN-VDB-0002']);
  });

  describe('receiveStock', () => {
    const valid = { sku: 'IKH-770145', warehouseCode: 'WH-1', bin: 'B-02-01', quantity: 10 };

    it('rejects a blank sku, blank bin, or non-positive quantity as invalid', () => {
      expect(store.receiveStock({ ...valid, sku: '' })).toBe('invalid');
      expect(store.receiveStock({ ...valid, bin: '  ' })).toBe('invalid');
      expect(store.receiveStock({ ...valid, quantity: 0 })).toBe('invalid');
    });

    it('rejects an unknown or inactive product as product-not-found', () => {
      expect(store.receiveStock({ ...valid, sku: 'NOPE' })).toBe('product-not-found');
      expect(store.receiveStock({ ...valid, sku: 'IKH-447203' })).toBe('product-not-found'); // seeded inactive in Catalogue
    });

    it('rejects a lot-controlled product with a blank lot number', () => {
      expect(store.receiveStock({ ...valid, sku: 'IKH-330298' })).toBe('lot-required');
    });

    it('rejects a serial-controlled product with no serial numbers', () => {
      expect(store.receiveStock({ ...valid, sku: 'IKH-201884' })).toBe('serial-required');
    });

    it('rejects a serial-controlled product whose serial count does not match quantity', () => {
      expect(store.receiveStock({ ...valid, sku: 'IKH-201884', quantity: 2, serialNumbers: ['SN-NEW-01'] })).toBe('serial-count-mismatch');
    });

    it('rejects duplicate serial numbers within the same request (case-insensitive)', () => {
      expect(
        store.receiveStock({ ...valid, sku: 'IKH-201884', quantity: 2, serialNumbers: ['SN-NEW-01', 'sn-new-01'] }),
      ).toBe('duplicate-serial');
    });

    it('increments an existing untracked stock item in place rather than creating a new row', () => {
      const before = store.stockItems().length;
      const outcome = store.receiveStock(valid); // matches SI-3's sku/warehouse/bin, no lot
      expect(outcome).toBe('ok');
      expect(store.stockItems().length).toBe(before);
      const updated = store.stockItems().find((s) => s.id === 'SI-3');
      expect(updated?.onHand).toBe(10);
    });

    it('creates a new stock item for a lot-controlled product with a lot number', () => {
      const before = store.stockItems().length;
      const outcome = store.receiveStock({
        sku: 'IKH-330298', warehouseCode: 'WH-1', bin: 'A-04-09', quantity: 20, lotNumber: 'LOT-2026-9999',
      });
      expect(outcome).toBe('ok');
      expect(store.stockItems().length).toBe(before + 1);
      const created = store.stockItems()[0];
      expect(created).toMatchObject({ sku: 'IKH-330298', onHand: 20, lot: { lotNumber: 'LOT-2026-9999' } });
    });

    it('creates one stock item per serial value for a serial-controlled product', () => {
      const before = store.stockItems().length;
      const outcome = store.receiveStock({
        sku: 'IKH-902316', warehouseCode: 'WH-1', bin: 'D-02-01', quantity: 2, serialNumbers: ['SN-SCT-01', 'SN-SCT-02'],
      });
      expect(outcome).toBe('ok');
      expect(store.stockItems().length).toBe(before + 2);
      const created = store.stockItems().slice(0, 2);
      expect(created.every((s) => s.onHand === 1 && s.sku === 'IKH-902316')).toBe(true);
      expect(created.map((s) => s.serial?.serialValue).sort()).toEqual(['SN-SCT-01', 'SN-SCT-02']);
    });

    it('appends one receipt ledger entry per affected stock item', () => {
      const before = store.ledger().length;
      store.receiveStock({ sku: 'IKH-902316', warehouseCode: 'WH-1', bin: 'D-02-01', quantity: 2, serialNumbers: ['SN-SCT-03', 'SN-SCT-04'] });
      expect(store.ledger().length).toBe(before + 2);
      expect(store.ledger().slice(0, 2).every((e) => e.movementType === 'receipt' && e.quantityDelta === 1)).toBe(true);
    });
  });

  describe('adjustStock', () => {
    it('rejects a blank reason code as invalid', () => {
      expect(store.adjustStock('SI-1', { quantityDelta: 5, reasonCode: ' ', notes: '' })).toBe('invalid');
    });

    it('rejects an unknown stock item id', () => {
      expect(store.adjustStock('NOPE', { quantityDelta: 5, reasonCode: 'FOUND', notes: '' })).toBe('not-found');
    });

    it('rejects a delta that would drive on-hand negative', () => {
      expect(store.adjustStock('SI-3', { quantityDelta: -1, reasonCode: 'DAMAGE', notes: '' })).toBe('would-go-negative'); // SI-3 is already at 0
    });

    it('applies a positive delta and appends an adjustment ledger entry with the reason code', () => {
      const outcome = store.adjustStock('SI-1', { quantityDelta: 10, reasonCode: 'FOUND', notes: 'Found on a mis-shelved pallet.' });
      expect(outcome).toBe('ok');
      expect(store.stockItems().find((s) => s.id === 'SI-1')?.onHand).toBe(250);
      const entry = store.ledger()[0];
      expect(entry).toMatchObject({ stockItemId: 'SI-1', movementType: 'adjustment', quantityDelta: 10, reasonCode: 'FOUND' });
    });

    it('applies a negative delta down to exactly zero', () => {
      const outcome = store.adjustStock('SI-3', { quantityDelta: 0, reasonCode: 'CYCLE_COUNT', notes: '' });
      expect(outcome).toBe('ok');
      expect(store.stockItems().find((s) => s.id === 'SI-3')?.onHand).toBe(0);
    });
  });

  describe('releaseReservation', () => {
    it('rejects an unknown reservation id', () => {
      expect(store.releaseReservation('NOPE')).toBe('not-found');
    });

    it('rejects a reservation that is not active', () => {
      expect(store.releaseReservation('RES-2')).toBe('not-active'); // seeded already-released
    });

    it('releases an active reservation, decrements the stock item reserved quantity, and appends a zero-delta release ledger entry', () => {
      const outcome = store.releaseReservation('RES-1');
      expect(outcome).toBe('ok');
      expect(store.reservations().find((r) => r.id === 'RES-1')?.status).toBe('released');
      expect(store.stockItems().find((s) => s.id === 'SI-8')?.reserved).toBe(0);
      const entry = store.ledger()[0];
      expect(entry).toMatchObject({ stockItemId: 'SI-8', movementType: 'release', quantityDelta: 0, referenceType: 'SalesOrder', referenceId: 'SO-3301' });
    });
  });
});
```

- [ ] **Step 4: Run the store tests**

Run: `pnpm nx test ikho-ui --skip-nx-cache --include='**/inventory-store.spec.ts'` (from `source/`)
Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add source/apps/ikho-ui/src/app/core/mock-data/inventory.data.ts source/apps/ikho-ui/src/app/core/state/inventory-store.ts source/apps/ikho-ui/src/app/core/state/inventory-store.spec.ts
git commit -m "feat(ikho-ui): add Inventory data model and InventoryStore"
```

---

### Task 2: `StockItemDetailPanel` — quantity breakdown, Adjust form, ledger list

**Files:**
- Create: `source/apps/ikho-ui/src/app/features/office/inventory/stock-item-detail-panel.ts`
- Test: `source/apps/ikho-ui/src/app/features/office/inventory/stock-item-detail-panel.spec.ts`

**Interfaces:**
- Consumes: `StockItem`, `StockLedgerEntry` (Task 1), `LangService`/`resolveStatusLabel` (existing).
- Produces: `StockItemDetailPanel` (selector `app-stock-item-detail-panel`) with `stockItem = input.required<StockItem>()`, `productName = input.required<string>()`, `warehouseName = input.required<string>()`, `ledgerEntries = input.required<StockLedgerEntry[]>()` (pre-filtered/sorted newest-first by the parent), outputs `closePanel: output<void>()`, `saveAdjustment: output<{quantityDelta: number; reasonCode: string; notes: string}>()`, and public method `setAdjustError(message: string): void`. Task 4 mounts this component and wires it into `OfficeInventory`.

- [ ] **Step 1: Write the failing spec**

```ts
// source/apps/ikho-ui/src/app/features/office/inventory/stock-item-detail-panel.spec.ts
import { TestBed } from '@angular/core/testing';
import { StockItem, StockLedgerEntry } from '../../../core/mock-data/inventory.data';
import { StockItemDetailPanel } from './stock-item-detail-panel';

const LOT_ITEM: StockItem = {
  id: 'SI-2', sku: 'IKH-330298', warehouseCode: 'WH-1', bin: 'A-04-09',
  lot: { lotNumber: 'LOT-2026-0392', expirationDateUtc: '2027-03-02T00:00:00Z' },
  onHand: 60, reserved: 12, damaged: 0, quarantine: 0, status: 'low-stock',
  createdOnUtc: '2024-02-15T09:00:00Z', updatedOnUtc: '2024-02-15T09:00:00Z',
};

const SERIAL_ITEM: StockItem = {
  id: 'SI-7', sku: 'IKH-201884', warehouseCode: 'WH-1', bin: 'D-01-01',
  serial: { serialValue: 'SN-VDB-0001', status: 'in-stock' },
  onHand: 1, reserved: 0, damaged: 0, quarantine: 0, status: 'in-stock',
  createdOnUtc: '2024-05-01T09:00:00Z', updatedOnUtc: '2024-05-01T09:00:00Z',
};

const LEDGER: StockLedgerEntry[] = [
  { id: 'LED-2', stockItemId: 'SI-2', movementType: 'receipt', quantityDelta: 60, occurredOnUtc: '2024-02-15T09:00:00Z' },
];

describe('StockItemDetailPanel', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [StockItemDetailPanel] }).compileComponents();
  });

  function create(stockItem: StockItem = LOT_ITEM, ledgerEntries: StockLedgerEntry[] = LEDGER) {
    const fixture = TestBed.createComponent(StockItemDetailPanel);
    fixture.componentRef.setInput('stockItem', stockItem);
    fixture.componentRef.setInput('productName', 'Barcode label roll, 100×50mm');
    fixture.componentRef.setInput('warehouseName', 'Rotterdam DC');
    fixture.componentRef.setInput('ledgerEntries', ledgerEntries);
    fixture.detectChanges();
    return fixture;
  }

  it('renders sku, product/warehouse name, bin, lot, quantity breakdown, and ledger history', () => {
    const fixture = create();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('IKH-330298');
    expect(text).toContain('Barcode label roll, 100×50mm');
    expect(text).toContain('Rotterdam DC');
    expect(text).toContain('A-04-09');
    expect(text).toContain('LOT-2026-0392');
    expect(text).toContain('60'); // on hand
    expect(text).toContain('12'); // reserved
    expect(text).toContain('48'); // available = 60 - 12 - 0 - 0
  });

  it('renders the serial value instead of a lot for a serial-controlled stock item', () => {
    const fixture = create(SERIAL_ITEM, []);
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('SN-VDB-0001');
  });

  it('closePanel emits when the close button is clicked', () => {
    const fixture = create();
    let emitted = false;
    fixture.componentInstance.closePanel.subscribe(() => (emitted = true));
    (fixture.nativeElement as HTMLElement).querySelector('button[aria-label]')?.dispatchEvent(new Event('click', { bubbles: true }));
    expect(emitted).toBe(true);
  });

  it('rejects an adjust submission with a blank reason code, a zero delta, or a delta that would go negative', () => {
    const fixture = create();
    const instance = fixture.componentInstance as unknown as {
      startAdjust: () => void;
      adjustDelta: { set: (v: string) => void };
      adjustReasonCode: { set: (v: string) => void };
      submitAdjustment: () => void;
    };
    let payload: unknown;
    fixture.componentInstance.saveAdjustment.subscribe((v) => (payload = v));

    instance.startAdjust();
    instance.adjustDelta.set('5');
    instance.adjustReasonCode.set('');
    instance.submitAdjustment();
    expect(payload).toBeUndefined();

    instance.adjustReasonCode.set('CYCLE_COUNT');
    instance.adjustDelta.set('0');
    instance.submitAdjustment();
    expect(payload).toBeUndefined();

    instance.adjustDelta.set('-100'); // LOT_ITEM.onHand is 60
    instance.submitAdjustment();
    expect(payload).toBeUndefined();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('would leave on-hand quantity negative');
  });

  it('emits the parsed payload on a valid adjust submission', () => {
    const fixture = create();
    const instance = fixture.componentInstance as unknown as {
      startAdjust: () => void;
      adjustDelta: { set: (v: string) => void };
      adjustReasonCode: { set: (v: string) => void };
      adjustNotes: { set: (v: string) => void };
      submitAdjustment: () => void;
    };
    let payload: { quantityDelta: number; reasonCode: string; notes: string } | undefined;
    fixture.componentInstance.saveAdjustment.subscribe((v) => (payload = v));

    instance.startAdjust();
    instance.adjustDelta.set('-10');
    instance.adjustReasonCode.set('DAMAGE');
    instance.adjustNotes.set('  Crushed pallet.  ');
    instance.submitAdjustment();

    expect(payload).toEqual({ quantityDelta: -10, reasonCode: 'DAMAGE', notes: 'Crushed pallet.' });
  });

  it('setAdjustError surfaces a store-side outcome on the open adjust form', () => {
    const fixture = create();
    const instance = fixture.componentInstance as unknown as { startAdjust: () => void };
    instance.startAdjust();
    fixture.componentInstance.setAdjustError('This stock item could not be found.');
    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('This stock item could not be found.');
  });

  it('resets the adjust form when the stockItem input changes identity, including after a successful save', () => {
    const fixture = create();
    const instance = fixture.componentInstance as unknown as {
      startAdjust: () => void;
      adjustDelta: { set: (v: string) => void; (): string };
      adjusting: () => boolean;
    };
    instance.startAdjust();
    instance.adjustDelta.set('5');
    expect(instance.adjusting()).toBe(true);

    fixture.componentRef.setInput('stockItem', { ...LOT_ITEM, onHand: 70 });
    fixture.detectChanges();

    expect(instance.adjusting()).toBe(false);
    expect(instance.adjustDelta()).toBe('');
  });

  it('renders each ledger entry with its movement type and signed delta', () => {
    const fixture = create();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Receipt');
    expect(text).toContain('60');
  });
});
```

- [ ] **Step 2: Run the spec to verify it fails**

Run: `pnpm nx test ikho-ui --skip-nx-cache --include='**/stock-item-detail-panel.spec.ts'` (from `source/`)
Expected: FAIL — the component does not exist yet.

- [ ] **Step 3: Implement `StockItemDetailPanel`**

```ts
// source/apps/ikho-ui/src/app/features/office/inventory/stock-item-detail-panel.ts
import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { Button, Icon, StatusBadge, TextInput } from '@ikho/shared-ui';
import { LangService } from '../../../core/i18n/lang.service';
import { resolveStatusLabel } from '../../../core/i18n/status-label.util';
import { StockItem, StockLedgerEntry } from '../../../core/mock-data/inventory.data';

const MOVEMENT_LABEL: Record<StockLedgerEntry['movementType'], { en: string; vi: string }> = {
  receipt: { en: 'Receipt', vi: 'Nhập kho' },
  adjustment: { en: 'Adjustment', vi: 'Điều chỉnh' },
  reservation: { en: 'Reservation', vi: 'Giữ hàng' },
  release: { en: 'Release', vi: 'Nhả giữ' },
  shipment: { en: 'Shipment', vi: 'Xuất kho' },
  'quarantine-receipt': { en: 'Quarantine receipt', vi: 'Nhập cách ly' },
};

const REASON_CODES = ['CYCLE_COUNT', 'DAMAGE', 'SHRINKAGE', 'FOUND'] as const;

@Component({
  selector: 'app-stock-item-detail-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Button, Icon, StatusBadge, TextInput],
  host: { class: 'block' },
  template: `
    <aside class="flex w-96 flex-none flex-col gap-4 rounded-card border border-hairline-light bg-canvas-light p-6 shadow-card">
      <div class="flex items-start justify-between gap-3">
        <div class="flex min-w-0 flex-col gap-1">
          <span class="font-core text-[11px] font-bold tracking-[0.5px] text-shade-50 uppercase">{{ t().eyebrow }}</span>
          <span class="font-mono text-[13px] text-primary">{{ stockItem().sku }}</span>
          <span class="font-core text-lg font-bold tracking-[-0.2px] text-ink">{{ productName() }}</span>
        </div>
        <button
          type="button"
          class="inline-flex size-8 flex-none cursor-pointer items-center justify-center rounded-md border-none bg-transparent hover:bg-surface-elevated-light"
          [attr.aria-label]="t().close"
          (click)="closePanel.emit()"
        >
          <lib-icon name="x" [size]="18" color="var(--color-shade-50)" />
        </button>
      </div>

      <lib-status-badge [status]="stockItem().status" [label]="statusLabel()" />

      <div class="flex flex-col gap-1.5 border-t border-hairline-light pt-4">
        <div class="flex items-baseline justify-between gap-3">
          <span class="font-core text-[13px] text-shade-50">{{ t().warehouse }}</span>
          <span class="text-right font-core text-[13px] font-semibold text-text-body">{{ warehouseName() }}</span>
        </div>
        <div class="flex items-baseline justify-between gap-3">
          <span class="font-core text-[13px] text-shade-50">{{ t().bin }}</span>
          <span class="text-right font-mono text-[13px] font-semibold text-text-body">{{ stockItem().bin }}</span>
        </div>
        @if (stockItem().lot; as lot) {
          <div class="flex items-baseline justify-between gap-3">
            <span class="font-core text-[13px] text-shade-50">{{ t().lot }}</span>
            <span class="text-right font-mono text-[13px] font-semibold text-text-body">{{ lot.lotNumber }}</span>
          </div>
        }
        @if (stockItem().serial; as serial) {
          <div class="flex items-baseline justify-between gap-3">
            <span class="font-core text-[13px] text-shade-50">{{ t().serial }}</span>
            <span class="text-right font-mono text-[13px] font-semibold text-text-body">{{ serial.serialValue }}</span>
          </div>
        }
      </div>

      <div class="flex flex-col gap-1.5 border-t border-hairline-light pt-4">
        <div class="flex items-baseline justify-between gap-3">
          <span class="font-core text-[13px] text-shade-50">{{ t().onHand }}</span>
          <span class="text-right font-core text-[13px] font-semibold text-text-body">{{ stockItem().onHand }}</span>
        </div>
        <div class="flex items-baseline justify-between gap-3">
          <span class="font-core text-[13px] text-shade-50">{{ t().reserved }}</span>
          <span class="text-right font-core text-[13px] font-semibold text-text-body">{{ stockItem().reserved }}</span>
        </div>
        <div class="flex items-baseline justify-between gap-3">
          <span class="font-core text-[13px] text-shade-50">{{ t().damaged }}</span>
          <span class="text-right font-core text-[13px] font-semibold text-text-body">{{ stockItem().damaged }}</span>
        </div>
        <div class="flex items-baseline justify-between gap-3">
          <span class="font-core text-[13px] text-shade-50">{{ t().quarantine }}</span>
          <span class="text-right font-core text-[13px] font-semibold text-text-body">{{ stockItem().quarantine }}</span>
        </div>
        <div class="flex items-baseline justify-between gap-3">
          <span class="font-core text-[13px] font-semibold text-ink">{{ t().available }}</span>
          <span class="text-right font-core text-[13px] font-semibold text-ink">{{ available() }}</span>
        </div>
      </div>

      <div class="flex flex-col gap-2.5 border-t border-hairline-light pt-4">
        @if (adjusting()) {
          <lib-text-input [label]="t().quantityDelta" type="number" [value]="adjustDelta()" (valueChange)="adjustDelta.set($event)" />
          <label class="flex flex-col gap-1.5">
            <span class="font-core text-[13px] font-semibold text-ink">{{ t().reasonCode }}</span>
            <select
              class="h-10 rounded-md border border-hairline-light bg-canvas-light px-3 font-core text-[13px] text-text-body"
              [value]="adjustReasonCode()"
              (change)="adjustReasonCode.set($any($event.target).value)"
            >
              <option value="">{{ t().selectReason }}</option>
              @for (code of reasonCodes; track code) {
                <option [value]="code">{{ reasonLabel(code) }}</option>
              }
            </select>
          </label>
          <lib-text-input [label]="t().notes" [value]="adjustNotes()" (valueChange)="adjustNotes.set($event)" />
          @if (adjustError(); as err) {
            <span class="font-core text-xs text-status-out-of-stock">{{ err }}</span>
          }
          <div class="flex gap-2">
            <lib-button variant="primary" (click)="submitAdjustment()">{{ t().save }}</lib-button>
            <lib-button variant="ghost" (click)="cancelAdjustment()">{{ t().cancel }}</lib-button>
          </div>
        } @else {
          <lib-button variant="secondary" (click)="startAdjust()">{{ t().adjust }}</lib-button>
        }
      </div>

      <div class="flex flex-col gap-2 border-t border-hairline-light pt-4">
        <span class="font-core text-[13px] font-semibold text-ink">{{ t().ledger }}</span>
        @for (entry of ledgerEntries(); track entry.id) {
          <div class="flex flex-col gap-0.5 rounded-md border border-hairline-light p-2.5">
            <div class="flex items-center justify-between gap-2">
              <span class="font-core text-[13px] font-semibold text-text-body">{{ movementLabel(entry.movementType) }}</span>
              <span class="font-mono text-[13px]" [class]="entry.quantityDelta < 0 ? 'text-status-out-of-stock' : 'text-status-in-stock'">
                {{ entry.quantityDelta > 0 ? '+' : '' }}{{ entry.quantityDelta }}
              </span>
            </div>
            <span class="font-core text-xs text-shade-50">{{ entry.occurredOnUtc.slice(0, 10) }}@if (entry.reasonCode) { · {{ entry.reasonCode }} }</span>
          </div>
        } @empty {
          <span class="font-core text-[13px] text-shade-50">{{ t().noLedgerEntries }}</span>
        }
      </div>
    </aside>
  `,
})
export class StockItemDetailPanel {
  protected readonly lang = inject(LangService);
  protected readonly reasonCodes = REASON_CODES;

  readonly stockItem = input.required<StockItem>();
  readonly productName = input.required<string>();
  readonly warehouseName = input.required<string>();
  readonly ledgerEntries = input.required<StockLedgerEntry[]>();

  readonly closePanel = output<void>();
  readonly saveAdjustment = output<{ quantityDelta: number; reasonCode: string; notes: string }>();

  protected readonly t = computed(() => {
    const en = this.lang.lang() === 'en';
    return {
      eyebrow: en ? 'Stock detail' : 'Chi tiết tồn kho',
      close: en ? 'Close' : 'Đóng',
      warehouse: en ? 'Warehouse' : 'Kho',
      bin: en ? 'Bin' : 'Ô kệ',
      lot: en ? 'Lot' : 'Lô',
      serial: en ? 'Serial' : 'Serial',
      onHand: en ? 'On hand' : 'Tồn thực',
      reserved: en ? 'Reserved' : 'Đã giữ',
      damaged: en ? 'Damaged' : 'Hư hỏng',
      quarantine: en ? 'Quarantine' : 'Cách ly',
      available: en ? 'Available' : 'Khả dụng',
      adjust: en ? 'Adjust' : 'Điều chỉnh',
      quantityDelta: en ? 'Quantity change' : 'Thay đổi số lượng',
      reasonCode: en ? 'Reason' : 'Lý do',
      selectReason: en ? 'Select a reason' : 'Chọn lý do',
      notes: en ? 'Notes' : 'Ghi chú',
      save: en ? 'Save' : 'Lưu',
      cancel: en ? 'Cancel' : 'Huỷ',
      adjustRequired: en ? 'A reason and a non-zero quantity change are required.' : 'Cần nhập lý do và số lượng thay đổi khác 0.',
      wouldGoNegative: en ? 'This change would leave on-hand quantity negative.' : 'Thay đổi này sẽ khiến tồn thực âm.',
      ledger: en ? 'Ledger' : 'Sổ cái',
      noLedgerEntries: en ? 'No history yet.' : 'Chưa có lịch sử.',
    };
  });

  protected readonly statusLabel = computed(() => resolveStatusLabel({ status: this.stockItem().status }, this.lang.lang()));
  protected readonly available = computed(() => {
    const s = this.stockItem();
    return s.onHand - s.reserved - s.damaged - s.quarantine;
  });

  protected readonly adjusting = signal(false);
  protected readonly adjustDelta = signal('');
  protected readonly adjustReasonCode = signal('');
  protected readonly adjustNotes = signal('');
  protected readonly adjustError = signal<string | null>(null);

  constructor() {
    // Resets state whenever the selected stock item changes AND after any successful save for it —
    // the store's immutable updates give stockItem() a new object identity on every mutation, so a
    // save "closes" its own adjust form as a side effect.
    effect(() => {
      this.stockItem();
      this.adjusting.set(false);
      this.adjustError.set(null);
      this.adjustDelta.set('');
      this.adjustReasonCode.set('');
      this.adjustNotes.set('');
    });
  }

  protected reasonLabel(code: (typeof REASON_CODES)[number]): string {
    const labels: Record<(typeof REASON_CODES)[number], { en: string; vi: string }> = {
      CYCLE_COUNT: { en: 'Cycle count', vi: 'Kiểm kê' },
      DAMAGE: { en: 'Damage', vi: 'Hư hỏng' },
      SHRINKAGE: { en: 'Shrinkage', vi: 'Hao hụt' },
      FOUND: { en: 'Found', vi: 'Tìm thấy' },
    };
    return labels[code][this.lang.lang()];
  }

  protected movementLabel(type: StockLedgerEntry['movementType']): string {
    return MOVEMENT_LABEL[type][this.lang.lang()];
  }

  protected startAdjust(): void {
    this.adjustError.set(null);
    this.adjusting.set(true);
  }

  protected submitAdjustment(): void {
    const delta = Number(this.adjustDelta());
    const reasonCode = this.adjustReasonCode().trim();
    if (!reasonCode || Number.isNaN(delta) || delta === 0) {
      this.adjustError.set(this.t().adjustRequired);
      return;
    }
    if (this.stockItem().onHand + delta < 0) {
      this.adjustError.set(this.t().wouldGoNegative);
      return;
    }
    this.saveAdjustment.emit({ quantityDelta: delta, reasonCode, notes: this.adjustNotes().trim() });
  }

  protected cancelAdjustment(): void {
    this.adjusting.set(false);
    this.adjustDelta.set('');
    this.adjustReasonCode.set('');
    this.adjustNotes.set('');
    this.adjustError.set(null);
  }

  /** Lets the parent surface a store-side outcome (e.g. not-found) for the open adjust form. */
  setAdjustError(message: string): void {
    this.adjustError.set(message);
  }
}
```

- [ ] **Step 4: Run the spec to verify it passes**

Run: `pnpm nx test ikho-ui --skip-nx-cache --include='**/stock-item-detail-panel.spec.ts'` (from `source/`)
Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add source/apps/ikho-ui/src/app/features/office/inventory/stock-item-detail-panel.ts source/apps/ikho-ui/src/app/features/office/inventory/stock-item-detail-panel.spec.ts
git commit -m "feat(ikho-ui): add StockItemDetailPanel with quantity breakdown, adjust, and ledger"
```

---

### Task 3: `OfficeInventory` screen shell — header, KPIs, 2-way toggle, two read-only tables

**Files:**
- Modify: `source/apps/ikho-ui/src/app/features/office/inventory/office-inventory.ts` (full rewrite — this file exists today as the static placeholder; every line of its current content is replaced)
- Create: `source/apps/ikho-ui/src/app/features/office/inventory/office-inventory.spec.ts`

No route change is needed — `office.routes.ts` already points `inventory` at `./inventory/office-inventory`.

**Interfaces:**
- Consumes: `InventoryStore` (Task 1), `CatalogStore`/`OrganizationStore` (existing, for name resolution), `LangService`, `screenTitle`/`screenMeta` (existing).
- Produces: `OfficeInventory` (selector `app-office-inventory`) with protected members `activeSection: WritableSignal<'stock-positions' | 'reservations'>`, `query`, `kpis`, both sections' columns/rows/filtered-rows computeds, and `nameOfProduct(sku)`/`nameOfWarehouse(code)` lookup helpers. Task 4 wires `StockItemDetailPanel` and the Receive-stock create panel into the Stock Positions section (and adds the header's primary action); Task 5 wires `ReservationDetailPanel` into the Reservations section. This task's markup leaves two named anchor comments, `<!-- STOCK_POSITIONS_EXTRA -->` and `<!-- RESERVATIONS_EXTRA -->`, immediately after each table's closing `lib-data-panel`, as unambiguous insertion points — removed as each task fills them in. The header has **no primary action button yet** — Task 4 adds it, since it depends on a signal Task 4 defines (no forward-references).

- [ ] **Step 1: Write the failing `office-inventory.spec.ts`**

```ts
// source/apps/ikho-ui/src/app/features/office/inventory/office-inventory.spec.ts
import { TestBed } from '@angular/core/testing';
import { OfficeInventory } from './office-inventory';

describe('OfficeInventory', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [OfficeInventory] }).compileComponents();
  });

  it('shows the Stock Positions table by default with all 8 seeded rows', () => {
    const fixture = TestBed.createComponent(OfficeInventory);
    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('IKH-482910');
    expect(text).toContain('Steel shelving bracket, 400mm'); // resolved product name
    expect(text).toContain('Rotterdam DC'); // resolved warehouse name
    expect(text).toContain('A-12-04');
  });

  it('computes the 4 KPIs from seed data', () => {
    const fixture = TestBed.createComponent(OfficeInventory);
    fixture.detectChanges();
    const kpis = (fixture.componentInstance as unknown as { kpis: () => { label: string; value: number }[] }).kpis();
    expect(kpis[0].value).toBe(2194); // Total on-hand: sum across all 8 stock items
    expect(kpis[1].value).toBe(1795); // Total available: sum of onHand - reserved - damaged - quarantine
    expect(kpis[2].value).toBe(369); // Total reserved
    expect(kpis[3].value).toBe(1); // Active reservations: only RES-1
  });

  it('toggling to Reservations shows the reservations table instead of stock positions', () => {
    const fixture = TestBed.createComponent(OfficeInventory);
    fixture.detectChanges();
    const buttons = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button'));
    buttons.find((b) => b.textContent?.trim() === 'Reservations')?.click();
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('SO-3301');
    expect(text).not.toContain('A-12-04');
  });

  it('search narrows the Stock Positions table to matching rows', () => {
    const fixture = TestBed.createComponent(OfficeInventory);
    fixture.detectChanges();
    const instance = fixture.componentInstance as unknown as { query: { set: (v: string) => void } };
    instance.query.set('D-01-01');
    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('IKH-201884');
    expect(text).not.toContain('IKH-482910');
  });

  it('shows an empty-state label when the search matches nothing', () => {
    const fixture = TestBed.createComponent(OfficeInventory);
    fixture.detectChanges();
    const instance = fixture.componentInstance as unknown as { query: { set: (v: string) => void } };
    instance.query.set('no-such-bin-xyz');
    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('No stock positions match');
  });

  it('search narrows the Reservations table by sku', () => {
    const fixture = TestBed.createComponent(OfficeInventory);
    fixture.detectChanges();
    const buttons = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button'));
    buttons.find((b) => b.textContent?.trim() === 'Reservations')?.click();
    fixture.detectChanges();
    const instance = fixture.componentInstance as unknown as { query: { set: (v: string) => void } };
    instance.query.set('IKH-330298');
    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('SO-3288');
    expect(text).not.toContain('SO-3301');
  });
});
```

- [ ] **Step 2: Run the spec to verify it fails**

Run: `pnpm nx test ikho-ui --skip-nx-cache --include='**/office-inventory.spec.ts'` (from `source/`)
Expected: FAIL — the current placeholder component doesn't render any of this content.

- [ ] **Step 3: Rewrite `office-inventory.ts`**

Replace the entire file content with:

```ts
// source/apps/ikho-ui/src/app/features/office/inventory/office-inventory.ts
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { DataPanel, DataTable, DataTableColumn, KpiCard, TextInput } from '@ikho/shared-ui';
import { Button } from '@ikho/shared-ui';
import { LangService } from '../../../core/i18n/lang.service';
import { resolveStatusLabel } from '../../../core/i18n/status-label.util';
import { StockItem, StockReservation } from '../../../core/mock-data/inventory.data';
import { screenMeta, screenTitle } from '../../../core/mock-data/screens.data';
import { CatalogStore } from '../../../core/state/catalogue-store';
import { InventoryStore } from '../../../core/state/inventory-store';
import { OrganizationStore } from '../../../core/state/organization-store';

type InventorySection = 'stock-positions' | 'reservations';

interface StockPositionRow extends Record<string, unknown> {
  id: string;
  sku: string;
  productName: string;
  warehouseName: string;
  bin: string;
  lotOrSerial: string;
  onHand: number;
  reserved: number;
  available: number;
  status: 'in-stock' | 'low-stock' | 'out-of-stock';
  statusLabel: string;
}

interface ReservationRow extends Record<string, unknown> {
  id: string;
  sku: string;
  productName: string;
  warehouseName: string;
  quantity: number;
  status: 'in-stock' | 'out-of-stock' | 'outbound';
  statusLabel: string;
  reference: string;
}

@Component({
  selector: 'app-office-inventory',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Button, DataPanel, DataTable, KpiCard, TextInput],
  template: `
    <div class="flex flex-col gap-6">
      <div class="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div class="font-core text-2xl font-bold tracking-[-0.4px] text-ink">{{ title() }}</div>
          <div class="mt-0.5 font-core text-[13px] text-shade-50">{{ meta() }}</div>
        </div>
      </div>

      <div class="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4">
        @for (k of kpis(); track k.label) {
          <lib-kpi-card [label]="k.label" [value]="k.value" />
        }
      </div>

      <div class="flex flex-wrap gap-2">
        <lib-button [variant]="activeSection() === 'stock-positions' ? 'primary' : 'secondary'" (click)="selectSection('stock-positions')">{{ t().stockPositionsTab }}</lib-button>
        <lib-button [variant]="activeSection() === 'reservations' ? 'primary' : 'secondary'" (click)="selectSection('reservations')">{{ t().reservationsTab }}</lib-button>
      </div>

      @if (activeSection() === 'stock-positions') {
        <div class="min-w-60 max-w-md">
          <lib-text-input [placeholder]="t().searchStockPlaceholder" type="search" [value]="query()" (valueChange)="query.set($event)" />
        </div>
        <lib-data-panel [title]="t().stockPositionsPanelTitle">
          <lib-data-table [columns]="stockPositionColumns()" [rows]="filteredStockPositionRows()" [emptyLabel]="t().noStockPositions" />
        </lib-data-panel>
        <!-- STOCK_POSITIONS_EXTRA -->
      } @else {
        <div class="min-w-60 max-w-md">
          <lib-text-input [placeholder]="t().searchReservationsPlaceholder" type="search" [value]="query()" (valueChange)="query.set($event)" />
        </div>
        <lib-data-panel [title]="t().reservationsPanelTitle">
          <lib-data-table [columns]="reservationColumns()" [rows]="filteredReservationRows()" [emptyLabel]="t().noReservations" />
        </lib-data-panel>
        <!-- RESERVATIONS_EXTRA -->
      }
    </div>
  `,
})
export class OfficeInventory {
  protected readonly lang = inject(LangService);
  protected readonly store = inject(InventoryStore);
  protected readonly catalog = inject(CatalogStore);
  protected readonly organization = inject(OrganizationStore);

  protected readonly title = computed(() => screenTitle('inventory', 'admin', this.lang.lang()));
  protected readonly meta = computed(() => screenMeta('inventory', 'admin', this.lang.lang()));

  protected readonly t = computed(() => {
    const en = this.lang.lang() === 'en';
    return {
      stockPositionsTab: en ? 'Stock Positions' : 'Vị trí tồn kho',
      reservationsTab: en ? 'Reservations' : 'Đã giữ hàng',
      stockPositionsPanelTitle: en ? 'Stock Positions' : 'Vị trí tồn kho',
      reservationsPanelTitle: en ? 'Reservations' : 'Đã giữ hàng',
      searchStockPlaceholder: en ? 'Search SKU, name, bin, lot, or serial' : 'Tìm SKU, tên, ô kệ, lô hoặc serial',
      searchReservationsPlaceholder: en ? 'Search SKU or name' : 'Tìm SKU hoặc tên',
      noStockPositions: en ? 'No stock positions match' : 'Không có vị trí tồn kho phù hợp',
      noReservations: en ? 'No reservations match' : 'Không có giữ hàng phù hợp',
      totalOnHand: en ? 'Total on hand' : 'Tổng tồn thực',
      totalAvailable: en ? 'Total available' : 'Tổng khả dụng',
      totalReserved: en ? 'Total reserved' : 'Tổng đã giữ',
      activeReservations: en ? 'Active reservations' : 'Đang giữ hàng',
      colSku: en ? 'SKU' : 'SKU',
      colProduct: en ? 'Product' : 'Sản phẩm',
      colWarehouse: en ? 'Warehouse' : 'Kho',
      colBin: en ? 'Bin' : 'Ô kệ',
      colLotSerial: en ? 'Lot / Serial' : 'Lô / Serial',
      colOnHand: en ? 'On hand' : 'Tồn thực',
      colReserved: en ? 'Reserved' : 'Đã giữ',
      colAvailable: en ? 'Available' : 'Khả dụng',
      colStatus: en ? 'Status' : 'Trạng thái',
      colQuantity: en ? 'Quantity' : 'Số lượng',
      colReference: en ? 'Reference' : 'Tham chiếu',
      active: en ? 'Active' : 'Đang giữ',
      released: en ? 'Released' : 'Đã nhả',
      fulfilled: en ? 'Fulfilled' : 'Đã hoàn tất',
      none: en ? '—' : '—',
    };
  });

  protected readonly activeSection = signal<InventorySection>('stock-positions');
  protected readonly query = signal('');

  protected selectSection(section: InventorySection): void {
    this.activeSection.set(section);
    this.query.set('');
  }

  protected readonly kpis = computed(() => {
    const items = this.store.stockItems();
    const totalOnHand = items.reduce((sum, i) => sum + i.onHand, 0);
    const totalAvailable = items.reduce((sum, i) => sum + (i.onHand - i.reserved - i.damaged - i.quarantine), 0);
    const totalReserved = items.reduce((sum, i) => sum + i.reserved, 0);
    const activeReservations = this.store.reservations().filter((r) => r.status === 'active').length;
    return [
      { label: this.t().totalOnHand, value: totalOnHand },
      { label: this.t().totalAvailable, value: totalAvailable },
      { label: this.t().totalReserved, value: totalReserved },
      { label: this.t().activeReservations, value: activeReservations },
    ];
  });

  protected readonly stockPositionColumns = computed<DataTableColumn[]>(() => {
    const t = this.t();
    return [
      { key: 'sku', label: t.colSku, mono: true },
      { key: 'productName', label: t.colProduct },
      { key: 'warehouseName', label: t.colWarehouse },
      { key: 'bin', label: t.colBin, mono: true },
      { key: 'lotOrSerial', label: t.colLotSerial, mono: true },
      { key: 'onHand', label: t.colOnHand, align: 'right' },
      { key: 'reserved', label: t.colReserved, align: 'right' },
      { key: 'available', label: t.colAvailable, align: 'right' },
      { key: 'status', label: t.colStatus, status: true, statusLabelKey: 'statusLabel' },
    ];
  });

  protected readonly reservationColumns = computed<DataTableColumn[]>(() => {
    const t = this.t();
    return [
      { key: 'sku', label: t.colSku, mono: true },
      { key: 'productName', label: t.colProduct },
      { key: 'warehouseName', label: t.colWarehouse },
      { key: 'quantity', label: t.colQuantity, align: 'right' },
      { key: 'status', label: t.colStatus, status: true, statusLabelKey: 'statusLabel' },
      { key: 'reference', label: t.colReference },
    ];
  });

  protected nameOfProduct(sku: string): string {
    return this.catalog.products().find((p) => p.sku === sku)?.name ?? sku;
  }

  protected nameOfWarehouse(code: string): string {
    return this.organization.warehouses().find((w) => w.code === code)?.name ?? code;
  }

  private toStockPositionRow(item: StockItem): StockPositionRow {
    return {
      id: item.id,
      sku: item.sku,
      productName: this.nameOfProduct(item.sku),
      warehouseName: this.nameOfWarehouse(item.warehouseCode),
      bin: item.bin,
      lotOrSerial: item.lot?.lotNumber ?? item.serial?.serialValue ?? this.t().none,
      onHand: item.onHand,
      reserved: item.reserved,
      available: item.onHand - item.reserved - item.damaged - item.quarantine,
      status: item.status,
      statusLabel: resolveStatusLabel({ status: item.status }, this.lang.lang()),
    };
  }

  private reservationStatusBadge(status: StockReservation['status']): { status: 'in-stock' | 'out-of-stock' | 'outbound'; label: string } {
    const t = this.t();
    if (status === 'active') return { status: 'in-stock', label: t.active };
    if (status === 'fulfilled') return { status: 'outbound', label: t.fulfilled };
    return { status: 'out-of-stock', label: t.released };
  }

  private toReservationRow(r: StockReservation): ReservationRow {
    const badge = this.reservationStatusBadge(r.status);
    return {
      id: r.id,
      sku: r.sku,
      productName: this.nameOfProduct(r.sku),
      warehouseName: this.nameOfWarehouse(r.warehouseCode),
      quantity: r.quantity,
      status: badge.status,
      statusLabel: badge.label,
      reference: r.referenceType && r.referenceId ? `${r.referenceType} ${r.referenceId}` : this.t().none,
    };
  }

  protected readonly stockPositionRows = computed<StockPositionRow[]>(() => this.store.stockItems().map((i) => this.toStockPositionRow(i)));
  protected readonly reservationRows = computed<ReservationRow[]>(() => this.store.reservations().map((r) => this.toReservationRow(r)));

  protected readonly filteredStockPositionRows = computed(() => {
    const q = this.query().trim().toLowerCase();
    if (!q) return this.stockPositionRows();
    return this.stockPositionRows().filter((row) =>
      [row.sku, row.productName, row.bin, row.lotOrSerial].join(' ').toLowerCase().includes(q),
    );
  });

  protected readonly filteredReservationRows = computed(() => {
    const q = this.query().trim().toLowerCase();
    if (!q) return this.reservationRows();
    return this.reservationRows().filter((row) => [row.sku, row.productName].join(' ').toLowerCase().includes(q));
  });
}
```

- [ ] **Step 4: Run the spec to verify it passes**

Run: `pnpm nx test ikho-ui --skip-nx-cache --include='**/office-inventory.spec.ts'` (from `source/`)
Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add source/apps/ikho-ui/src/app/features/office/inventory/office-inventory.ts source/apps/ikho-ui/src/app/features/office/inventory/office-inventory.spec.ts
git commit -m "feat(ikho-ui): rewrite OfficeInventory as a real screen with KPIs, 2-way toggle, and tables"
```

---

### Task 4: Wire `StockItemDetailPanel`, Adjust, and the "Receive stock" create panel into `OfficeInventory`

**Files:**
- Modify: `source/apps/ikho-ui/src/app/features/office/inventory/office-inventory.ts`
- Modify: `source/apps/ikho-ui/src/app/features/office/inventory/office-inventory.spec.ts`

**Interfaces:**
- Consumes: `StockItemDetailPanel` (Task 2), `InventoryStore.receiveStock`/`adjustStock` (Task 1), `CatalogStore.products()`/`OrganizationStore.warehouses()` (existing, for picker options).
- Produces: `OfficeInventory` gains `selectedStockItemId`, `selectedStockItem`, `selectedStockItemLedger`, `onStockPositionRowClick`, `onSaveAdjustment`, `showReceiveForm`, the Receive-stock form fields, `submitReceive`, `cancelReceive`, and the header's primary action button.

- [ ] **Step 1: Add row-click, the detail panel, and the header action to `office-inventory.ts`**

In `office-inventory.ts`:
- Change the `@angular/core` import to add `viewChild`: `import { ChangeDetectionStrategy, Component, computed, inject, signal, viewChild } from '@angular/core';`.
- Add `import { StockItemDetailPanel } from './stock-item-detail-panel';`.
- Add `StockItemDetailPanel` to the `@Component` `imports` array.
- Replace the header block:

```html
      <div class="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div class="font-core text-2xl font-bold tracking-[-0.4px] text-ink">{{ title() }}</div>
          <div class="mt-0.5 font-core text-[13px] text-shade-50">{{ meta() }}</div>
        </div>
      </div>
```

with:

```html
      <div class="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div class="font-core text-2xl font-bold tracking-[-0.4px] text-ink">{{ title() }}</div>
          <div class="mt-0.5 font-core text-[13px] text-shade-50">{{ meta() }}</div>
        </div>
        @if (activeSection() === 'stock-positions') {
          <lib-button variant="primary" (click)="showReceiveForm.set(!showReceiveForm())">{{ t().receiveStock }}</lib-button>
        }
      </div>
```

- Replace the Stock Positions branch's `lib-data-panel` block:

```html
        <lib-data-panel [title]="t().stockPositionsPanelTitle">
          <lib-data-table [columns]="stockPositionColumns()" [rows]="filteredStockPositionRows()" [emptyLabel]="t().noStockPositions" />
        </lib-data-panel>
        <!-- STOCK_POSITIONS_EXTRA -->
```

with:

```html
        @if (showReceiveForm()) {
          <lib-data-panel [title]="t().receiveStock">
            <div class="flex flex-col gap-3">
              <label class="flex flex-col gap-1.5">
                <span class="font-core text-[13px] font-semibold text-ink">{{ t().product }}</span>
                <select
                  class="h-10 rounded-md border border-hairline-light bg-canvas-light px-3 font-core text-[13px] text-text-body"
                  [value]="receiveSku()"
                  (change)="receiveSku.set($any($event.target).value)"
                >
                  <option value="">{{ t().selectProduct }}</option>
                  @for (p of catalog.products(); track p.sku) {
                    @if (p.isActive) {
                      <option [value]="p.sku">{{ p.sku }} — {{ p.name }}</option>
                    }
                  }
                </select>
              </label>
              <label class="flex flex-col gap-1.5">
                <span class="font-core text-[13px] font-semibold text-ink">{{ t().warehouse }}</span>
                <select
                  class="h-10 rounded-md border border-hairline-light bg-canvas-light px-3 font-core text-[13px] text-text-body"
                  [value]="receiveWarehouseCode()"
                  (change)="receiveWarehouseCode.set($any($event.target).value)"
                >
                  <option value="">{{ t().selectWarehouse }}</option>
                  @for (w of organization.warehouses(); track w.code) {
                    @if (w.isActive) {
                      <option [value]="w.code">{{ w.name }}</option>
                    }
                  }
                </select>
              </label>
              <lib-text-input [label]="t().bin" [value]="receiveBin()" (valueChange)="receiveBin.set($event)" />
              <lib-text-input [label]="t().quantity" type="number" [value]="receiveQuantity()" (valueChange)="receiveQuantity.set($event)" />
              @if (receiveProductIsLotControlled(); as isLot) {
                @if (isLot) {
                  <lib-text-input [label]="t().lotNumber" [value]="receiveLotNumber()" (valueChange)="receiveLotNumber.set($event)" />
                  <lib-text-input [label]="t().expirationDate" type="text" [placeholder]="t().expirationDatePlaceholder" [value]="receiveExpirationDate()" (valueChange)="receiveExpirationDate.set($event)" />
                }
              }
              @if (receiveProductIsSerialControlled(); as isSerial) {
                @if (isSerial) {
                  <lib-text-input [label]="t().serialNumbers" [hint]="t().serialNumbersHint" [value]="receiveSerialNumbers()" (valueChange)="receiveSerialNumbers.set($event)" />
                }
              }
              @if (receiveError(); as err) {
                <span class="font-core text-xs text-status-out-of-stock">{{ err }}</span>
              }
              <div class="flex gap-2">
                <lib-button variant="primary" (click)="submitReceive()">{{ t().save }}</lib-button>
                <lib-button variant="ghost" (click)="cancelReceive()">{{ t().cancel }}</lib-button>
              </div>
            </div>
          </lib-data-panel>
        }
        <div class="flex items-start gap-5">
          <div class="min-w-0 flex-1">
            <lib-data-panel [title]="t().stockPositionsPanelTitle">
              <lib-data-table [columns]="stockPositionColumns()" [rows]="filteredStockPositionRows()" [emptyLabel]="t().noStockPositions" [clickable]="true" (rowClick)="onStockPositionRowClick($event)" />
            </lib-data-panel>
          </div>
          @if (selectedStockItem(); as item) {
            <app-stock-item-detail-panel
              #stockItemDetailPanel
              [stockItem]="item"
              [productName]="nameOfProduct(item.sku)"
              [warehouseName]="nameOfWarehouse(item.warehouseCode)"
              [ledgerEntries]="selectedStockItemLedger()"
              (closePanel)="selectedStockItemId.set(null)"
              (saveAdjustment)="onSaveAdjustment($event)"
            />
          }
        </div>
```

- Add `import { TextInput } from '@ikho/shared-ui';` if not already present (it already is, via the existing `DataPanel, DataTable, DataTableColumn, KpiCard, TextInput` import).

- Add these members to the class (after `query`):

```ts
  protected readonly selectedStockItemId = signal<string | null>(null);
  protected readonly stockItemDetailPanel = viewChild<StockItemDetailPanel>('stockItemDetailPanel');

  protected readonly selectedStockItem = computed<StockItem | null>(() => {
    const id = this.selectedStockItemId();
    if (!id) return null;
    return this.store.stockItems().find((i) => i.id === id) ?? null;
  });

  protected readonly selectedStockItemLedger = computed(() => {
    const id = this.selectedStockItemId();
    if (!id) return [];
    return this.store.ledger().filter((e) => e.stockItemId === id);
  });

  protected readonly showReceiveForm = signal(false);
  protected readonly receiveSku = signal('');
  protected readonly receiveWarehouseCode = signal('');
  protected readonly receiveBin = signal('');
  protected readonly receiveQuantity = signal('');
  protected readonly receiveLotNumber = signal('');
  protected readonly receiveExpirationDate = signal('');
  protected readonly receiveSerialNumbers = signal('');
  protected readonly receiveError = signal<string | null>(null);

  protected readonly receiveProductIsLotControlled = computed(() => this.catalog.products().find((p) => p.sku === this.receiveSku())?.isLotControlled ?? false);
  protected readonly receiveProductIsSerialControlled = computed(() => this.catalog.products().find((p) => p.sku === this.receiveSku())?.isSerialControlled ?? false);
```

- Add these keys to the `t()` computed's returned object:

```ts
      receiveStock: en ? 'Receive stock' : 'Nhập kho',
      product: en ? 'Product' : 'Sản phẩm',
      selectProduct: en ? 'Select a product' : 'Chọn sản phẩm',
      warehouse: en ? 'Warehouse' : 'Kho',
      selectWarehouse: en ? 'Select a warehouse' : 'Chọn kho',
      quantity: en ? 'Quantity' : 'Số lượng',
      lotNumber: en ? 'Lot number' : 'Số lô',
      expirationDate: en ? 'Expiration date (optional)' : 'Ngày hết hạn (tuỳ chọn)',
      expirationDatePlaceholder: en ? 'YYYY-MM-DD' : 'YYYY-MM-DD',
      serialNumbers: en ? 'Serial numbers' : 'Số serial',
      serialNumbersHint: en ? 'Comma-separated, one per unit.' : 'Cách nhau bởi dấu phẩy, mỗi giá trị một đơn vị.',
      save: en ? 'Save' : 'Lưu',
      cancel: en ? 'Cancel' : 'Huỷ',
      receiveInvalidError: en ? 'Select a product and warehouse, enter a bin, and a quantity greater than zero.' : 'Chọn sản phẩm, kho, nhập ô kệ và số lượng lớn hơn 0.',
      productNotFoundError: en ? 'This product could not be found or is inactive.' : 'Không tìm thấy sản phẩm này hoặc đã ngừng hoạt động.',
      lotRequiredError: en ? 'This product is lot-controlled; a lot number is required.' : 'Sản phẩm này theo lô; cần nhập số lô.',
      serialRequiredError: en ? 'This product is serial-controlled; serial numbers are required.' : 'Sản phẩm này theo serial; cần nhập số serial.',
      serialCountMismatchError: en ? 'The number of serial numbers must equal the quantity.' : 'Số lượng serial phải bằng số lượng nhập.',
      duplicateSerialError: en ? 'Serial numbers must not contain duplicates.' : 'Số serial không được trùng lặp.',
      stockItemNotFoundError: en ? 'This stock item could not be found. It may have changed.' : 'Không tìm thấy vị trí tồn kho này. Có thể đã thay đổi.',
      wouldGoNegativeError: en ? 'This change would leave on-hand quantity negative.' : 'Thay đổi này sẽ khiến tồn thực âm.',
```

- Add these methods to the class (after `filteredReservationRows`):

```ts
  protected onStockPositionRowClick(row: Record<string, unknown>): void {
    this.selectedStockItemId.set(String(row['id']));
  }

  protected onSaveAdjustment(input: { quantityDelta: number; reasonCode: string; notes: string }): void {
    const item = this.selectedStockItem();
    if (!item) return;
    const outcome = this.store.adjustStock(item.id, input);
    if (outcome === 'not-found') {
      this.stockItemDetailPanel()?.setAdjustError(this.t().stockItemNotFoundError);
    } else if (outcome === 'would-go-negative') {
      this.stockItemDetailPanel()?.setAdjustError(this.t().wouldGoNegativeError);
    }
  }

  protected submitReceive(): void {
    const quantity = Number(this.receiveQuantity());
    if (!this.receiveSku() || !this.receiveWarehouseCode() || !this.receiveBin().trim() || !quantity || quantity <= 0) {
      this.receiveError.set(this.t().receiveInvalidError);
      return;
    }

    const serialNumbers = this.receiveSerialNumbers()
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    const outcome = this.store.receiveStock({
      sku: this.receiveSku(),
      warehouseCode: this.receiveWarehouseCode(),
      bin: this.receiveBin().trim(),
      quantity,
      lotNumber: this.receiveLotNumber().trim() || undefined,
      expirationDateUtc: this.receiveExpirationDate().trim() || undefined,
      serialNumbers: serialNumbers.length > 0 ? serialNumbers : undefined,
    });

    if (outcome === 'ok') {
      this.cancelReceive();
      return;
    }
    if (outcome === 'invalid') this.receiveError.set(this.t().receiveInvalidError);
    else if (outcome === 'product-not-found') this.receiveError.set(this.t().productNotFoundError);
    else if (outcome === 'lot-required') this.receiveError.set(this.t().lotRequiredError);
    else if (outcome === 'serial-required') this.receiveError.set(this.t().serialRequiredError);
    else if (outcome === 'serial-count-mismatch') this.receiveError.set(this.t().serialCountMismatchError);
    else if (outcome === 'duplicate-serial') this.receiveError.set(this.t().duplicateSerialError);
  }

  protected cancelReceive(): void {
    this.showReceiveForm.set(false);
    this.receiveSku.set('');
    this.receiveWarehouseCode.set('');
    this.receiveBin.set('');
    this.receiveQuantity.set('');
    this.receiveLotNumber.set('');
    this.receiveExpirationDate.set('');
    this.receiveSerialNumbers.set('');
    this.receiveError.set(null);
  }
```

- Modify `selectSection` to also clear the receive form and both selections:

```ts
  protected selectSection(section: InventorySection): void {
    this.activeSection.set(section);
    this.query.set('');
    this.selectedStockItemId.set(null);
    this.cancelReceive();
  }
```

- [ ] **Step 2: Add `StockItem` type import**

Add `StockItem` to the existing `inventory.data` import: `import { StockItem, StockReservation } from '../../../core/mock-data/inventory.data';`.

- [ ] **Step 3: Add failing tests for the wiring, then confirm they pass**

Append to `office-inventory.spec.ts` (inside the existing `describe('OfficeInventory', ...)` block):

```ts
  it('clicking a stock position row opens its detail panel with resolved names and ledger history', () => {
    const fixture = TestBed.createComponent(OfficeInventory);
    fixture.detectChanges();
    const rows = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('[role="button"]'));
    const row = rows.find((r) => r.textContent?.includes('IKH-330298'));
    (row as HTMLElement)?.click();
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('LOT-2026-0392');
    expect(text).toContain('Receipt');
  });

  it('adjusting a stock item from its detail panel updates on-hand in the table', () => {
    const fixture = TestBed.createComponent(OfficeInventory);
    fixture.detectChanges();
    const instance = fixture.componentInstance as unknown as { selectedStockItemId: { set: (v: string) => void } };
    instance.selectedStockItemId.set('SI-1');
    fixture.detectChanges();

    (fixture.nativeElement as HTMLElement).querySelectorAll('button').forEach((b) => {
      if (b.textContent?.trim() === 'Adjust') b.click();
    });
    fixture.detectChanges();

    const numberInput = (fixture.nativeElement as HTMLElement).querySelector('input[type="number"]') as HTMLInputElement;
    numberInput.value = '10';
    numberInput.dispatchEvent(new Event('input'));
    const select = (fixture.nativeElement as HTMLElement).querySelector('select') as HTMLSelectElement;
    select.value = 'FOUND';
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    (fixture.nativeElement as HTMLElement).querySelectorAll('button').forEach((b) => {
      if (b.textContent?.trim() === 'Save') b.click();
    });
    fixture.detectChanges();

    const store = (fixture.componentInstance as unknown as { store: { stockItems: () => { id: string; onHand: number }[] } }).store;
    expect(store.stockItems().find((s) => s.id === 'SI-1')?.onHand).toBe(250);
  });

  it('receiving stock for a lot-controlled product without a lot number shows an error and does not create a row', () => {
    const fixture = TestBed.createComponent(OfficeInventory);
    fixture.detectChanges();
    const before = (fixture.componentInstance as unknown as { store: { stockItems: () => unknown[] } }).store.stockItems().length;

    (fixture.nativeElement as HTMLElement).querySelectorAll('button').forEach((b) => {
      if (b.textContent?.trim() === 'Receive stock') b.click();
    });
    fixture.detectChanges();

    const selects = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('select'));
    const productSelect = selects[0];
    productSelect.value = 'IKH-330298'; // lot-controlled
    productSelect.dispatchEvent(new Event('change'));
    const warehouseSelect = selects[1];
    warehouseSelect.value = 'WH-1';
    warehouseSelect.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    const inputs = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('input'));
    // The page's own search box is type="search" — the receive form's Bin field defaults to
    // type="text", so filtering to exactly 'text' (not 'search') targets the right input.
    const binInput = inputs.find((i) => i.type === 'text');
    binInput!.value = 'A-04-09';
    binInput!.dispatchEvent(new Event('input'));
    const qtyInput = inputs.find((i) => i.type === 'number');
    qtyInput!.value = '5';
    qtyInput!.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    (fixture.nativeElement as HTMLElement).querySelectorAll('button').forEach((b) => {
      if (b.textContent?.trim() === 'Save') b.click();
    });
    fixture.detectChanges();

    const store = (fixture.componentInstance as unknown as { store: { stockItems: () => unknown[] } }).store;
    expect(store.stockItems().length).toBe(before);
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('lot-controlled');
  });

  it('switching sections clears the receive form and the selected stock item', () => {
    const fixture = TestBed.createComponent(OfficeInventory);
    fixture.detectChanges();
    const instance = fixture.componentInstance as unknown as {
      selectedStockItemId: { set: (v: string) => void };
      showReceiveForm: { set: (v: boolean) => void; (): boolean };
    };
    instance.selectedStockItemId.set('SI-1');
    instance.showReceiveForm.set(true);
    fixture.detectChanges();

    (fixture.nativeElement as HTMLElement).querySelectorAll('button').forEach((b) => {
      if (b.textContent?.trim() === 'Reservations') b.click();
    });
    fixture.detectChanges();
    (fixture.nativeElement as HTMLElement).querySelectorAll('button').forEach((b) => {
      if (b.textContent?.trim() === 'Stock Positions') b.click();
    });
    fixture.detectChanges();

    expect(instance.showReceiveForm()).toBe(false);
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).not.toContain('Ledger');
  });
```

Run: `pnpm nx test ikho-ui --skip-nx-cache --include='**/office-inventory.spec.ts'` (from `source/`)
Expected: all tests PASS.

- [ ] **Step 4: Commit**

```bash
git add source/apps/ikho-ui/src/app/features/office/inventory/office-inventory.ts source/apps/ikho-ui/src/app/features/office/inventory/office-inventory.spec.ts
git commit -m "feat(ikho-ui): wire StockItemDetailPanel, adjust, and receive-stock into OfficeInventory"
```

---

### Task 5: `ReservationDetailPanel` — wire row-click and Release into `OfficeInventory`

**Files:**
- Create: `source/apps/ikho-ui/src/app/features/office/inventory/reservation-detail-panel.ts`
- Test: `source/apps/ikho-ui/src/app/features/office/inventory/reservation-detail-panel.spec.ts`
- Modify: `source/apps/ikho-ui/src/app/features/office/inventory/office-inventory.ts`
- Modify: `source/apps/ikho-ui/src/app/features/office/inventory/office-inventory.spec.ts`

**Interfaces:**
- Consumes: `StockReservation` (Task 1), `LangService` (existing).
- Produces: `ReservationDetailPanel` (selector `app-reservation-detail-panel`) with `reservation = input.required<StockReservation>()`, `productName = input.required<string>()`, `warehouseName = input.required<string>()`, outputs `closePanel: output<void>()`, `release: output<void>()`. `OfficeInventory` gains `selectedReservationId`, `selectedReservation`, `onReservationRowClick`, `onReleaseReservation`.

- [ ] **Step 1: Write the failing `reservation-detail-panel.spec.ts`**

```ts
// source/apps/ikho-ui/src/app/features/office/inventory/reservation-detail-panel.spec.ts
import { TestBed } from '@angular/core/testing';
import { StockReservation } from '../../../core/mock-data/inventory.data';
import { ReservationDetailPanel } from './reservation-detail-panel';

const ACTIVE: StockReservation = {
  id: 'RES-1', stockItemId: 'SI-8', sku: 'IKH-201884', warehouseCode: 'WH-1', quantity: 1, status: 'active',
  referenceType: 'SalesOrder', referenceId: 'SO-3301', createdOnUtc: '2024-08-01T09:00:00Z',
};

const RELEASED: StockReservation = {
  id: 'RES-2', stockItemId: 'SI-2', sku: 'IKH-330298', warehouseCode: 'WH-1', quantity: 5, status: 'released',
  referenceType: 'SalesOrder', referenceId: 'SO-3288', createdOnUtc: '2024-07-20T09:00:00Z', releasedOnUtc: '2024-07-25T09:00:00Z',
};

describe('ReservationDetailPanel', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [ReservationDetailPanel] }).compileComponents();
  });

  function create(reservation: StockReservation = ACTIVE) {
    const fixture = TestBed.createComponent(ReservationDetailPanel);
    fixture.componentRef.setInput('reservation', reservation);
    fixture.componentRef.setInput('productName', 'Hand pallet truck, 2.5t');
    fixture.componentRef.setInput('warehouseName', 'Rotterdam DC');
    fixture.detectChanges();
    return fixture;
  }

  it('renders sku, product/warehouse name, quantity, status, and reference', () => {
    const fixture = create();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('IKH-201884');
    expect(text).toContain('Hand pallet truck, 2.5t');
    expect(text).toContain('Rotterdam DC');
    expect(text).toContain('SalesOrder SO-3301');
  });

  it('shows a Release button for an active reservation', () => {
    const fixture = create(ACTIVE);
    const buttons = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button'));
    expect(buttons.some((b) => b.textContent?.includes('Release'))).toBe(true);
  });

  it('hides the Release button for a released reservation', () => {
    const fixture = create(RELEASED);
    const buttons = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button'));
    expect(buttons.some((b) => b.textContent?.includes('Release'))).toBe(false);
  });

  it('release emits when the Release button is clicked', () => {
    const fixture = create(ACTIVE);
    let emitted = false;
    fixture.componentInstance.release.subscribe(() => (emitted = true));
    const buttons = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button'));
    (buttons.find((b) => b.textContent?.includes('Release')) as HTMLElement)?.click();
    expect(emitted).toBe(true);
  });

  it('closePanel emits when the close button is clicked', () => {
    const fixture = create();
    let emitted = false;
    fixture.componentInstance.closePanel.subscribe(() => (emitted = true));
    (fixture.nativeElement as HTMLElement).querySelector('button[aria-label]')?.dispatchEvent(new Event('click', { bubbles: true }));
    expect(emitted).toBe(true);
  });
});
```

- [ ] **Step 2: Run the spec to verify it fails**

Run: `pnpm nx test ikho-ui --skip-nx-cache --include='**/reservation-detail-panel.spec.ts'` (from `source/`)
Expected: FAIL — the component does not exist yet.

- [ ] **Step 3: Implement `ReservationDetailPanel`**

```ts
// source/apps/ikho-ui/src/app/features/office/inventory/reservation-detail-panel.ts
import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { Button, Icon, StatusBadge } from '@ikho/shared-ui';
import { LangService } from '../../../core/i18n/lang.service';
import { StockReservation } from '../../../core/mock-data/inventory.data';

@Component({
  selector: 'app-reservation-detail-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Button, Icon, StatusBadge],
  host: { class: 'block' },
  template: `
    <aside class="flex w-96 flex-none flex-col gap-4 rounded-card border border-hairline-light bg-canvas-light p-6 shadow-card">
      <div class="flex items-start justify-between gap-3">
        <div class="flex min-w-0 flex-col gap-1">
          <span class="font-core text-[11px] font-bold tracking-[0.5px] text-shade-50 uppercase">{{ t().eyebrow }}</span>
          <span class="font-mono text-[13px] text-primary">{{ reservation().sku }}</span>
          <span class="font-core text-lg font-bold tracking-[-0.2px] text-ink">{{ productName() }}</span>
        </div>
        <button
          type="button"
          class="inline-flex size-8 flex-none cursor-pointer items-center justify-center rounded-md border-none bg-transparent hover:bg-surface-elevated-light"
          [attr.aria-label]="t().close"
          (click)="closePanel.emit()"
        >
          <lib-icon name="x" [size]="18" color="var(--color-shade-50)" />
        </button>
      </div>

      <lib-status-badge [status]="statusBadge().status" [label]="statusBadge().label" />

      <div class="flex flex-col gap-1.5 border-t border-hairline-light pt-4">
        <div class="flex items-baseline justify-between gap-3">
          <span class="font-core text-[13px] text-shade-50">{{ t().warehouse }}</span>
          <span class="text-right font-core text-[13px] font-semibold text-text-body">{{ warehouseName() }}</span>
        </div>
        <div class="flex items-baseline justify-between gap-3">
          <span class="font-core text-[13px] text-shade-50">{{ t().quantity }}</span>
          <span class="text-right font-core text-[13px] font-semibold text-text-body">{{ reservation().quantity }}</span>
        </div>
        <div class="flex items-baseline justify-between gap-3">
          <span class="font-core text-[13px] text-shade-50">{{ t().reference }}</span>
          <span class="text-right font-core text-[13px] font-semibold text-text-body">{{ referenceText() }}</span>
        </div>
      </div>

      @if (reservation().status === 'active') {
        <lib-button variant="primary" [fullWidth]="true" (click)="release.emit()">{{ t().release }}</lib-button>
      }
    </aside>
  `,
})
export class ReservationDetailPanel {
  protected readonly lang = inject(LangService);

  readonly reservation = input.required<StockReservation>();
  readonly productName = input.required<string>();
  readonly warehouseName = input.required<string>();

  readonly closePanel = output<void>();
  readonly release = output<void>();

  protected readonly t = computed(() => {
    const en = this.lang.lang() === 'en';
    return {
      eyebrow: en ? 'Reservation detail' : 'Chi tiết giữ hàng',
      close: en ? 'Close' : 'Đóng',
      warehouse: en ? 'Warehouse' : 'Kho',
      quantity: en ? 'Quantity' : 'Số lượng',
      reference: en ? 'Reference' : 'Tham chiếu',
      active: en ? 'Active' : 'Đang giữ',
      released: en ? 'Released' : 'Đã nhả',
      fulfilled: en ? 'Fulfilled' : 'Đã hoàn tất',
      none: en ? '—' : '—',
      release: en ? 'Release' : 'Nhả giữ',
    };
  });

  protected readonly referenceText = computed(() => {
    const r = this.reservation();
    return r.referenceType && r.referenceId ? `${r.referenceType} ${r.referenceId}` : this.t().none;
  });

  protected readonly statusBadge = computed(() => {
    const status = this.reservation().status;
    const t = this.t();
    if (status === 'active') return { status: 'in-stock' as const, label: t.active };
    if (status === 'fulfilled') return { status: 'outbound' as const, label: t.fulfilled };
    return { status: 'out-of-stock' as const, label: t.released };
  });
}
```

- [ ] **Step 4: Run the spec to verify it passes**

Run: `pnpm nx test ikho-ui --skip-nx-cache --include='**/reservation-detail-panel.spec.ts'` (from `source/`)
Expected: all tests PASS.

- [ ] **Step 5: Wire row selection, the detail panel, and Release into `OfficeInventory`**

In `office-inventory.ts`:
- Add `import { ReservationDetailPanel } from './reservation-detail-panel';`.
- Add `ReservationDetailPanel` to the `@Component` `imports` array.
- Replace the Reservations branch's `lib-data-panel` block:

```html
        <lib-data-panel [title]="t().reservationsPanelTitle">
          <lib-data-table [columns]="reservationColumns()" [rows]="filteredReservationRows()" [emptyLabel]="t().noReservations" />
        </lib-data-panel>
        <!-- RESERVATIONS_EXTRA -->
```

with:

```html
        <div class="flex items-start gap-5">
          <div class="min-w-0 flex-1">
            <lib-data-panel [title]="t().reservationsPanelTitle">
              <lib-data-table [columns]="reservationColumns()" [rows]="filteredReservationRows()" [emptyLabel]="t().noReservations" [clickable]="true" (rowClick)="onReservationRowClick($event)" />
            </lib-data-panel>
          </div>
          @if (selectedReservation(); as r) {
            <app-reservation-detail-panel
              [reservation]="r"
              [productName]="nameOfProduct(r.sku)"
              [warehouseName]="nameOfWarehouse(r.warehouseCode)"
              (closePanel)="selectedReservationId.set(null)"
              (release)="onReleaseReservation()"
            />
          }
        </div>
```

- Add these members to the class (after `showReceiveForm`'s block, before or after — grouped with the other selection signals):

```ts
  protected readonly selectedReservationId = signal<string | null>(null);

  protected readonly selectedReservation = computed<StockReservation | null>(() => {
    const id = this.selectedReservationId();
    if (!id) return null;
    return this.store.reservations().find((r) => r.id === id) ?? null;
  });
```

- Add these methods to the class (after `cancelReceive`):

```ts
  protected onReservationRowClick(row: Record<string, unknown>): void {
    this.selectedReservationId.set(String(row['id']));
  }

  protected onReleaseReservation(): void {
    const r = this.selectedReservation();
    if (!r) return;
    this.store.releaseReservation(r.id);
  }
```

- Update `selectSection` to also clear the reservation selection:

```ts
  protected selectSection(section: InventorySection): void {
    this.activeSection.set(section);
    this.query.set('');
    this.selectedStockItemId.set(null);
    this.selectedReservationId.set(null);
    this.cancelReceive();
  }
```

- [ ] **Step 6: Add failing tests for the wiring, then confirm they pass**

Append to `office-inventory.spec.ts` (inside the existing `describe('OfficeInventory', ...)` block):

```ts
  it('clicking an active reservation row shows a Release button, and releasing it updates its status', () => {
    const fixture = TestBed.createComponent(OfficeInventory);
    fixture.detectChanges();
    const buttons1 = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button'));
    buttons1.find((b) => b.textContent?.trim() === 'Reservations')?.click();
    fixture.detectChanges();

    const rows = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('[role="button"]'));
    const row = rows.find((r) => r.textContent?.includes('SO-3301'));
    (row as HTMLElement)?.click();
    fixture.detectChanges();

    const buttons2 = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button'));
    (buttons2.find((b) => b.textContent?.includes('Release')) as HTMLElement)?.click();
    fixture.detectChanges();

    const store = (fixture.componentInstance as unknown as { store: { reservations: () => { id: string; status: string }[] } }).store;
    expect(store.reservations().find((r) => r.id === 'RES-1')?.status).toBe('released');
  });

  it('an already-released reservation shows no Release button', () => {
    const fixture = TestBed.createComponent(OfficeInventory);
    fixture.detectChanges();
    const buttons1 = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button'));
    buttons1.find((b) => b.textContent?.trim() === 'Reservations')?.click();
    fixture.detectChanges();

    const rows = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('[role="button"]'));
    const row = rows.find((r) => r.textContent?.includes('SO-3288'));
    (row as HTMLElement)?.click();
    fixture.detectChanges();

    const buttons2 = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button'));
    expect(buttons2.some((b) => b.textContent?.includes('Release'))).toBe(false);
  });
```

Run: `pnpm nx test ikho-ui --skip-nx-cache --include='**/office-inventory.spec.ts'` (from `source/`)
Expected: all tests PASS.

- [ ] **Step 7: Commit**

```bash
git add source/apps/ikho-ui/src/app/features/office/inventory/reservation-detail-panel.ts source/apps/ikho-ui/src/app/features/office/inventory/reservation-detail-panel.spec.ts source/apps/ikho-ui/src/app/features/office/inventory/office-inventory.ts source/apps/ikho-ui/src/app/features/office/inventory/office-inventory.spec.ts
git commit -m "feat(ikho-ui): add ReservationDetailPanel and wire release into OfficeInventory"
```

---

### Task 6: `OperatorInventory` — read-only stock lookup, wired into the route table

**Files:**
- Create: `source/apps/ikho-ui/src/app/features/operator/inventory/operator-inventory.ts`
- Test: `source/apps/ikho-ui/src/app/features/operator/inventory/operator-inventory.spec.ts`
- Modify: `source/apps/ikho-ui/src/app/features/operator/operator.routes.ts`

**Interfaces:**
- Consumes: `InventoryStore` (Task 1), `CatalogStore`/`OrganizationStore` (existing), `LangService`, `UI_STRINGS` (existing).
- Produces: `OperatorInventory` (selector `app-operator-inventory`).

- [ ] **Step 1: Write the failing `operator-inventory.spec.ts`**

```ts
// source/apps/ikho-ui/src/app/features/operator/inventory/operator-inventory.spec.ts
import { TestBed } from '@angular/core/testing';
import { OperatorInventory } from './operator-inventory';

describe('OperatorInventory', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [OperatorInventory] }).compileComponents();
  });

  it('lists all 8 seeded stock items by default with resolved product and warehouse names', () => {
    const fixture = TestBed.createComponent(OperatorInventory);
    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('IKH-482910');
    expect(text).toContain('Steel shelving bracket, 400mm');
    expect(text).toContain('Rotterdam DC');
    expect(text).toContain('A-12-04');
  });

  it('search narrows results by sku, product name, or bin', () => {
    const fixture = TestBed.createComponent(OperatorInventory);
    fixture.detectChanges();
    const instance = fixture.componentInstance as unknown as { query: { set: (v: string) => void } };
    instance.query.set('D-01-01');
    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('IKH-201884');
    expect(text).not.toContain('IKH-482910');
  });

  it('shows an empty-state message when nothing matches', () => {
    const fixture = TestBed.createComponent(OperatorInventory);
    fixture.detectChanges();
    const instance = fixture.componentInstance as unknown as { query: { set: (v: string) => void } };
    instance.query.set('no-such-bin-xyz');
    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('No SKUs match');
  });
});
```

- [ ] **Step 2: Run the spec to verify it fails**

Run: `pnpm nx test ikho-ui --skip-nx-cache --include='**/operator-inventory.spec.ts'` (from `source/`)
Expected: FAIL — the component does not exist yet.

- [ ] **Step 3: Implement `OperatorInventory`**

```ts
// source/apps/ikho-ui/src/app/features/operator/inventory/operator-inventory.ts
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Icon, StatusBadge, TextInput } from '@ikho/shared-ui';
import { LangService } from '../../../core/i18n/lang.service';
import { resolveStatusLabel } from '../../../core/i18n/status-label.util';
import { UI_STRINGS } from '../../../core/i18n/ui-strings.data';
import { CatalogStore } from '../../../core/state/catalogue-store';
import { InventoryStore } from '../../../core/state/inventory-store';
import { OrganizationStore } from '../../../core/state/organization-store';

@Component({
  selector: 'app-operator-inventory',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon, StatusBadge, TextInput],
  host: { class: 'flex flex-col gap-6' },
  template: `
    <lib-text-input [placeholder]="lang.pick(strings.searchOperator)" type="search" [value]="query()" (valueChange)="query.set($event)" />
    <div class="flex flex-col gap-3.5">
      @for (item of results(); track item.id) {
        <div class="flex items-start gap-4 rounded-lg bg-canvas-operator-elevated p-[18px]">
          <lib-icon name="boxes" [size]="28" color="var(--color-accent-teal)" />
          <div class="flex min-w-0 flex-1 flex-col gap-1.5">
            <div class="flex flex-wrap items-center gap-2.5">
              <span class="font-mono text-xs text-shade-40">{{ item.sku }}</span>
              <lib-status-badge [status]="item.status" [label]="item.statusLabel" />
            </div>
            <span class="font-core text-lg font-bold text-on-primary">{{ item.productName }}</span>
            <span class="font-mono text-sm text-accent-teal">{{ item.bin }}@if (item.lotOrSerial) { · {{ item.lotOrSerial }} } · {{ item.onHand }} {{ lang.pick(strings.onHand) }}</span>
          </div>
        </div>
      } @empty {
        <div class="p-6 font-core text-[15px] text-shade-40">{{ lang.pick(strings.noResults) }}</div>
      }
    </div>
  `,
})
export class OperatorInventory {
  protected readonly lang = inject(LangService);
  protected readonly strings = UI_STRINGS;
  private readonly store = inject(InventoryStore);
  private readonly catalog = inject(CatalogStore);
  private readonly organization = inject(OrganizationStore);

  protected readonly query = signal('');

  protected readonly results = computed(() => {
    const q = this.query().trim().toLowerCase();
    const lang = this.lang.lang();
    return this.store
      .stockItems()
      .map((item) => ({
        id: item.id,
        sku: item.sku,
        productName: this.catalog.products().find((p) => p.sku === item.sku)?.name ?? item.sku,
        warehouseName: this.organization.warehouses().find((w) => w.code === item.warehouseCode)?.name ?? item.warehouseCode,
        bin: item.bin,
        lotOrSerial: item.lot?.lotNumber ?? item.serial?.serialValue ?? '',
        onHand: item.onHand,
        status: item.status,
        statusLabel: resolveStatusLabel({ status: item.status }, lang),
      }))
      .filter((row) => !q || [row.sku, row.productName, row.bin].join(' ').toLowerCase().includes(q));
  });
}
```

- [ ] **Step 4: Run the spec to verify it passes**

Run: `pnpm nx test ikho-ui --skip-nx-cache --include='**/operator-inventory.spec.ts'` (from `source/`)
Expected: all tests PASS.

- [ ] **Step 5: Wire the route**

In `source/apps/ikho-ui/src/app/features/operator/operator.routes.ts`, replace:

```ts
  outlinedScreen('inventory'),
```

with:

```ts
  {
    path: 'inventory',
    loadComponent: () => import('./inventory/operator-inventory').then((m) => m.OperatorInventory),
  },
```

- [ ] **Step 6: Commit**

```bash
git add source/apps/ikho-ui/src/app/features/operator/inventory/operator-inventory.ts source/apps/ikho-ui/src/app/features/operator/inventory/operator-inventory.spec.ts source/apps/ikho-ui/src/app/features/operator/operator.routes.ts
git commit -m "feat(ikho-ui): add OperatorInventory read-only stock lookup and wire its route"
```

---

### Task 7: Full workspace verification and rollout-plan status update

**Files:**
- Modify: `docs/plans/catalogue-inventory-rollout-plan.md`

**Interfaces:**
- Consumes: nothing new.
- Produces: nothing new — this task verifies the complete module and updates tracking docs.

- [ ] **Step 1: Run the full `ikho-ui` test suite**

Run: `pnpm nx test ikho-ui --skip-nx-cache` (from `source/`)
Expected: all tests PASS, including every spec from Tasks 1–6 alongside the full pre-existing suite (Catalogue, Billing, Inbound, Outbound, Organization, Returns, Partners, etc.) — confirming nothing in this module broke an unrelated one.

- [ ] **Step 2: Run a production build**

Run: `pnpm nx build ikho-ui` (from `source/`)
Expected: build succeeds with no TypeScript errors.

- [ ] **Step 3: Update the rollout-plan status table**

In `docs/plans/catalogue-inventory-rollout-plan.md`, change the Inventory row:

```markdown
| 2 | Inventory | [2026-08-15-inventory-office-operator-ui-design.md](../superpowers/specs/2026-08-15-inventory-office-operator-ui-design.md) | [2026-08-15-inventory-office-operator-ui.md](../superpowers/plans/2026-08-15-inventory-office-operator-ui.md) | Implemented |
```

- [ ] **Step 4: Commit**

```bash
git add docs/plans/catalogue-inventory-rollout-plan.md
git commit -m "docs: mark Inventory Office/Operator UI implemented in the rollout tracking doc"
```
