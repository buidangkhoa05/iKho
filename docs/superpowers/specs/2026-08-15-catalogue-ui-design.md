# Catalogue UI — Office Console

First of two sub-projects decomposed from "close the gap on the last two placeholder screens" (see [catalogue-inventory-rollout-plan.md](../../plans/catalogue-inventory-rollout-plan.md)). Catalogue is an independent backend subsystem (`ikho-warehouse-catalog`) with an existing Operator Mode counterpart (`operator-catalogue.ts`, already a real built screen — read-only product search, not touched by this cycle).

## Context

`ikho-warehouse-catalog` owns `Product` (the central entity — `Sku`, `Name`, `Description`, optional `CategoryId`/`BrandId`/`DefaultUomId` FKs, `IsLotControlled`/`IsSerialControlled` flags, `IsActive`, `CreatedOnUtc`, an add-only `Barcodes` collection) plus three lightweight reference entities: `Category`, `Brand`, `UnitOfMeasure` (each just `Code`, `Name`, `IsActive`). No delete endpoint exists anywhere in this service. `Product.IsActive` is toggled via a separate `PATCH /{id}/status` call (mirrors Organization's Warehouse); `Category`/`Brand`/`UnitOfMeasure` fold `IsActive` into their own `Update` call (mirrors Partners). `Barcode` has no status field and no remove endpoint — purely add-only, and its `Code` is unique **globally**, not per-product.

Every guard below is copied from the actual backend service code (`ProductsService.cs`, `CategoriesService.cs`, `BrandsService.cs`, `UnitsOfMeasureService.cs`), not inferred from the DTOs:

- **`Category`/`Brand`/`UnitOfMeasure` create**: blank `Code`/`Name` → `'invalid'`; else `Code` already in use → `'duplicate-code'`.
- **`Category`/`Brand`/`UnitOfMeasure` update**: blank `Name` → `'invalid'`; else entity not found → `'not-found'`; else updates `Name`+`IsActive` together (a no-op update is still accepted, matching every prior module's pattern of returning `'ok'` even when nothing actually changed).
- **`Product` create**: blank `Sku`/`Name` → `'invalid'`; else `CategoryId` (if given) not found → `'category-not-found'`; else `BrandId` (if given) not found → `'brand-not-found'`; else `DefaultUomId` (if given) not found → `'uom-not-found'`; else `Sku` already in use → `'duplicate-sku'`. **The FK-existence checks run before the SKU-uniqueness check** — the reverse order from what Billing's `addInvoice` does (there, the uniqueness-adjacent check came after the FK checks too, but Billing has no create-time uniqueness check on its own primary key at all, since invoice codes are store-assigned; Catalogue's `Sku` is caller-supplied, so this is the first module where a caller-supplied primary key collides with FK-existence checks, and the order matters for fidelity).
- **`Product` update**: blank `Name` → `'invalid'`; else product not found → `'not-found'`; else the same three FK-existence checks in the same order (category → brand → uom).
- **`Product` status toggle**: no-op if the requested status already matches (matches the backend's own no-op guard against redundant events).
- **`Barcode` add**: product not found → `'not-found'`; else `Code` already registered (**globally**, across every product, not scoped to the target product) → `'duplicate-code'`.

The current placeholder (`ADMIN_SCREENS.catalogue`) has four tabs (Products, Categories, Brands, Units of measure) that this spec's seed data builds on for continuity — but three of its columns have no backing field anywhere in the real domain model and are dropped rather than invented: Brand's "primary supplier"/"lead time", UoM's "type"/"factor", and Product/Category's "on hand"/"reorder point"/"below reorder point" (`Product` carries no quantity field at all — stock is Inventory's domain, out of scope until that module's own rollout cycle).

`OfficeCatalogue` does **not** wrap `<app-office-screen>` — even the simplest entity here (Category/Brand/UnitOfMeasure) needs a detail panel with two independent actions (edit name, toggle status), which `OfficeScreen`'s single-action detail panel can't support.

**No coupling to Billing.** Billing's `LineItemsBuilder` already imports the static `PRODUCTS` mock array (`core/mock-data/products.data.ts`) directly by SKU for its product picker. `CatalogStore` is a fully independent store with its own seed data (matching `PRODUCTS`' content for continuity, but reshaped into the real domain's `{sku, name, categoryCode, brandCode, ...}` shape). Billing's existing, already-reviewed code is not touched by this cycle.

## Goals

Turn `/office/catalogue` into an actionable directory across all four entities: create/edit/status-toggle products (with Category/Brand/UnitOfMeasure pickers sourced from existing active directory entries, lot/serial-control flags, an add-only Barcodes sub-list) and create/edit/status-toggle categories, brands, and units of measure — all backed by a mutable mock `CatalogStore` enforcing the exact guard order documented above.

## Non-goals

- **No delete anywhere.** The backend exposes no delete endpoint for any of the four entities.
- **No remove-barcode.** The backend only supports adding a barcode; there is no remove endpoint.
- **No inventory/stock fields on Product** (on hand, reserved, reorder point). Out of scope until the Inventory module of this same rollout — `Product` itself has no quantity field, correctly separated per the architecture.
- **No inline "+ New category/brand/uom" inside the Product create/edit form.** Unlike Organization's Company picker (deliberately lightweight because Company had no dedicated directory of its own), Category/Brand/UnitOfMeasure each get a full directory tab in this same cycle — the product form only picks from existing *active* entries in each.
- **No modal/dialog, no pagination.** Matches every prior module.
- **No barcode format validation** beyond the blank-check — the backend doesn't validate barcode format either, only uniqueness.
- **No changes to `operator-catalogue.ts` or Billing's `LineItemsBuilder`/`products.data.ts`.** Both are already real, already-reviewed code untouched by this cycle.

## Data model & `CatalogStore`

`catalogue.data.ts` — seed data shaped after the backend entities, using display-friendly mock codes instead of GUIDs:

```ts
export interface Category {
  code: string;        // e.g. 'RACK' — globally unique
  name: string;
  isActive: boolean;
}

export interface Brand {
  code: string;         // e.g. 'VDB' — globally unique
  name: string;
  isActive: boolean;
}

export interface UnitOfMeasure {
  code: string;         // e.g. 'EA' — globally unique
  name: string;
  isActive: boolean;
}

export interface Barcode {
  code: string;          // globally unique across every product's barcodes
}

export interface Product {
  sku: string;            // e.g. 'IKH-482910' — row/reference key, globally unique
  name: string;
  description: string;
  categoryCode?: string;  // FK to Category.code
  brandCode?: string;     // FK to Brand.code
  defaultUomCode?: string; // FK to UnitOfMeasure.code
  isLotControlled: boolean;
  isSerialControlled: boolean;
  isActive: boolean;
  createdOnUtc: string;
  barcodes: Barcode[];
}

export const CATEGORIES: Category[] = [
  { code: 'RACK', name: 'Racking', isActive: true },
  { code: 'CONS', name: 'Consumables', isActive: true },
  { code: 'PACK', name: 'Packaging', isActive: true },
  { code: 'EQIP', name: 'Equipment', isActive: false },
  // Equipment is seeded inactive despite two active products still referencing it (below) —
  // deactivating a category doesn't retroactively invalidate existing product assignments,
  // it only blocks *new* ones (matches the "no cascade" behavior established in Organization).
];

export const BRANDS: Brand[] = [
  { code: 'VDB', name: 'Vanderberg', isActive: true },
  { code: 'NLB', name: 'Nordic Labels', isActive: true },
  { code: 'EPL', name: 'EuroPallet', isActive: false },
  { code: 'KTX', name: 'Kartonex', isActive: true },
  { code: 'WRL', name: 'Wrapline', isActive: true },
  { code: 'SCT', name: 'ScanTech', isActive: true },
];

export const UNITS_OF_MEASURE: UnitOfMeasure[] = [
  { code: 'EA', name: 'Each', isActive: true },
  { code: 'ROL', name: 'Roll', isActive: true },
  { code: 'BOX', name: 'Box of 12', isActive: true },   // seeded but unused by any product today
  { code: 'PAL', name: 'Pallet of 480', isActive: false }, // seeded, unused, and inactive
];

export const PRODUCTS: Product[] = [
  // 10 rows, reshaped from the current products.data.ts placeholder's content for continuity —
  // full row-by-row detail in the "Seed data" section below.
];
```

`CatalogStore` (`providedIn: 'root'`) exposes `categories`/`brands`/`unitsOfMeasure`/`products` as readonly signals seeded from the arrays above, plus guarded mutations mirroring the backend's own outcomes and exact validation order:

- `addCategory(input: { code: string; name: string }): 'ok' | 'invalid' | 'duplicate-code'`
- `updateCategory(code: string, input: { name: string; isActive: boolean }): 'ok' | 'invalid' | 'not-found'`
- `addBrand(input: { code: string; name: string }): 'ok' | 'invalid' | 'duplicate-code'`
- `updateBrand(code: string, input: { name: string; isActive: boolean }): 'ok' | 'invalid' | 'not-found'`
- `addUom(input: { code: string; name: string }): 'ok' | 'invalid' | 'duplicate-code'`
- `updateUom(code: string, input: { name: string; isActive: boolean }): 'ok' | 'invalid' | 'not-found'`
- `addProduct(input: { sku: string; name: string; description: string; categoryCode?: string; brandCode?: string; defaultUomCode?: string; isLotControlled: boolean; isSerialControlled: boolean }): 'ok' | 'invalid' | 'category-not-found' | 'brand-not-found' | 'uom-not-found' | 'duplicate-sku'` — validates in the exact order documented in Context: blank sku/name → category exists (if given) → brand exists (if given) → uom exists (if given) → sku uniqueness.
- `updateProduct(sku: string, input: { name: string; description: string; categoryCode?: string; brandCode?: string; defaultUomCode?: string; isLotControlled: boolean; isSerialControlled: boolean }): 'ok' | 'invalid' | 'not-found' | 'category-not-found' | 'brand-not-found' | 'uom-not-found'`
- `setProductStatus(sku: string, isActive: boolean): void` — no-op if unchanged.
- `addBarcode(sku: string, input: { code: string }): 'ok' | 'invalid' | 'not-found' | 'duplicate-code'` — the duplicate-code check scans **all** products' barcodes, not just the target product's.

All mutations are plain signal updates (`this.products.update(...)` etc.) — no async, no `HttpClient`, matching every prior store.

### Seed data

The 10 products carry over from the current `products.data.ts` placeholder, reshaped into the real domain (the old `tracking` field maps to the two boolean flags; the old `status`/`bin`/`qty`/`reorder` fields are dropped as Inventory's domain, per the Non-goals section):

| SKU | Name | Category | Brand | UoM | Lot | Serial | Active | Barcode |
|---|---|---|---|---|---|---|---|---|
| IKH-482910 | Steel shelving bracket, 400mm | RACK | VDB | EA | ✓ | | ✓ | 8712345482910 |
| IKH-330298 | Barcode label roll, 100×50mm | CONS | NLB | ROL | ✓ | | ✓ | 8712345330298 |
| IKH-770145 | Euro pallet, heat-treated | PACK | EPL | EA | | | ✓ | 8712345770145 |
| IKH-105522 | Corrugated box, 305×229×229mm | PACK | KTX | EA | | | ✓ | 8712345105522 |
| IKH-664120 | Pallet wrap film, 500mm | CONS | WRL | ROL | ✓ | | ✓ | 8712345664120 |
| IKH-201884 | Hand pallet truck, 2.5t | EQIP | VDB | EA | | ✓ | ✓ | 8712345201884 |
| IKH-559071 | Void fill paper, 380mm | PACK | KTX | EA | | | ✓ | 8712345559071 |
| IKH-318440 | Shelf divider, 600mm | RACK | VDB | EA | ✓ | | ✓ | 8712345318440 |
| IKH-902316 | Handheld scanner, 2D | EQIP | SCT | EA | | ✓ | ✓ | 8712345902316 |
| IKH-447203 | Thermal ribbon, 110mm | CONS | NLB | ROL | ✓ | | **✗** | 8712345447203 |

`IKH-447203` is the one seeded-inactive product, giving `setProductStatus`'s already-inactive no-op guard and the Products table's status-badge filtering something real to exercise. `EQIP` (inactive category) and `EPL` (inactive brand) are each still referenced by an active product above — the deliberate "no cascade" case described in the Data model section.

## Office Console — `OfficeCatalogue` screen

Route: `/office/catalogue`, replacing the current placeholder in-place (the file already exists at its final path — this cycle rewrites its contents rather than swapping a route).

Layout, top to bottom:

1. **Header** — title/meta, plus a primary action that follows the active section: "New product" / "New category" / "New brand" / "New unit of measure". Toggles that section's inline create-panel above its table.
2. **KPI row** — 4 `lib-kpi-card` tiles computed live from `CatalogStore`: Active SKUs (count of products where `isActive`), Categories (total directory size — `categories.length`, active and inactive both counted, matching the placeholder's original "Categories: 4"), Brands (total directory size — `brands.length`), Lot-controlled (count of products where `isLotControlled`, regardless of the product's own active status). Replaces the placeholder's non-backed "Below reorder point" with Brands, for symmetry with Categories.
3. **Section toggle** — four buttons, "Products" / "Categories" / "Brands" / "Units of Measure", driving an `activeSection` signal (same pattern as Billing's two-way toggle, scaled to four). Only the active section's search/table/detail-panel/create-panel renders below; switching sections resets every create-panel and detail-panel selection to a clean slate (the exact lesson from Billing's own final review, F4).
4. **Products section**: search box (matches SKU or name) → `lib-data-panel` + `lib-data-table` — columns: SKU (mono), Name, Category (name), Brand (name), UoM (code, mono), Status (badge). Row click opens `ProductDetailPanel`. Create-panel: SKU/Name/Description text inputs, Category/Brand/UoM pickers (dropdown of existing *active* entries plus a blank "None" option, since all three FKs are optional), Lot-controlled/Serial-controlled checkboxes, Save/Cancel.
5. **`ProductDetailPanel`** (custom component, not the shared `OfficeDetailPanel`): SKU/name/status-badge header; an inline "Edit" toggle covering name/description/category/brand/uom pickers/lot-serial flags together (one edit mode, not per-field); an Activate/Deactivate button; a Barcodes list (each row: the code, mono) with an inline "Add barcode" expand-form (single Code input, Save/Cancel).
6. **Categories / Brands / Units of Measure sections**: each is a search box (matches code or name) → table (Code mono, Name, Status badge) → row click opens the **shared** `ReferenceEntityDetailPanel` component — code/name header, status badge, inline "Edit name", Activate/Deactivate. Parameterized by bilingual label inputs (eyebrow text, section-specific copy) and wired by the parent to whichever store method (`updateCategory`/`updateBrand`/`updateUom`) that section calls, the same "one component, multiple call sites" pattern Organization used for `WarehouseDetailPanel`'s zone/dock outputs. Each section's create-panel is a small inline form directly in `OfficeCatalogue` (Code/Name inputs, Save/Cancel) — kept inline rather than extracted, since three two-field forms are too small to justify a shared component the way the richer detail panel was.

## Testing

Same conventions as every prior module: colocated `.spec.ts`, `TestBed` + real store injection, no mocks. `CatalogStore.spec.ts` covers every mutation's full validation order exactly as documented in Context (including Product's FK-checks-before-sku-uniqueness order, and barcode's *global* uniqueness scope, and the "inactive category still referenced by an active product" seed scenario). `OfficeCatalogue.spec.ts` covers KPI computation against the seed data, the 4-way section toggle (including that switching sections clears every open form, per Billing's F4 lesson), per-section search, all four create flows, the product detail panel's barcode add/list, and the shared `ReferenceEntityDetailPanel` reused correctly across Category/Brand/UoM sections — plus an explicit append-and-clear assertion on every form, the standing lesson from Partners' original final review.
