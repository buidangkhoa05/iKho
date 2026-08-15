# Inventory UI — Office Console & Operator Mode

Second of the two sub-projects tracked in [catalogue-inventory-rollout-plan.md](../../plans/catalogue-inventory-rollout-plan.md), and — unlike Catalogue — both frontend tracks are unbuilt: Office Console is still the static placeholder (`office-inventory.ts`, wraps `OfficeScreen` + `ADMIN_SCREENS.inventory`), and Operator Mode is still the literal "not yet designed" `outlinedScreen('inventory')` route. Built as a single combined cycle, following the precedent set by Inbound/Outbound/Returns (each one design spec + plan spanning both tracks), rather than split like Catalogue was.

## Context

`ikho-warehouse-inventory` owns the stock system of record: `StockItem` (the atomic per-bin/lot/serial row — `ProductId`, `WarehouseId`, `BinId`, optional `LotId`/`SerialNumberId`, `OnHandQuantity`/`ReservedQuantity`/`DamagedQuantity`/`QuarantineQuantity`, with `AvailableQuantity` computed as on-hand minus the other three), `StockBalance` (a materialized per-product/warehouse rollup, maintained transactionally alongside every `StockItem` mutation purely for query performance against a real database), `StockLedgerEntry` (append-only history of every quantity-affecting operation), `Lot`/`SerialNumber` (tracking records, one `Lot` per product+lot-number, one `SerialNumber` per product+serial-value representing a single physical unit), and `StockReservation` (a hold against one stock item's available quantity, always resolving to exactly one stock item — splitting a reservation across multiple stock items is out of scope of the backend itself). `Product` (from Catalog) and `Warehouse`/`Bin` (from Organization) are referenced by id only — Inventory owns no product or location master data of its own, per the architecture's domain principles.

Every guard below is copied from the actual backend service code (`StockReceiptsService.cs`, `StockAdjustmentsService.cs`, `StockReservationsService.cs`), not inferred from the DTOs:

- **Receive stock** (`ValidateAndPrepareAsync`, shared by the normal and quarantine variants): `Quantity <= 0` → `ValidationFailed`; else product not found or inactive → `ProductNotFound`; else bin invalid → `BinNotFound`/`BinInvalid`; else if the product is lot-controlled and `LotNumber` is blank → `ValidationFailed`; else if the product is serial-controlled: `SerialNumbers` null/empty → `ValidationFailed`, else count mismatch with `Quantity` → `ValidationFailed`, else duplicate serial values (case-insensitive) → `ValidationFailed`. A serial-controlled receipt creates **one stock item per serial value** (each a distinct physical unit), not one stock item holding the full quantity.
- **Adjust stock**: blank `ReasonCode` → `ValidationFailed`; else stock item not found → `StockItemNotFound`; else `OnHandQuantity + QuantityDelta < 0` → `WouldGoNegative`.
- **Reserve stock**: `Quantity <= 0` → `ValidationFailed`; else no single stock item has enough available quantity → `InsufficientStock` (auto-selects one stock item, FIFO/FEFO-lite — never splits across stock items).
- **Release reservation**: reservation not found → `NotFound`; else `Status !== Active` → `NotActive`.
- **Fulfill reservation**: same not-found/not-active guards as Release, but converts the hold into an actual on-hand decrement (ships the stock) rather than returning it to available.

This is a workflow-heavy module (movements against stock, not CRUD over a small reference-data set like Catalogue's Category/Brand/UoM), so `OfficeInventory` follows the same "bypass `<app-office-screen>`" shape as every prior module, but its two sections are "positions you can act on" and "holds you can release," not four parallel entity directories.

## Goals

Turn `/office/inventory` into an actionable stock console: view on-hand/reserved/damaged/quarantine/available per product-warehouse-bin position (with lot/serial detail and full ledger history), receive new stock into a bin, and apply manual quantity adjustments with a reason code — plus view and release active reservations. Turn the Operator Mode inventory route into a real read-only stock lookup screen, matching `operator-catalogue.ts`'s pattern.

## Non-goals

- **No quarantine-receive flow.** The backend's `ReceiveQuarantineAsync` exists to back Returns' `Quarantine` disposition outcome — that trigger already lives in the (already-built) Returns module. Office's "Receive stock" form only calls the normal on-hand receive path.
- **No manual reservation creation.** `ReserveAsync` is called on behalf of outbound execution (a claim against a sales order) — that's Outbound's job. Office only views existing reservations and releases active ones.
- **No `Fulfill` action anywhere in this UI.** Fulfilling a reservation is an execution-time side effect of Outbound shipping stock, not something an admin or operator triggers directly.
- **No Lot/SerialNumber directory screens.** Lot number (+ optional expiration) and serial values are entered inline on the Receive-stock form and displayed inline on the stock item detail panel — there's no backend endpoint to browse them independently of a stock item either.
- **No Bin directory or bin validation against Organization.** Organization's mock UI model (`organization.data.ts`) only goes as deep as Zone/Dock — no Bin/Aisle entities exist there to validate against (the real backend's `Bin` aggregate is out of reach of this cycle). Bin stays a free-text field, matching Inbound's existing `PutawayTask.toBin` convention.
- **No `StockBalance` as its own mutable store signal.** The backend maintains it as a separate table purely for query performance against a real database — the mock computes the same rollups on the fly from `stockItems()`.
- **No delete, no pagination, no modal/dialog.** Standing rule across every module.
- **No changes to `products.data.ts`, `operator-catalogue.ts`, `inbound-store.ts`, `outbound-store.ts`, or any other code still reading the legacy `PRODUCTS` array.** Inventory is additive and references `CatalogStore` (the real product store Catalogue's cycle introduced) fresh — it does not touch or migrate any prior module's existing, already-reviewed code.

## Design principle: UX ahead of the backend

Same principle established in Inbound/Outbound/Returns: the mock store's guard outcomes and validation order mirror the real backend service exactly (see Context above), so swapping the mock `InventoryStore` for real `HttpClient` calls later is a mechanical change, not a redesign — components only ever translate an outcome string into bilingual error text, never encode business rules themselves.

## Data model & `InventoryStore`

`inventory.data.ts` — seed data shaped after the backend entities, referencing `CatalogStore`'s products by `sku` and `OrganizationStore`'s warehouses by `code`:

```ts
export interface Lot {
  lotNumber: string;        // unique per product
  expirationDateUtc?: string;
}

export interface SerialNumber {
  serialValue: string;      // unique per product
  status: 'in-stock' | 'reserved' | 'shipped' | 'damaged';
}

export type MovementType = 'receipt' | 'adjustment' | 'reservation' | 'release' | 'shipment' | 'quarantine-receipt';

export interface StockLedgerEntry {
  id: string;
  stockItemId: string;
  movementType: MovementType;
  quantityDelta: number;      // zero for reservation/release, matching the backend
  reasonCode?: string;        // populated for adjustment entries
  referenceType?: string;
  referenceId?: string;
  occurredOnUtc: string;
}

export interface StockItem {
  id: string;
  sku: string;                // FK to CatalogStore Product.sku
  warehouseCode: string;      // FK to OrganizationStore Warehouse.code
  bin: string;                 // free text, not FK-checked
  lot?: Lot;                   // set only for lot-controlled products
  serial?: SerialNumber;       // set only for serial-controlled products (one stock item per unit)
  onHand: number;
  reserved: number;
  damaged: number;
  quarantine: number;
  status: 'in-stock' | 'low-stock' | 'out-of-stock'; // assigned directly in seed/creation, not threshold-derived — same convention as the placeholder it replaces
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

export const STOCK_ITEMS: StockItem[] = [
  // 8 rows, reshaped from INVENTORY_POSITIONS (left untouched — still used by reporting-store.ts)
  // for continuity, remapped to real OrganizationStore warehouse codes (WH-1/WH-3) and bins carried
  // over from PUTAWAY_TASKS where the sku matches; two rows added to exercise lot/serial tracking.
  // Full row-by-row detail in the "Seed data" section below.
];

export const STOCK_LEDGER: StockLedgerEntry[] = [ /* one seed 'receipt' entry per stock item above */ ];

export const STOCK_RESERVATIONS: StockReservation[] = [
  // 2 rows: one 'active' (exercises Release), one 'released' (shows the terminal state rendering correctly)
];
```

`InventoryStore` (`providedIn: 'root'`) exposes `stockItems`/`ledger`/`reservations` as readonly signals seeded from the arrays above, plus guarded mutations mirroring the backend's own outcomes and exact validation order:

- `receiveStock(input: { sku: string; warehouseCode: string; bin: string; quantity: number; lotNumber?: string; expirationDateUtc?: string; serialNumbers?: string[] }): 'ok' | 'invalid' | 'product-not-found' | 'lot-required' | 'serial-required' | 'serial-count-mismatch' | 'duplicate-serial'` — validates in the exact order documented in Context: quantity > 0 → product exists and is active (via `CatalogStore.products()`) → lot-required if the product is lot-controlled and blank → serial-required/count-mismatch/duplicate if serial-controlled. Finds-or-creates the matching stock item (by sku+warehouse+bin+lot, or one new stock item per serial value), appends a `'receipt'` ledger entry per unit affected.
- `adjustStock(stockItemId: string, input: { quantityDelta: number; reasonCode: string; notes: string }): 'ok' | 'invalid' | 'not-found' | 'would-go-negative'` — blank reason code → `'invalid'`; stock item not found → `'not-found'`; `onHand + quantityDelta < 0` → `'would-go-negative'`; else applies the delta and appends an `'adjustment'` ledger entry carrying the reason code.
- `releaseReservation(id: string): 'ok' | 'not-found' | 'not-active'` — moves the held quantity from the stock item's `reserved` back to available (i.e. just decrements `reserved`), sets the reservation `'released'`, appends a zero-delta `'release'` ledger entry, matching the backend's on-hand-untouched semantics.

All mutations are plain signal updates — no async, no `HttpClient`, matching every prior store.

### Seed data

| SKU | Warehouse | Bin | Lot / Serial | On hand | Reserved | Damaged | Quarantine | Status |
|---|---|---|---|---|---|---|---|---|
| IKH-482910 | WH-1 | A-12-04 | — | 240 | 40 | 0 | 0 | in-stock |
| IKH-330298 | WH-1 | A-04-09 | Lot LOT-2026-0392 | 60 | 12 | 0 | 0 | low-stock |
| IKH-770145 | WH-1 | B-02-01 | — | 0 | 0 | 0 | 0 | out-of-stock |
| IKH-105522 | WH-3 | C-01-02 | — | 1840 | 300 | 4 | 20 | in-stock |
| IKH-664120 | WH-1 | A-04-02 | Lot LOT-2026-0401 | 18 | 6 | 0 | 6 | low-stock |
| IKH-318440 | WH-3 | A-11-06 | Lot LOT-2026-0410 | 34 | 10 | 0 | 0 | low-stock |
| IKH-201884 | WH-1 | D-01-01 | Serial SN-VDB-0001 | 1 | 0 | 0 | 0 | in-stock |
| IKH-201884 | WH-1 | D-01-01 | Serial SN-VDB-0002 | 1 | 1 | 0 | 0 | in-stock |

`IKH-201884` (Hand pallet truck — seeded serial-controlled in Catalogue) gets two stock item rows, one per physical unit, matching the backend's one-stock-item-per-serial modeling; the second is seeded with `reserved: 1` so it also backs a seeded active `StockReservation`. `IKH-330298`/`IKH-664120`/`IKH-318440` (seeded lot-controlled in Catalogue) each carry a `Lot`. `IKH-770145` is the seeded out-of-stock row, giving the status badge and Adjust's `would-go-negative` guard something real to exercise (a negative delta larger than 0 on-hand). Every row gets one seed `'receipt'` ledger entry dated at `createdOnUtc`.

## Office Console — `OfficeInventory` screen

Route: `/office/inventory`, replacing the current placeholder in-place (rewrites the file's contents, same as Catalogue).

Layout, top to bottom:

1. **Header** — title/meta, plus a primary action that follows the active section: "Receive stock" (Stock Positions only — Reservations has no create flow, since reservations are only ever created by Outbound). Toggles the Receive-stock inline create-panel.
2. **KPI row** — 4 `lib-kpi-card` tiles computed live from `InventoryStore`: Total on-hand (sum of `onHand` across all stock items), Total available (sum of the computed `onHand - reserved - damaged - quarantine` per item), Total reserved (sum of `reserved`), Active reservations (count where `status === 'active'`).
3. **Section toggle** — two buttons, "Stock Positions" / "Reservations" (2-way, same pattern as Billing's toggle). Switching sections resets both create-panel and both detail-panel selections, per the standing lesson from Billing's final review (F4).
4. **Stock Positions section**: search box (matches SKU, product name, bin, or lot/serial value) → `lib-data-panel` + `lib-data-table` — columns: SKU (mono), Product name (resolved via `CatalogStore`), Warehouse (resolved name via `OrganizationStore`), Bin (mono), Lot/Serial (lot number or serial value, whichever is set, else `—`), On hand, Reserved, Available (computed), Status (badge). Row click opens `StockItemDetailPanel`. Create-panel ("Receive stock"): Product picker (active products from `CatalogStore`), Warehouse picker (active warehouses from `OrganizationStore`), Bin text input, Quantity number input, then — conditionally, driven by the picked product's `isLotControlled`/`isSerialControlled` flags — a Lot Number input (+ optional expiration date) or a repeatable Serial Numbers input, Save/Cancel.
5. **`StockItemDetailPanel`** (custom component, not the shared `OfficeDetailPanel` — needs a quantity breakdown plus two independent actions, which the shared single-action panel can't support): SKU/product-name/bin header with status badge; a read-only quantity breakdown (on hand / reserved / damaged / quarantine / available); an inline "Adjust" expand-form (signed quantity delta number input, reason-code dropdown seeded with `CYCLE_COUNT`/`DAMAGE`/`SHRINKAGE`/`FOUND`, notes textarea, Save/Cancel) that client-side validates a blank reason code and `onHand + delta < 0` before calling the store, surfacing the store's own `'would-go-negative'`/`'invalid'` outcome as a fallback error; below that, a read-only **Ledger** list (movement type, signed delta, reason if present, occurred-on date), newest first.
6. **Reservations section**: search box (matches SKU or product name) → table — columns: SKU (mono), Product name, Warehouse, Quantity, Status (badge: active/released/fulfilled), Reference (type + id, or `—`). Row click opens a small reservation detail panel (same custom-component approach as `StockItemDetailPanel`, much shorter) showing the same fields, plus — only when `status === 'active'` — a "Release" button wired to `releaseReservation`.

## Operator Mode — `OperatorInventory` screen

Replaces the `outlinedScreen('inventory')` entry in `operator.routes.ts` with a real `loadComponent`. Read-only stock lookup, following `operator-catalogue.ts`'s exact structure: a search box (matches SKU, product name, or bin) over `InventoryStore.stockItems()`, each result rendered as a dark `canvas-operator-elevated` card — product name, SKU + status badge, and a line showing bin, lot/serial (if any), and on-hand/available quantity, matching the density and visual language of the existing operator catalogue cards. No mutations, no Adjust action from the floor — same read-only shape Catalogue's operator screen already established, just over stock instead of product master data.

## Mock data & testing

Same conventions as every prior module: colocated `.spec.ts`, `TestBed` + real store injection, no mocks. `InventoryStore.spec.ts` covers `receiveStock`'s full validation order exactly as documented in Context (product-not-found → lot-required → serial-required → serial-count-mismatch → duplicate-serial, and the one-stock-item-per-serial-unit creation), `adjustStock`'s invalid/not-found/would-go-negative guards, and `releaseReservation`'s not-found/not-active guards — plus the seeded "IKH-201884 has two stock items, one per serial" and "IKH-770145 is out-of-stock so a larger negative adjustment is rejected" scenarios. `OfficeInventory.spec.ts` covers KPI computation against seed data, the 2-way section toggle (including that switching sections clears every open form), per-section search, the Receive-stock flow's conditional lot/serial fields, the Adjust flow's error surfacing, and Reservation release. `OperatorInventory.spec.ts` covers search matching across SKU/name/bin and the empty-state — `operator-catalogue.ts` itself has no colocated spec today, so this is new coverage, not a mirror of existing tests.
