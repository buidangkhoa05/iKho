# Catalogue UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn `/office/catalogue` into an actionable directory backed by a mock `CatalogStore`, replacing the static `OfficeScreen`+`ADMIN_SCREENS` placeholder: create/edit/status-toggle products (with Category/Brand/UnitOfMeasure pickers and an add-only Barcodes sub-list) and create/edit/status-toggle categories, brands, and units of measure — mirroring `ikho-warehouse-catalog`'s exact validation order for every mutation.

**Architecture:** `OfficeCatalogue` bypasses `OfficeScreen` (same as every prior module) and composes `lib-data-panel`/`lib-data-table`/`lib-kpi-card` directly. A 4-way section-toggle signal switches between Products/Categories/Brands/Units-of-Measure, each with its own table, detail panel, and create panel. `ProductDetailPanel` is a custom component (name/description/pickers/flags edit, status toggle, add-only Barcodes list). `ReferenceEntityDetailPanel` is a single shared component reused across Categories, Brands, and Units of Measure — all three share an identical `{code, name, isActive}` shape and identical guard rules, so one generic component (parameterized by a bundled labels input) replaces what would otherwise be three near-duplicate components, the same reasoning Billing used for its shared `LineItemsBuilder`.

**Tech Stack:** Angular 19 standalone components, Signals (no RxJS), Tailwind v4 utility classes, `vitest-angular`, `@ikho/shared-ui` (`DataPanel`, `DataTable`, `KpiCard`, `TextInput`, `Button`, `StatusBadge`, `Icon`). No `HttpClient` — plain in-memory signal store seeded from static mock data.

## Global Constraints

- **`@angular-eslint/no-output-native`**: no Angular `output()` may be named `close` — use `closePanel`.
- **`DataTable.rows` typing**: any row interface bound to `lib-data-table`'s `[rows]` must `extends Record<string, unknown>`.
- **`DataTable.emptyLabel`**: always bind `[emptyLabel]` to a bilingual `t()` key — never leave it to the component's hardcoded English default (`'No results'`).
- **Store owns validation, in the backend's exact order.** Every guard in `CatalogStore` mirrors its corresponding backend service method's validation order precisely, as documented in the design spec's Context section (verified against the actual `.cs` files, not the DTOs). In particular: `Product` create/update check the three optional FK references (category → brand → uom) **before** the SKU-uniqueness check on create — this order matters and must not be silently reordered "for consistency" with other modules. Components only translate outcome strings into bilingual error text — they never duplicate the guard logic itself, beyond the same client-side blank-check pattern established in every prior module (validate obviously-required fields before making the store call, never a *substitute* for the store's own check).
- **Every mutation's outcome must be surfaced to the UI**, never discarded. Every `submit*`/`onToggle*` handler must branch on every non-`'ok'` outcome and call the relevant `setXError` method on the child panel via a `viewChild` reference.
- **`effect()` reset pattern**: any detail panel with local mutable form state must reset ALL of it (visibility flags AND typed field values) via a constructor `effect()` keyed on the `entity`/`product` input signal — not just on selection change, but implicitly on every successful save too, since the store's immutable updates give the input a new object identity on every mutation.
- **Cancel handlers must clear stale state.** Every "Cancel" button must reset the same fields a successful save resets, not just close the form.
- **Switching sections must reset every open form and selection.** The 4-way section toggle must clear all four create-panel forms and all four selected-detail-panel signals when the active section changes — the exact lesson from Billing's final review (finding F4), now a binding rule from the start rather than a fix-round discovery.
- **No delete, no remove-barcode, no pagination, no modal/dialog** anywhere in this module.
- **No forward-references across tasks.** A task's template must never reference a signal/method a *later* task defines — if a header action needs to branch on a section a later task adds, that later task adds its own branch to the conditional rather than the earlier task pre-declaring an empty one. (This was a real bug caught in Billing's plan during pre-flight review; avoided here by construction — see Tasks 5/6's exact instructions.)

---

### Task 1: Catalogue data model & `CatalogStore`

**Files:**
- Create: `source/apps/ikho-ui/src/app/core/mock-data/catalogue.data.ts`
- Create: `source/apps/ikho-ui/src/app/core/state/catalogue-store.ts`
- Test: `source/apps/ikho-ui/src/app/core/state/catalogue-store.spec.ts`

**Interfaces:**
- Consumes: nothing (pure new data + store).
- Produces: types `Category`, `Brand`, `UnitOfMeasure`, `Barcode`, `Product` (`catalogue.data.ts`); `CatalogStore` (`providedIn: 'root'`) exposing `categories`/`brands`/`unitsOfMeasure`/`products` readonly signals plus `addCategory`/`updateCategory`, `addBrand`/`updateBrand`, `addUom`/`updateUom`, `addProduct`/`updateProduct`/`setProductStatus`/`addBarcode`, and their input/outcome types. All of Tasks 2–6 depend on these exact names and shapes.

- [ ] **Step 1: Write `catalogue.data.ts`**

```ts
// source/apps/ikho-ui/src/app/core/mock-data/catalogue.data.ts
export interface Category {
  code: string;
  name: string;
  isActive: boolean;
}

export interface Brand {
  code: string;
  name: string;
  isActive: boolean;
}

export interface UnitOfMeasure {
  code: string;
  name: string;
  isActive: boolean;
}

export interface Barcode {
  code: string;
}

export interface Product {
  sku: string;
  name: string;
  description: string;
  categoryCode?: string;
  brandCode?: string;
  defaultUomCode?: string;
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
  // Seeded inactive despite two active products below still referencing it — deactivating a
  // category doesn't retroactively invalidate existing product assignments, it only blocks
  // *new* ones (matches the "no cascade" behavior established in Organization).
  { code: 'EQIP', name: 'Equipment', isActive: false },
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
  { code: 'BOX', name: 'Box of 12', isActive: true },
  { code: 'PAL', name: 'Pallet of 480', isActive: false },
];

export const PRODUCTS: Product[] = [
  { sku: 'IKH-482910', name: 'Steel shelving bracket, 400mm', description: '', categoryCode: 'RACK', brandCode: 'VDB', defaultUomCode: 'EA', isLotControlled: true, isSerialControlled: false, isActive: true, createdOnUtc: '2024-01-15T09:00:00Z', barcodes: [{ code: '8712345482910' }] },
  { sku: 'IKH-330298', name: 'Barcode label roll, 100×50mm', description: '', categoryCode: 'CONS', brandCode: 'NLB', defaultUomCode: 'ROL', isLotControlled: true, isSerialControlled: false, isActive: true, createdOnUtc: '2024-01-20T09:00:00Z', barcodes: [{ code: '8712345330298' }] },
  { sku: 'IKH-770145', name: 'Euro pallet, heat-treated', description: '', categoryCode: 'PACK', brandCode: 'EPL', defaultUomCode: 'EA', isLotControlled: false, isSerialControlled: false, isActive: true, createdOnUtc: '2024-02-01T09:00:00Z', barcodes: [{ code: '8712345770145' }] },
  { sku: 'IKH-105522', name: 'Corrugated box, 305×229×229mm', description: '', categoryCode: 'PACK', brandCode: 'KTX', defaultUomCode: 'EA', isLotControlled: false, isSerialControlled: false, isActive: true, createdOnUtc: '2024-02-10T09:00:00Z', barcodes: [{ code: '8712345105522' }] },
  { sku: 'IKH-664120', name: 'Pallet wrap film, 500mm', description: '', categoryCode: 'CONS', brandCode: 'WRL', defaultUomCode: 'ROL', isLotControlled: true, isSerialControlled: false, isActive: true, createdOnUtc: '2024-03-05T09:00:00Z', barcodes: [{ code: '8712345664120' }] },
  { sku: 'IKH-201884', name: 'Hand pallet truck, 2.5t', description: '', categoryCode: 'EQIP', brandCode: 'VDB', defaultUomCode: 'EA', isLotControlled: false, isSerialControlled: true, isActive: true, createdOnUtc: '2024-03-18T09:00:00Z', barcodes: [{ code: '8712345201884' }] },
  { sku: 'IKH-559071', name: 'Void fill paper, 380mm', description: '', categoryCode: 'PACK', brandCode: 'KTX', defaultUomCode: 'EA', isLotControlled: false, isSerialControlled: false, isActive: true, createdOnUtc: '2024-04-02T09:00:00Z', barcodes: [{ code: '8712345559071' }] },
  { sku: 'IKH-318440', name: 'Shelf divider, 600mm', description: '', categoryCode: 'RACK', brandCode: 'VDB', defaultUomCode: 'EA', isLotControlled: true, isSerialControlled: false, isActive: true, createdOnUtc: '2024-04-20T09:00:00Z', barcodes: [{ code: '8712345318440' }] },
  { sku: 'IKH-902316', name: 'Handheld scanner, 2D', description: '', categoryCode: 'EQIP', brandCode: 'SCT', defaultUomCode: 'EA', isLotControlled: false, isSerialControlled: true, isActive: true, createdOnUtc: '2024-05-05T09:00:00Z', barcodes: [{ code: '8712345902316' }] },
  // Seeded inactive — gives setProductStatus's no-op-if-unchanged guard and the Products
  // table's status filtering something real to exercise.
  { sku: 'IKH-447203', name: 'Thermal ribbon, 110mm', description: '', categoryCode: 'CONS', brandCode: 'NLB', defaultUomCode: 'ROL', isLotControlled: true, isSerialControlled: false, isActive: false, createdOnUtc: '2024-05-20T09:00:00Z', barcodes: [{ code: '8712345447203' }] },
];
```

- [ ] **Step 2: Write `catalogue-store.ts`**

```ts
// source/apps/ikho-ui/src/app/core/state/catalogue-store.ts
import { Injectable, signal } from '@angular/core';
import { BRANDS, Brand, CATEGORIES, Category, PRODUCTS, Product, UNITS_OF_MEASURE, UnitOfMeasure } from '../mock-data/catalogue.data';

export type AddCategoryOutcome = 'ok' | 'invalid' | 'duplicate-code';
export type UpdateCategoryOutcome = 'ok' | 'invalid' | 'not-found';
export type AddBrandOutcome = 'ok' | 'invalid' | 'duplicate-code';
export type UpdateBrandOutcome = 'ok' | 'invalid' | 'not-found';
export type AddUomOutcome = 'ok' | 'invalid' | 'duplicate-code';
export type UpdateUomOutcome = 'ok' | 'invalid' | 'not-found';
export type AddProductOutcome = 'ok' | 'invalid' | 'category-not-found' | 'brand-not-found' | 'uom-not-found' | 'duplicate-sku';
export type UpdateProductOutcome = 'ok' | 'invalid' | 'not-found' | 'category-not-found' | 'brand-not-found' | 'uom-not-found';
export type AddBarcodeOutcome = 'ok' | 'invalid' | 'not-found' | 'duplicate-code';

export interface AddCategoryInput {
  code: string;
  name: string;
}

export interface UpdateCategoryInput {
  name: string;
  isActive: boolean;
}

export interface AddBrandInput {
  code: string;
  name: string;
}

export interface UpdateBrandInput {
  name: string;
  isActive: boolean;
}

export interface AddUomInput {
  code: string;
  name: string;
}

export interface UpdateUomInput {
  name: string;
  isActive: boolean;
}

export interface AddProductInput {
  sku: string;
  name: string;
  description: string;
  categoryCode?: string;
  brandCode?: string;
  defaultUomCode?: string;
  isLotControlled: boolean;
  isSerialControlled: boolean;
}

export interface UpdateProductInput {
  name: string;
  description: string;
  categoryCode?: string;
  brandCode?: string;
  defaultUomCode?: string;
  isLotControlled: boolean;
  isSerialControlled: boolean;
}

export interface AddBarcodeInput {
  code: string;
}

@Injectable({ providedIn: 'root' })
export class CatalogStore {
  readonly categories = signal<Category[]>([...CATEGORIES]);
  readonly brands = signal<Brand[]>([...BRANDS]);
  readonly unitsOfMeasure = signal<UnitOfMeasure[]>([...UNITS_OF_MEASURE]);
  readonly products = signal<Product[]>([...PRODUCTS]);

  addCategory(input: AddCategoryInput): AddCategoryOutcome {
    const code = input.code.trim();
    const name = input.name.trim();
    if (!code || !name) return 'invalid';
    if (this.categories().some((c) => c.code === code)) return 'duplicate-code';

    this.categories.update((list) => [{ code, name, isActive: true }, ...list]);
    return 'ok';
  }

  updateCategory(code: string, input: UpdateCategoryInput): UpdateCategoryOutcome {
    const name = input.name.trim();
    if (!name) return 'invalid';
    if (!this.categories().some((c) => c.code === code)) return 'not-found';

    this.categories.update((list) => list.map((c) => (c.code === code ? { ...c, name, isActive: input.isActive } : c)));
    return 'ok';
  }

  addBrand(input: AddBrandInput): AddBrandOutcome {
    const code = input.code.trim();
    const name = input.name.trim();
    if (!code || !name) return 'invalid';
    if (this.brands().some((b) => b.code === code)) return 'duplicate-code';

    this.brands.update((list) => [{ code, name, isActive: true }, ...list]);
    return 'ok';
  }

  updateBrand(code: string, input: UpdateBrandInput): UpdateBrandOutcome {
    const name = input.name.trim();
    if (!name) return 'invalid';
    if (!this.brands().some((b) => b.code === code)) return 'not-found';

    this.brands.update((list) => list.map((b) => (b.code === code ? { ...b, name, isActive: input.isActive } : b)));
    return 'ok';
  }

  addUom(input: AddUomInput): AddUomOutcome {
    const code = input.code.trim();
    const name = input.name.trim();
    if (!code || !name) return 'invalid';
    if (this.unitsOfMeasure().some((u) => u.code === code)) return 'duplicate-code';

    this.unitsOfMeasure.update((list) => [{ code, name, isActive: true }, ...list]);
    return 'ok';
  }

  updateUom(code: string, input: UpdateUomInput): UpdateUomOutcome {
    const name = input.name.trim();
    if (!name) return 'invalid';
    if (!this.unitsOfMeasure().some((u) => u.code === code)) return 'not-found';

    this.unitsOfMeasure.update((list) => list.map((u) => (u.code === code ? { ...u, name, isActive: input.isActive } : u)));
    return 'ok';
  }

  addProduct(input: AddProductInput): AddProductOutcome {
    const sku = input.sku.trim();
    const name = input.name.trim();
    if (!sku || !name) return 'invalid';
    if (input.categoryCode && !this.categories().some((c) => c.code === input.categoryCode)) return 'category-not-found';
    if (input.brandCode && !this.brands().some((b) => b.code === input.brandCode)) return 'brand-not-found';
    if (input.defaultUomCode && !this.unitsOfMeasure().some((u) => u.code === input.defaultUomCode)) return 'uom-not-found';
    if (this.products().some((p) => p.sku === sku)) return 'duplicate-sku';

    const product: Product = {
      sku,
      name,
      description: input.description.trim(),
      categoryCode: input.categoryCode,
      brandCode: input.brandCode,
      defaultUomCode: input.defaultUomCode,
      isLotControlled: input.isLotControlled,
      isSerialControlled: input.isSerialControlled,
      isActive: true,
      createdOnUtc: new Date().toISOString(),
      barcodes: [],
    };
    this.products.update((list) => [product, ...list]);
    return 'ok';
  }

  updateProduct(sku: string, input: UpdateProductInput): UpdateProductOutcome {
    const name = input.name.trim();
    if (!name) return 'invalid';
    if (!this.products().some((p) => p.sku === sku)) return 'not-found';
    if (input.categoryCode && !this.categories().some((c) => c.code === input.categoryCode)) return 'category-not-found';
    if (input.brandCode && !this.brands().some((b) => b.code === input.brandCode)) return 'brand-not-found';
    if (input.defaultUomCode && !this.unitsOfMeasure().some((u) => u.code === input.defaultUomCode)) return 'uom-not-found';

    this.products.update((list) =>
      list.map((p) =>
        p.sku === sku
          ? {
              ...p,
              name,
              description: input.description.trim(),
              categoryCode: input.categoryCode,
              brandCode: input.brandCode,
              defaultUomCode: input.defaultUomCode,
              isLotControlled: input.isLotControlled,
              isSerialControlled: input.isSerialControlled,
            }
          : p,
      ),
    );
    return 'ok';
  }

  setProductStatus(sku: string, isActive: boolean): void {
    this.products.update((list) => list.map((p) => (p.sku === sku && p.isActive !== isActive ? { ...p, isActive } : p)));
  }

  addBarcode(sku: string, input: AddBarcodeInput): AddBarcodeOutcome {
    const code = input.code.trim();
    if (!code) return 'invalid';
    if (!this.products().some((p) => p.sku === sku)) return 'not-found';
    if (this.products().some((p) => p.barcodes.some((b) => b.code === code))) return 'duplicate-code';

    this.products.update((list) => list.map((p) => (p.sku === sku ? { ...p, barcodes: [...p.barcodes, { code }] } : p)));
    return 'ok';
  }
}
```

- [ ] **Step 3: Write `catalogue-store.spec.ts`**

```ts
// source/apps/ikho-ui/src/app/core/state/catalogue-store.spec.ts
import { TestBed } from '@angular/core/testing';
import { CatalogStore } from './catalogue-store';

describe('CatalogStore', () => {
  let store: CatalogStore;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    store = TestBed.inject(CatalogStore);
  });

  it('seeds 4 categories, 6 brands, 4 units of measure, and 10 products', () => {
    expect(store.categories().length).toBe(4);
    expect(store.brands().length).toBe(6);
    expect(store.unitsOfMeasure().length).toBe(4);
    expect(store.products().length).toBe(10);
  });

  it('keeps an inactive category (EQIP) referenced by two still-active products', () => {
    const equip = store.categories().find((c) => c.code === 'EQIP');
    expect(equip?.isActive).toBe(false);
    const referencing = store.products().filter((p) => p.categoryCode === 'EQIP');
    expect(referencing.length).toBe(2);
    expect(referencing.every((p) => p.isActive)).toBe(true);
  });

  describe('addCategory / updateCategory', () => {
    it('rejects a blank code or name as invalid', () => {
      expect(store.addCategory({ code: '', name: 'Something' })).toBe('invalid');
      expect(store.addCategory({ code: 'NEW', name: '  ' })).toBe('invalid');
    });

    it('rejects a duplicate code', () => {
      expect(store.addCategory({ code: 'RACK', name: 'Duplicate' })).toBe('duplicate-code');
    });

    it('creates a category and prepends it', () => {
      const outcome = store.addCategory({ code: 'ELEC', name: 'Electronics' });
      expect(outcome).toBe('ok');
      expect(store.categories()[0]).toEqual({ code: 'ELEC', name: 'Electronics', isActive: true });
    });

    it('rejects a blank name on update as invalid', () => {
      expect(store.updateCategory('RACK', { name: ' ', isActive: true })).toBe('invalid');
    });

    it('rejects updating an unknown code', () => {
      expect(store.updateCategory('NOPE', { name: 'X', isActive: true })).toBe('not-found');
    });

    it('updates name and isActive together', () => {
      const outcome = store.updateCategory('RACK', { name: 'Racking Systems', isActive: false });
      expect(outcome).toBe('ok');
      const updated = store.categories().find((c) => c.code === 'RACK');
      expect(updated).toEqual({ code: 'RACK', name: 'Racking Systems', isActive: false });
    });
  });

  describe('addBrand / updateBrand', () => {
    it('rejects a blank code or name as invalid', () => {
      expect(store.addBrand({ code: '', name: 'X' })).toBe('invalid');
    });

    it('rejects a duplicate code', () => {
      expect(store.addBrand({ code: 'VDB', name: 'Duplicate' })).toBe('duplicate-code');
    });

    it('creates a brand', () => {
      expect(store.addBrand({ code: 'ACME', name: 'Acme Co' })).toBe('ok');
      expect(store.brands()[0]).toEqual({ code: 'ACME', name: 'Acme Co', isActive: true });
    });

    it('rejects updating an unknown code', () => {
      expect(store.updateBrand('NOPE', { name: 'X', isActive: true })).toBe('not-found');
    });

    it('updates name and isActive together', () => {
      expect(store.updateBrand('EPL', { name: 'EuroPallet BV', isActive: true })).toBe('ok');
      expect(store.brands().find((b) => b.code === 'EPL')).toEqual({ code: 'EPL', name: 'EuroPallet BV', isActive: true });
    });
  });

  describe('addUom / updateUom', () => {
    it('rejects a blank code or name as invalid', () => {
      expect(store.addUom({ code: '', name: 'X' })).toBe('invalid');
    });

    it('rejects a duplicate code', () => {
      expect(store.addUom({ code: 'EA', name: 'Duplicate' })).toBe('duplicate-code');
    });

    it('creates a unit of measure', () => {
      expect(store.addUom({ code: 'KG', name: 'Kilogram' })).toBe('ok');
      expect(store.unitsOfMeasure()[0]).toEqual({ code: 'KG', name: 'Kilogram', isActive: true });
    });

    it('rejects updating an unknown code', () => {
      expect(store.updateUom('NOPE', { name: 'X', isActive: true })).toBe('not-found');
    });

    it('updates name and isActive together', () => {
      expect(store.updateUom('PAL', { name: 'Pallet (480 units)', isActive: true })).toBe('ok');
      expect(store.unitsOfMeasure().find((u) => u.code === 'PAL')).toEqual({ code: 'PAL', name: 'Pallet (480 units)', isActive: true });
    });
  });

  describe('addProduct', () => {
    const valid = { sku: 'IKH-999999', name: 'Test Widget', description: '', isLotControlled: false, isSerialControlled: false };

    it('rejects a blank sku or name as invalid', () => {
      expect(store.addProduct({ ...valid, sku: '' })).toBe('invalid');
      expect(store.addProduct({ ...valid, name: '  ' })).toBe('invalid');
    });

    it('rejects an unknown categoryCode before checking anything else', () => {
      expect(store.addProduct({ ...valid, categoryCode: 'NOPE' })).toBe('category-not-found');
    });

    it('rejects an unknown brandCode', () => {
      expect(store.addProduct({ ...valid, brandCode: 'NOPE' })).toBe('brand-not-found');
    });

    it('rejects an unknown defaultUomCode', () => {
      expect(store.addProduct({ ...valid, defaultUomCode: 'NOPE' })).toBe('uom-not-found');
    });

    it('checks FK references before sku uniqueness — an invalid category on a duplicate sku returns category-not-found, not duplicate-sku', () => {
      const outcome = store.addProduct({ ...valid, sku: 'IKH-482910', categoryCode: 'NOPE' });
      expect(outcome).toBe('category-not-found');
    });

    it('rejects a duplicate sku when all FKs are valid or omitted', () => {
      expect(store.addProduct({ ...valid, sku: 'IKH-482910' })).toBe('duplicate-sku');
    });

    it('creates a product with isActive true, empty barcodes, and accepts blank optional FKs', () => {
      const outcome = store.addProduct(valid);
      expect(outcome).toBe('ok');
      const created = store.products()[0];
      expect(created.sku).toBe('IKH-999999');
      expect(created.isActive).toBe(true);
      expect(created.barcodes).toEqual([]);
      expect(created.categoryCode).toBeUndefined();
    });

    it('creates a product with all three FKs set', () => {
      const outcome = store.addProduct({ ...valid, sku: 'IKH-888888', categoryCode: 'RACK', brandCode: 'VDB', defaultUomCode: 'EA' });
      expect(outcome).toBe('ok');
      const created = store.products().find((p) => p.sku === 'IKH-888888');
      expect(created).toMatchObject({ categoryCode: 'RACK', brandCode: 'VDB', defaultUomCode: 'EA' });
    });
  });

  describe('updateProduct', () => {
    const valid = { name: 'Updated Name', description: 'Updated desc', isLotControlled: true, isSerialControlled: false };

    it('rejects a blank name as invalid', () => {
      expect(store.updateProduct('IKH-482910', { ...valid, name: ' ' })).toBe('invalid');
    });

    it('rejects an unknown sku as not-found, checked before FK validation', () => {
      expect(store.updateProduct('NOPE', { ...valid, categoryCode: 'ALSO-NOPE' })).toBe('not-found');
    });

    it('rejects an unknown categoryCode', () => {
      expect(store.updateProduct('IKH-482910', { ...valid, categoryCode: 'NOPE' })).toBe('category-not-found');
    });

    it('rejects an unknown brandCode', () => {
      expect(store.updateProduct('IKH-482910', { ...valid, brandCode: 'NOPE' })).toBe('brand-not-found');
    });

    it('rejects an unknown defaultUomCode', () => {
      expect(store.updateProduct('IKH-482910', { ...valid, defaultUomCode: 'NOPE' })).toBe('uom-not-found');
    });

    it('updates the product fields', () => {
      const outcome = store.updateProduct('IKH-482910', { ...valid, categoryCode: 'PACK', brandCode: 'KTX', defaultUomCode: 'ROL' });
      expect(outcome).toBe('ok');
      const updated = store.products().find((p) => p.sku === 'IKH-482910');
      expect(updated).toMatchObject({ name: 'Updated Name', description: 'Updated desc', categoryCode: 'PACK', brandCode: 'KTX', defaultUomCode: 'ROL', isLotControlled: true, isSerialControlled: false });
    });
  });

  describe('setProductStatus', () => {
    it('toggles isActive for the matching product only', () => {
      store.setProductStatus('IKH-482910', false);
      expect(store.products().find((p) => p.sku === 'IKH-482910')?.isActive).toBe(false);
      expect(store.products().find((p) => p.sku === 'IKH-330298')?.isActive).toBe(true);
    });

    it('is a no-op when the requested status already matches', () => {
      const before = store.products();
      store.setProductStatus('IKH-447203', false); // already inactive in seed data
      expect(store.products()).toBe(before); // same array reference — update() never ran
    });

    it('is a safe no-op for an unknown sku', () => {
      const before = store.products();
      store.setProductStatus('NOPE', true);
      expect(store.products()).toBe(before);
    });
  });

  describe('addBarcode', () => {
    it('rejects a blank code as invalid', () => {
      expect(store.addBarcode('IKH-482910', { code: ' ' })).toBe('invalid');
    });

    it('rejects an unknown sku', () => {
      expect(store.addBarcode('NOPE', { code: '1234567890123' })).toBe('not-found');
    });

    it('rejects a code already used by the same product', () => {
      expect(store.addBarcode('IKH-482910', { code: '8712345482910' })).toBe('duplicate-code');
    });

    it('rejects a code already used by a DIFFERENT product — uniqueness is global, not per-product', () => {
      expect(store.addBarcode('IKH-330298', { code: '8712345482910' })).toBe('duplicate-code');
    });

    it('adds a barcode to the target product only', () => {
      const outcome = store.addBarcode('IKH-482910', { code: '9999999999999' });
      expect(outcome).toBe('ok');
      const updated = store.products().find((p) => p.sku === 'IKH-482910');
      expect(updated?.barcodes).toEqual([{ code: '8712345482910' }, { code: '9999999999999' }]);
      const other = store.products().find((p) => p.sku === 'IKH-330298');
      expect(other?.barcodes).toEqual([{ code: '8712345330298' }]);
    });
  });
});
```

- [ ] **Step 4: Run the store tests**

Run: `pnpm nx test ikho-ui --skip-nx-cache --include='**/catalogue-store.spec.ts'` (from `source/`)
Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add source/apps/ikho-ui/src/app/core/mock-data/catalogue.data.ts source/apps/ikho-ui/src/app/core/state/catalogue-store.ts source/apps/ikho-ui/src/app/core/state/catalogue-store.spec.ts
git commit -m "feat(ikho-ui): add Catalogue data model and CatalogStore"
```

---

### Task 2: `ReferenceEntityDetailPanel` shared component

**Files:**
- Create: `source/apps/ikho-ui/src/app/features/office/catalogue/reference-entity-detail-panel.ts`
- Test: `source/apps/ikho-ui/src/app/features/office/catalogue/reference-entity-detail-panel.spec.ts`

**Interfaces:**
- Consumes: nothing new (pure presentational component with generic `{code, name, isActive}` input).
- Produces: `ReferenceEntity` interface (`{code: string; name: string; isActive: boolean}`), `ReferenceEntityLabels` interface (bundles every bilingual string the component needs, so the parent passes one object instead of a dozen separate inputs), `ReferenceEntityDetailPanel` (selector `app-reference-entity-detail-panel`) with `entity = input.required<ReferenceEntity>()`, `labels = input.required<ReferenceEntityLabels>()`, outputs `closePanel: output<void>()`, `toggleStatus: output<void>()`, `saveDetails: output<{name: string}>()`, and public method `setDetailsError(message: string): void`. Task 6 mounts this component three times (Categories, Brands, Units of Measure), each with its own `labels` object and wired to its own store methods.

- [ ] **Step 1: Write the failing spec**

```ts
// source/apps/ikho-ui/src/app/features/office/catalogue/reference-entity-detail-panel.spec.ts
import { TestBed } from '@angular/core/testing';
import { ReferenceEntityDetailPanel, ReferenceEntityLabels } from './reference-entity-detail-panel';

const TEST_LABELS: ReferenceEntityLabels = {
  eyebrow: 'Category detail',
  name: 'Name',
  save: 'Save',
  cancel: 'Cancel',
  edit: 'Edit name',
  active: 'Active',
  inactive: 'Inactive',
  activate: 'Activate',
  deactivate: 'Deactivate',
  close: 'Close',
  requiredError: 'Name is required.',
};

describe('ReferenceEntityDetailPanel', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [ReferenceEntityDetailPanel] }).compileComponents();
  });

  function create(entity = { code: 'RACK', name: 'Racking', isActive: true }) {
    const fixture = TestBed.createComponent(ReferenceEntityDetailPanel);
    fixture.componentRef.setInput('entity', entity);
    fixture.componentRef.setInput('labels', TEST_LABELS);
    fixture.detectChanges();
    return fixture;
  }

  it('renders the code, name, eyebrow, and Active status', () => {
    const fixture = create();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('RACK');
    expect(text).toContain('Racking');
    expect(text).toContain('Category detail');
    expect(text).toContain('Active');
  });

  it('renders Inactive status for an inactive entity', () => {
    const fixture = create({ code: 'EQIP', name: 'Equipment', isActive: false });
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Inactive');
  });

  it('closePanel emits when the close button is clicked', () => {
    const fixture = create();
    let emitted = false;
    fixture.componentInstance.closePanel.subscribe(() => (emitted = true));
    (fixture.nativeElement as HTMLElement).querySelector('button[aria-label]')?.dispatchEvent(new Event('click', { bubbles: true }));
    expect(emitted).toBe(true);
  });

  it('toggleStatus emits when the activate/deactivate button is clicked', () => {
    const fixture = create();
    let emitted = false;
    fixture.componentInstance.toggleStatus.subscribe(() => (emitted = true));
    const buttons = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button'));
    buttons.find((b) => b.textContent?.includes('Deactivate'))?.click();
    expect(emitted).toBe(true);
  });

  it('saveDetails emits the trimmed name on a valid edit, and rejects a blank name', () => {
    const fixture = create();
    const instance = fixture.componentInstance as unknown as {
      startEdit: () => void;
      editName: { set: (v: string) => void };
      submitDetails: () => void;
    };
    let payload: { name: string } | undefined;
    fixture.componentInstance.saveDetails.subscribe((v) => (payload = v));

    instance.startEdit();
    instance.editName.set('');
    instance.submitDetails();
    expect(payload).toBeUndefined();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Name is required.');

    instance.editName.set('  Racking Systems  ');
    instance.submitDetails();
    expect(payload).toEqual({ name: 'Racking Systems' });
  });

  it('resets edit state when the entity input changes identity, including after a successful save', () => {
    const fixture = create();
    const instance = fixture.componentInstance as unknown as {
      startEdit: () => void;
      editName: { set: (v: string) => void; (): string };
      editing: () => boolean;
    };
    instance.startEdit();
    instance.editName.set('Something typed');
    expect(instance.editing()).toBe(true);

    fixture.componentRef.setInput('entity', { code: 'RACK', name: 'Racking Systems', isActive: true });
    fixture.detectChanges();

    expect(instance.editing()).toBe(false);
    expect(instance.editName()).toBe('');
  });

  it('setDetailsError surfaces a store-side outcome on the open edit form', () => {
    const fixture = create();
    const instance = fixture.componentInstance as unknown as { startEdit: () => void };
    instance.startEdit();
    fixture.componentInstance.setDetailsError("Code 'RACK' is already in use.");
    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain("Code 'RACK' is already in use.");
  });
});
```

- [ ] **Step 2: Run the spec to verify it fails**

Run: `pnpm nx test ikho-ui --skip-nx-cache --include='**/reference-entity-detail-panel.spec.ts'` (from `source/`)
Expected: FAIL — the component does not exist yet.

- [ ] **Step 3: Implement `ReferenceEntityDetailPanel`**

```ts
// source/apps/ikho-ui/src/app/features/office/catalogue/reference-entity-detail-panel.ts
import { ChangeDetectionStrategy, Component, effect, input, output, signal } from '@angular/core';
import { Button, Icon, StatusBadge, TextInput } from '@ikho/shared-ui';

export interface ReferenceEntity {
  code: string;
  name: string;
  isActive: boolean;
}

export interface ReferenceEntityLabels {
  eyebrow: string;
  name: string;
  save: string;
  cancel: string;
  edit: string;
  active: string;
  inactive: string;
  activate: string;
  deactivate: string;
  close: string;
  requiredError: string;
}

@Component({
  selector: 'app-reference-entity-detail-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Button, Icon, StatusBadge, TextInput],
  host: { class: 'block' },
  template: `
    <aside class="flex w-96 flex-none flex-col gap-4 rounded-card border border-hairline-light bg-canvas-light p-6 shadow-card">
      <div class="flex items-start justify-between gap-3">
        <div class="flex min-w-0 flex-col gap-1">
          <span class="font-core text-[11px] font-bold tracking-[0.5px] text-shade-50 uppercase">{{ labels().eyebrow }}</span>
          <span class="font-mono text-[13px] text-primary">{{ entity().code }}</span>
          <span class="font-core text-lg font-bold tracking-[-0.2px] text-ink">{{ entity().name }}</span>
        </div>
        <button
          type="button"
          class="inline-flex size-8 flex-none cursor-pointer items-center justify-center rounded-md border-none bg-transparent hover:bg-surface-elevated-light"
          [attr.aria-label]="labels().close"
          (click)="closePanel.emit()"
        >
          <lib-icon name="x" [size]="18" color="var(--color-shade-50)" />
        </button>
      </div>

      <lib-status-badge [status]="entity().isActive ? 'in-stock' : 'out-of-stock'" [label]="entity().isActive ? labels().active : labels().inactive" />

      <div class="flex flex-col gap-2.5 border-t border-hairline-light pt-4">
        @if (editing()) {
          <lib-text-input [label]="labels().name" [value]="editName()" (valueChange)="editName.set($event)" />
          @if (editError(); as err) {
            <span class="font-core text-xs text-status-out-of-stock">{{ err }}</span>
          }
          <div class="flex gap-2">
            <lib-button variant="primary" (click)="submitDetails()">{{ labels().save }}</lib-button>
            <lib-button variant="ghost" (click)="cancelEdit()">{{ labels().cancel }}</lib-button>
          </div>
        } @else {
          <lib-button variant="secondary" (click)="startEdit()">{{ labels().edit }}</lib-button>
        }
      </div>

      <lib-button variant="primary" [fullWidth]="true" (click)="toggleStatus.emit()">
        {{ entity().isActive ? labels().deactivate : labels().activate }}
      </lib-button>
    </aside>
  `,
})
export class ReferenceEntityDetailPanel {
  readonly entity = input.required<ReferenceEntity>();
  readonly labels = input.required<ReferenceEntityLabels>();

  readonly closePanel = output<void>();
  readonly toggleStatus = output<void>();
  readonly saveDetails = output<{ name: string }>();

  protected readonly editing = signal(false);
  protected readonly editName = signal('');
  protected readonly editError = signal<string | null>(null);

  constructor() {
    // Resets state whenever the selected entity changes AND after any successful save for it —
    // the store's immutable updates give entity() a new object identity on every mutation, so a
    // save "closes" its own edit form as a side effect.
    effect(() => {
      this.entity();
      this.editing.set(false);
      this.editError.set(null);
      this.editName.set('');
    });
  }

  protected startEdit(): void {
    this.editName.set(this.entity().name);
    this.editError.set(null);
    this.editing.set(true);
  }

  protected submitDetails(): void {
    const name = this.editName().trim();
    if (!name) {
      this.editError.set(this.labels().requiredError);
      return;
    }
    this.saveDetails.emit({ name });
  }

  protected cancelEdit(): void {
    this.editing.set(false);
    this.editName.set('');
    this.editError.set(null);
  }

  /** Lets the parent surface a store-side outcome (e.g. duplicate code — unreachable on an
   * update since code is immutable, but not-found is reachable if two admins race). */
  setDetailsError(message: string): void {
    this.editError.set(message);
  }
}
```

- [ ] **Step 4: Run the spec to verify it passes**

Run: `pnpm nx test ikho-ui --skip-nx-cache --include='**/reference-entity-detail-panel.spec.ts'` (from `source/`)
Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add source/apps/ikho-ui/src/app/features/office/catalogue/reference-entity-detail-panel.ts source/apps/ikho-ui/src/app/features/office/catalogue/reference-entity-detail-panel.spec.ts
git commit -m "feat(ikho-ui): add shared ReferenceEntityDetailPanel for Catalogue"
```

---

### Task 3: `OfficeCatalogue` screen shell — header, KPIs, 4-way toggle, four read-only tables

**Files:**
- Modify: `source/apps/ikho-ui/src/app/features/office/catalogue/office-catalogue.ts` (full rewrite — this file exists today as the static placeholder; every line of its current content is replaced)
- Create: `source/apps/ikho-ui/src/app/features/office/catalogue/office-catalogue.spec.ts`

No route change is needed — `office.routes.ts` already points `catalogue` at `./catalogue/office-catalogue`.

**Interfaces:**
- Consumes: `CatalogStore` (Task 1); `LangService`, `screenTitle`/`screenMeta`/`SCREENS` (existing).
- Produces: `OfficeCatalogue` (selector `app-office-catalogue`) with protected members `activeSection: WritableSignal<'products' | 'categories' | 'brands' | 'uom'>`, `query`, `kpis`, four sets of columns/rows/filtered-rows computeds, and `nameOfCategory(code)`/`nameOfBrand(code)`/`nameOfUom(code)` lookup helpers. Task 4 adds Product row-click/detail-panel wiring; Task 5 adds the Product create panel and the header action button (Products branch only); Task 6 adds Category/Brand/UoM row-click/detail-panel wiring, their three create panels, and completes the header button's remaining three branches. This task's markup leaves four named anchor comments, `<!-- PRODUCTS_SECTION_EXTRA -->`, `<!-- CATEGORIES_SECTION_EXTRA -->`, `<!-- BRANDS_SECTION_EXTRA -->`, `<!-- UOM_SECTION_EXTRA -->`, immediately after each table's closing `lib-data-panel`, as unambiguous insertion points for later tasks — remove each comment as its task fills it in.

- [ ] **Step 1: Write the failing `office-catalogue.spec.ts`**

```ts
// source/apps/ikho-ui/src/app/features/office/catalogue/office-catalogue.spec.ts
import { TestBed } from '@angular/core/testing';
import { OfficeCatalogue } from './office-catalogue';

describe('OfficeCatalogue', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [OfficeCatalogue] }).compileComponents();
  });

  it('shows the Products table by default with all 10 seeded rows', () => {
    const fixture = TestBed.createComponent(OfficeCatalogue);
    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('IKH-482910');
    expect(text).toContain('Steel shelving bracket, 400mm');
    expect(text).toContain('Racking'); // resolved category name, not just the code
    expect(text).toContain('Vanderberg'); // resolved brand name
  });

  it('computes the 4 KPIs from seed data', () => {
    const fixture = TestBed.createComponent(OfficeCatalogue);
    fixture.detectChanges();
    // Assert directly on the kpis() computed rather than a page-wide digit search — single
    // digits like '9' or '4' would also coincidentally match SKU codes elsewhere on the page
    // (e.g. 'IKH-902316' contains '9'), so a text-search assertion here would be vacuous.
    const kpis = (fixture.componentInstance as unknown as { kpis: () => { label: string; value: number }[] }).kpis();
    expect(kpis[0].value).toBe(9); // Active SKUs: 10 seeded, 1 inactive (IKH-447203)
    expect(kpis[1].value).toBe(4); // Categories: total directory size
    expect(kpis[2].value).toBe(6); // Brands: total directory size
    expect(kpis[3].value).toBe(5); // Lot-controlled: count of isLotControlled products
  });

  it('toggling to Categories shows the categories table instead of Products', () => {
    const fixture = TestBed.createComponent(OfficeCatalogue);
    fixture.detectChanges();
    const buttons = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button'));
    buttons.find((b) => b.textContent?.trim() === 'Categories')?.click();
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('RACK');
    expect(text).toContain('Racking');
    expect(text).not.toContain('IKH-482910');
  });

  it('toggling to Brands shows the brands table', () => {
    const fixture = TestBed.createComponent(OfficeCatalogue);
    fixture.detectChanges();
    const buttons = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button'));
    buttons.find((b) => b.textContent?.trim() === 'Brands')?.click();
    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('VDB');
    expect(text).toContain('Vanderberg');
  });

  it('toggling to Units of Measure shows the UoM table', () => {
    const fixture = TestBed.createComponent(OfficeCatalogue);
    fixture.detectChanges();
    const buttons = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button'));
    buttons.find((b) => b.textContent?.trim() === 'Units of Measure')?.click();
    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('EA');
    expect(text).toContain('Each');
  });

  it('search narrows the Products table to matching rows', () => {
    const fixture = TestBed.createComponent(OfficeCatalogue);
    fixture.detectChanges();
    const instance = fixture.componentInstance as unknown as { query: { set: (v: string) => void } };
    instance.query.set('scanner');
    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('IKH-902316');
    expect(text).not.toContain('IKH-482910');
  });

  it('shows an empty-state label when the search matches nothing', () => {
    const fixture = TestBed.createComponent(OfficeCatalogue);
    fixture.detectChanges();
    const instance = fixture.componentInstance as unknown as { query: { set: (v: string) => void } };
    instance.query.set('no-such-product-xyz');
    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('No products match');
  });
});
```

- [ ] **Step 2: Run the spec to verify it fails**

Run: `pnpm nx test ikho-ui --skip-nx-cache --include='**/office-catalogue.spec.ts'` (from `source/`)
Expected: FAIL — the current placeholder component doesn't render any of this content.

- [ ] **Step 3: Rewrite `office-catalogue.ts`**

Replace the entire file content with:

```ts
// source/apps/ikho-ui/src/app/features/office/catalogue/office-catalogue.ts
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Button, DataPanel, DataTable, DataTableColumn, KpiCard, TextInput } from '@ikho/shared-ui';
import { LangService } from '../../../core/i18n/lang.service';
import { screenMeta, screenTitle } from '../../../core/mock-data/screens.data';
import { Brand, Category, Product, UnitOfMeasure } from '../../../core/mock-data/catalogue.data';
import { CatalogStore } from '../../../core/state/catalogue-store';

type CatalogueSection = 'products' | 'categories' | 'brands' | 'uom';

interface ProductRow extends Record<string, unknown> {
  sku: string;
  name: string;
  categoryName: string;
  brandName: string;
  uomCode: string;
  status: 'in-stock' | 'out-of-stock';
  statusLabel: string;
}

interface CodeNameRow extends Record<string, unknown> {
  code: string;
  name: string;
  status: 'in-stock' | 'out-of-stock';
  statusLabel: string;
}

@Component({
  selector: 'app-office-catalogue',
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
        <lib-button [variant]="activeSection() === 'products' ? 'primary' : 'secondary'" (click)="selectSection('products')">{{ t().productsTab }}</lib-button>
        <lib-button [variant]="activeSection() === 'categories' ? 'primary' : 'secondary'" (click)="selectSection('categories')">{{ t().categoriesTab }}</lib-button>
        <lib-button [variant]="activeSection() === 'brands' ? 'primary' : 'secondary'" (click)="selectSection('brands')">{{ t().brandsTab }}</lib-button>
        <lib-button [variant]="activeSection() === 'uom' ? 'primary' : 'secondary'" (click)="selectSection('uom')">{{ t().uomTab }}</lib-button>
      </div>

      @if (activeSection() === 'products') {
        <div class="min-w-60 max-w-md">
          <lib-text-input [placeholder]="t().searchProductsPlaceholder" type="search" [value]="query()" (valueChange)="query.set($event)" />
        </div>
        <lib-data-panel [title]="t().productsPanelTitle">
          <lib-data-table [columns]="productColumns()" [rows]="filteredProductRows()" [emptyLabel]="t().noProducts" />
        </lib-data-panel>
        <!-- PRODUCTS_SECTION_EXTRA -->
      } @else if (activeSection() === 'categories') {
        <div class="min-w-60 max-w-md">
          <lib-text-input [placeholder]="t().searchCodeNamePlaceholder" type="search" [value]="query()" (valueChange)="query.set($event)" />
        </div>
        <lib-data-panel [title]="t().categoriesPanelTitle">
          <lib-data-table [columns]="codeNameColumns()" [rows]="filteredCategoryRows()" [emptyLabel]="t().noCategories" />
        </lib-data-panel>
        <!-- CATEGORIES_SECTION_EXTRA -->
      } @else if (activeSection() === 'brands') {
        <div class="min-w-60 max-w-md">
          <lib-text-input [placeholder]="t().searchCodeNamePlaceholder" type="search" [value]="query()" (valueChange)="query.set($event)" />
        </div>
        <lib-data-panel [title]="t().brandsPanelTitle">
          <lib-data-table [columns]="codeNameColumns()" [rows]="filteredBrandRows()" [emptyLabel]="t().noBrands" />
        </lib-data-panel>
        <!-- BRANDS_SECTION_EXTRA -->
      } @else {
        <div class="min-w-60 max-w-md">
          <lib-text-input [placeholder]="t().searchCodeNamePlaceholder" type="search" [value]="query()" (valueChange)="query.set($event)" />
        </div>
        <lib-data-panel [title]="t().uomPanelTitle">
          <lib-data-table [columns]="codeNameColumns()" [rows]="filteredUomRows()" [emptyLabel]="t().noUom" />
        </lib-data-panel>
        <!-- UOM_SECTION_EXTRA -->
      }
    </div>
  `,
})
export class OfficeCatalogue {
  protected readonly lang = inject(LangService);
  protected readonly store = inject(CatalogStore);

  protected readonly title = computed(() => screenTitle('catalogue', 'admin', this.lang.lang()));
  protected readonly meta = computed(() => screenMeta('catalogue', 'admin', this.lang.lang()));

  protected readonly t = computed(() => {
    const en = this.lang.lang() === 'en';
    return {
      productsTab: en ? 'Products' : 'Sản phẩm',
      categoriesTab: en ? 'Categories' : 'Nhóm sản phẩm',
      brandsTab: en ? 'Brands' : 'Thương hiệu',
      uomTab: en ? 'Units of Measure' : 'Đơn vị tính',
      productsPanelTitle: en ? 'Products' : 'Sản phẩm',
      categoriesPanelTitle: en ? 'Categories' : 'Nhóm sản phẩm',
      brandsPanelTitle: en ? 'Brands' : 'Thương hiệu',
      uomPanelTitle: en ? 'Units of Measure' : 'Đơn vị tính',
      searchProductsPlaceholder: en ? 'Search SKU or name' : 'Tìm SKU hoặc tên',
      searchCodeNamePlaceholder: en ? 'Search code or name' : 'Tìm mã hoặc tên',
      noProducts: en ? 'No products match' : 'Không có sản phẩm phù hợp',
      noCategories: en ? 'No categories match' : 'Không có nhóm phù hợp',
      noBrands: en ? 'No brands match' : 'Không có thương hiệu phù hợp',
      noUom: en ? 'No units of measure match' : 'Không có đơn vị tính phù hợp',
      activeSkus: en ? 'Active SKUs' : 'SKU đang hoạt động',
      categoriesKpi: en ? 'Categories' : 'Nhóm sản phẩm',
      brandsKpi: en ? 'Brands' : 'Thương hiệu',
      lotControlledKpi: en ? 'Lot-controlled' : 'Theo lô',
      colSku: en ? 'SKU' : 'SKU',
      colName: en ? 'Name' : 'Tên',
      colCategory: en ? 'Category' : 'Nhóm',
      colBrand: en ? 'Brand' : 'Thương hiệu',
      colUom: en ? 'UoM' : 'ĐVT',
      colCode: en ? 'Code' : 'Mã',
      colStatus: en ? 'Status' : 'Trạng thái',
      active: en ? 'Active' : 'Hoạt động',
      inactive: en ? 'Inactive' : 'Ngừng hoạt động',
      none: en ? '—' : '—',
    };
  });

  protected readonly activeSection = signal<CatalogueSection>('products');
  protected readonly query = signal('');

  protected selectSection(section: CatalogueSection): void {
    this.activeSection.set(section);
    this.query.set('');
  }

  protected readonly kpis = computed(() => {
    const products = this.store.products();
    return [
      { label: this.t().activeSkus, value: products.filter((p) => p.isActive).length },
      { label: this.t().categoriesKpi, value: this.store.categories().length },
      { label: this.t().brandsKpi, value: this.store.brands().length },
      { label: this.t().lotControlledKpi, value: products.filter((p) => p.isLotControlled).length },
    ];
  });

  protected readonly productColumns = computed<DataTableColumn[]>(() => {
    const t = this.t();
    return [
      { key: 'sku', label: t.colSku, mono: true },
      { key: 'name', label: t.colName },
      { key: 'categoryName', label: t.colCategory },
      { key: 'brandName', label: t.colBrand },
      { key: 'uomCode', label: t.colUom, mono: true },
      { key: 'status', label: t.colStatus, status: true, statusLabelKey: 'statusLabel' },
    ];
  });

  protected readonly codeNameColumns = computed<DataTableColumn[]>(() => {
    const t = this.t();
    return [
      { key: 'code', label: t.colCode, mono: true },
      { key: 'name', label: t.colName },
      { key: 'status', label: t.colStatus, status: true, statusLabelKey: 'statusLabel' },
    ];
  });

  protected nameOfCategory(code: string | undefined): string {
    if (!code) return this.t().none;
    return this.store.categories().find((c) => c.code === code)?.name ?? this.t().none;
  }

  protected nameOfBrand(code: string | undefined): string {
    if (!code) return this.t().none;
    return this.store.brands().find((b) => b.code === code)?.name ?? this.t().none;
  }

  protected nameOfUom(code: string | undefined): string {
    if (!code) return this.t().none;
    return this.store.unitsOfMeasure().find((u) => u.code === code)?.name ?? this.t().none;
  }

  private toProductRow(p: Product): ProductRow {
    return {
      sku: p.sku,
      name: p.name,
      categoryName: this.nameOfCategory(p.categoryCode),
      brandName: this.nameOfBrand(p.brandCode),
      uomCode: p.defaultUomCode ?? this.t().none,
      status: p.isActive ? 'in-stock' : 'out-of-stock',
      statusLabel: p.isActive ? this.t().active : this.t().inactive,
    };
  }

  private toCodeNameRow(entity: Category | Brand | UnitOfMeasure): CodeNameRow {
    return {
      code: entity.code,
      name: entity.name,
      status: entity.isActive ? 'in-stock' : 'out-of-stock',
      statusLabel: entity.isActive ? this.t().active : this.t().inactive,
    };
  }

  protected readonly productRows = computed<ProductRow[]>(() => this.store.products().map((p) => this.toProductRow(p)));
  protected readonly categoryRows = computed<CodeNameRow[]>(() => this.store.categories().map((c) => this.toCodeNameRow(c)));
  protected readonly brandRows = computed<CodeNameRow[]>(() => this.store.brands().map((b) => this.toCodeNameRow(b)));
  protected readonly uomRows = computed<CodeNameRow[]>(() => this.store.unitsOfMeasure().map((u) => this.toCodeNameRow(u)));

  protected readonly filteredProductRows = computed(() => {
    const q = this.query().trim().toLowerCase();
    if (!q) return this.productRows();
    return this.productRows().filter((row) => [row.sku, row.name].join(' ').toLowerCase().includes(q));
  });

  protected readonly filteredCategoryRows = computed(() => {
    const q = this.query().trim().toLowerCase();
    if (!q) return this.categoryRows();
    return this.categoryRows().filter((row) => [row.code, row.name].join(' ').toLowerCase().includes(q));
  });

  protected readonly filteredBrandRows = computed(() => {
    const q = this.query().trim().toLowerCase();
    if (!q) return this.brandRows();
    return this.brandRows().filter((row) => [row.code, row.name].join(' ').toLowerCase().includes(q));
  });

  protected readonly filteredUomRows = computed(() => {
    const q = this.query().trim().toLowerCase();
    if (!q) return this.uomRows();
    return this.uomRows().filter((row) => [row.code, row.name].join(' ').toLowerCase().includes(q));
  });
}
```

- [ ] **Step 4: Run the spec to verify it passes**

Run: `pnpm nx test ikho-ui --skip-nx-cache --include='**/office-catalogue.spec.ts'` (from `source/`)
Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add source/apps/ikho-ui/src/app/features/office/catalogue/office-catalogue.ts source/apps/ikho-ui/src/app/features/office/catalogue/office-catalogue.spec.ts
git commit -m "feat(ikho-ui): rewrite OfficeCatalogue as a real screen with KPIs, 4-way toggle, and tables"
```

---

### Task 4: `ProductDetailPanel` — edit, status toggle, barcodes; wire into `OfficeCatalogue`

**Files:**
- Create: `source/apps/ikho-ui/src/app/features/office/catalogue/product-detail-panel.ts`
- Test: `source/apps/ikho-ui/src/app/features/office/catalogue/product-detail-panel.spec.ts`
- Modify: `source/apps/ikho-ui/src/app/features/office/catalogue/office-catalogue.ts`
- Modify: `source/apps/ikho-ui/src/app/features/office/catalogue/office-catalogue.spec.ts`

**Interfaces:**
- Consumes: `Product`, `Category`, `Brand`, `UnitOfMeasure` (Task 1), `LangService` (existing).
- Produces: `ProductDetailPanel` (selector `app-product-detail-panel`) with `product = input.required<Product>()`, `categories = input.required<Category[]>()`, `brands = input.required<Brand[]>()`, `unitsOfMeasure = input.required<UnitOfMeasure[]>()`, outputs `closePanel: output<void>()`, `toggleStatus: output<void>()`, `saveDetails: output<{name: string; description: string; categoryCode?: string; brandCode?: string; defaultUomCode?: string; isLotControlled: boolean; isSerialControlled: boolean}>()`, `addBarcode: output<{code: string}>()`, and public methods `setDetailsError(message: string)`, `setBarcodeError(message: string)`. `OfficeCatalogue` gains `selectedProductSku`, `selectedProduct`, `onProductRowClick`, `onToggleProductStatus`, `onSaveProductDetails`, `onAddBarcode`.

- [ ] **Step 1: Write the failing `product-detail-panel.spec.ts`**

```ts
// source/apps/ikho-ui/src/app/features/office/catalogue/product-detail-panel.spec.ts
import { TestBed } from '@angular/core/testing';
import { Product } from '../../../core/mock-data/catalogue.data';
import { ProductDetailPanel } from './product-detail-panel';

const TEST_PRODUCT: Product = {
  sku: 'IKH-482910',
  name: 'Steel shelving bracket, 400mm',
  description: 'A bracket.',
  categoryCode: 'RACK',
  brandCode: 'VDB',
  defaultUomCode: 'EA',
  isLotControlled: true,
  isSerialControlled: false,
  isActive: true,
  createdOnUtc: '2024-01-15T09:00:00Z',
  barcodes: [{ code: '8712345482910' }],
};

const CATEGORIES = [{ code: 'RACK', name: 'Racking', isActive: true }];
const BRANDS = [{ code: 'VDB', name: 'Vanderberg', isActive: true }];
const UOMS = [{ code: 'EA', name: 'Each', isActive: true }];

describe('ProductDetailPanel', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [ProductDetailPanel] }).compileComponents();
  });

  function create(product: Product = TEST_PRODUCT) {
    const fixture = TestBed.createComponent(ProductDetailPanel);
    fixture.componentRef.setInput('product', product);
    fixture.componentRef.setInput('categories', CATEGORIES);
    fixture.componentRef.setInput('brands', BRANDS);
    fixture.componentRef.setInput('unitsOfMeasure', UOMS);
    fixture.detectChanges();
    return fixture;
  }

  it('renders sku, name, category/brand/uom names, and barcodes', () => {
    const fixture = create();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('IKH-482910');
    expect(text).toContain('Steel shelving bracket, 400mm');
    expect(text).toContain('Racking');
    expect(text).toContain('Vanderberg');
    expect(text).toContain('Each');
    expect(text).toContain('8712345482910');
  });

  it('toggleStatus emits when the activate/deactivate button is clicked', () => {
    const fixture = create();
    let emitted = false;
    fixture.componentInstance.toggleStatus.subscribe(() => (emitted = true));
    const buttons = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button'));
    buttons.find((b) => b.textContent?.includes('Deactivate'))?.click();
    expect(emitted).toBe(true);
  });

  it('rejects an add-barcode submission with a blank code, and emits a well-formed barcode on success', () => {
    const fixture = create();
    const instance = fixture.componentInstance as unknown as {
      showBarcodeForm: { set: (v: boolean) => void };
      barcodeCode: { set: (v: string) => void };
      submitBarcode: () => void;
    };
    let payload: { code: string } | undefined;
    fixture.componentInstance.addBarcode.subscribe((v) => (payload = v));

    instance.showBarcodeForm.set(true);
    instance.barcodeCode.set('');
    instance.submitBarcode();
    expect(payload).toBeUndefined();

    instance.barcodeCode.set('  1234567890123  ');
    instance.submitBarcode();
    expect(payload).toEqual({ code: '1234567890123' });
  });

  it('setBarcodeError surfaces a store-side outcome on the open barcode form', () => {
    const fixture = create();
    const instance = fixture.componentInstance as unknown as { showBarcodeForm: { set: (v: boolean) => void } };
    instance.showBarcodeForm.set(true);
    fixture.componentInstance.setBarcodeError('This barcode is already registered.');
    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('This barcode is already registered.');
  });

  it('resets the edit and barcode forms when the product input changes identity', () => {
    const fixture = create();
    const instance = fixture.componentInstance as unknown as {
      showBarcodeForm: { set: (v: boolean) => void; (): boolean };
      barcodeCode: { set: (v: string) => void; (): string };
      editing: { set: (v: boolean) => void; (): boolean };
    };
    instance.showBarcodeForm.set(true);
    instance.barcodeCode.set('9999999999999');
    instance.editing.set(true);

    fixture.componentRef.setInput('product', { ...TEST_PRODUCT, name: 'Renamed' });
    fixture.detectChanges();

    expect(instance.showBarcodeForm()).toBe(false);
    expect(instance.barcodeCode()).toBe('');
    expect(instance.editing()).toBe(false);
  });

  it('rejects a details edit submission with a blank name, and emits the full payload on success', () => {
    const fixture = create();
    const instance = fixture.componentInstance as unknown as {
      startEdit: () => void;
      editName: { set: (v: string) => void };
      submitDetails: () => void;
    };
    let payload: unknown;
    fixture.componentInstance.saveDetails.subscribe((v) => (payload = v));

    instance.startEdit();
    instance.editName.set('');
    instance.submitDetails();
    expect(payload).toBeUndefined();

    instance.editName.set('Renamed bracket');
    instance.submitDetails();
    expect(payload).toEqual({
      name: 'Renamed bracket',
      description: 'A bracket.',
      categoryCode: 'RACK',
      brandCode: 'VDB',
      defaultUomCode: 'EA',
      isLotControlled: true,
      isSerialControlled: false,
    });
  });
});
```

- [ ] **Step 2: Run the spec to verify it fails**

Run: `pnpm nx test ikho-ui --skip-nx-cache --include='**/product-detail-panel.spec.ts'` (from `source/`)
Expected: FAIL — the component does not exist yet.

- [ ] **Step 3: Implement `ProductDetailPanel`**

```ts
// source/apps/ikho-ui/src/app/features/office/catalogue/product-detail-panel.ts
import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { Button, Icon, StatusBadge, TextInput } from '@ikho/shared-ui';
import { LangService } from '../../../core/i18n/lang.service';
import { UI_STRINGS } from '../../../core/i18n/ui-strings.data';
import { Brand, Category, Product, UnitOfMeasure } from '../../../core/mock-data/catalogue.data';

export interface ProductDetailsSave {
  name: string;
  description: string;
  categoryCode?: string;
  brandCode?: string;
  defaultUomCode?: string;
  isLotControlled: boolean;
  isSerialControlled: boolean;
}

@Component({
  selector: 'app-product-detail-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Button, Icon, StatusBadge, TextInput],
  host: { class: 'block' },
  template: `
    <aside class="flex w-96 flex-none flex-col gap-4 rounded-card border border-hairline-light bg-canvas-light p-6 shadow-card">
      <div class="flex items-start justify-between gap-3">
        <div class="flex min-w-0 flex-col gap-1">
          <span class="font-core text-[11px] font-bold tracking-[0.5px] text-shade-50 uppercase">{{ t().eyebrow }}</span>
          <span class="font-mono text-[13px] text-primary">{{ product().sku }}</span>
          <span class="font-core text-lg font-bold tracking-[-0.2px] text-ink">{{ product().name }}</span>
        </div>
        <button
          type="button"
          class="inline-flex size-8 flex-none cursor-pointer items-center justify-center rounded-md border-none bg-transparent hover:bg-surface-elevated-light"
          [attr.aria-label]="lang.pick(strings.close)"
          (click)="closePanel.emit()"
        >
          <lib-icon name="x" [size]="18" color="var(--color-shade-50)" />
        </button>
      </div>

      <lib-status-badge [status]="product().isActive ? 'in-stock' : 'out-of-stock'" [label]="product().isActive ? t().active : t().inactive" />

      <div class="flex flex-col gap-2.5 border-t border-hairline-light pt-4">
        @if (editing()) {
          <lib-text-input [label]="t().name" [value]="editName()" (valueChange)="editName.set($event)" />
          <lib-text-input [label]="t().description" [value]="editDescription()" (valueChange)="editDescription.set($event)" />
          <label class="flex flex-col gap-1.5">
            <span class="font-core text-[13px] font-semibold text-ink">{{ t().category }}</span>
            <select
              class="h-10 rounded-md border border-hairline-light bg-canvas-light px-3 font-core text-[13px] text-text-body"
              [value]="editCategoryCode()"
              (change)="editCategoryCode.set($any($event.target).value)"
            >
              <option value="">{{ t().none }}</option>
              @for (c of categories(); track c.code) {
                @if (c.isActive) {
                  <option [value]="c.code">{{ c.name }}</option>
                }
              }
            </select>
          </label>
          <label class="flex flex-col gap-1.5">
            <span class="font-core text-[13px] font-semibold text-ink">{{ t().brand }}</span>
            <select
              class="h-10 rounded-md border border-hairline-light bg-canvas-light px-3 font-core text-[13px] text-text-body"
              [value]="editBrandCode()"
              (change)="editBrandCode.set($any($event.target).value)"
            >
              <option value="">{{ t().none }}</option>
              @for (b of brands(); track b.code) {
                @if (b.isActive) {
                  <option [value]="b.code">{{ b.name }}</option>
                }
              }
            </select>
          </label>
          <label class="flex flex-col gap-1.5">
            <span class="font-core text-[13px] font-semibold text-ink">{{ t().uom }}</span>
            <select
              class="h-10 rounded-md border border-hairline-light bg-canvas-light px-3 font-core text-[13px] text-text-body"
              [value]="editUomCode()"
              (change)="editUomCode.set($any($event.target).value)"
            >
              <option value="">{{ t().none }}</option>
              @for (u of unitsOfMeasure(); track u.code) {
                @if (u.isActive) {
                  <option [value]="u.code">{{ u.name }}</option>
                }
              }
            </select>
          </label>
          <label class="flex items-center gap-2 font-core text-[13px] text-text-body">
            <input type="checkbox" [checked]="editIsLotControlled()" (change)="editIsLotControlled.set($any($event.target).checked)" />
            {{ t().lotControlled }}
          </label>
          <label class="flex items-center gap-2 font-core text-[13px] text-text-body">
            <input type="checkbox" [checked]="editIsSerialControlled()" (change)="editIsSerialControlled.set($any($event.target).checked)" />
            {{ t().serialControlled }}
          </label>
          @if (editError(); as err) {
            <span class="font-core text-xs text-status-out-of-stock">{{ err }}</span>
          }
          <div class="flex gap-2">
            <lib-button variant="primary" (click)="submitDetails()">{{ t().save }}</lib-button>
            <lib-button variant="ghost" (click)="cancelEdit()">{{ t().cancel }}</lib-button>
          </div>
        } @else {
          <div class="flex items-baseline justify-between gap-3">
            <span class="font-core text-[13px] text-shade-50">{{ t().category }}</span>
            <span class="text-right font-core text-[13px] font-semibold text-text-body">{{ categoryName() }}</span>
          </div>
          <div class="flex items-baseline justify-between gap-3">
            <span class="font-core text-[13px] text-shade-50">{{ t().brand }}</span>
            <span class="text-right font-core text-[13px] font-semibold text-text-body">{{ brandName() }}</span>
          </div>
          <div class="flex items-baseline justify-between gap-3">
            <span class="font-core text-[13px] text-shade-50">{{ t().uom }}</span>
            <span class="text-right font-core text-[13px] font-semibold text-text-body">{{ uomName() }}</span>
          </div>
          <div class="flex items-baseline justify-between gap-3">
            <span class="font-core text-[13px] text-shade-50">{{ t().tracking }}</span>
            <span class="text-right font-core text-[13px] font-semibold text-text-body">{{ trackingLabel() }}</span>
          </div>
          <lib-button variant="secondary" (click)="startEdit()">{{ t().editDetails }}</lib-button>
        }
      </div>

      <lib-button variant="primary" [fullWidth]="true" (click)="toggleStatus.emit()">
        {{ product().isActive ? t().deactivate : t().activate }}
      </lib-button>

      <div class="flex flex-col gap-2 border-t border-hairline-light pt-4">
        <span class="font-core text-[13px] font-semibold text-ink">{{ t().barcodes }}</span>
        @for (b of product().barcodes; track b.code) {
          <div class="flex items-center gap-2 rounded-md border border-hairline-light p-2.5">
            <span class="font-mono text-[13px] text-text-body">{{ b.code }}</span>
          </div>
        } @empty {
          <span class="font-core text-[13px] text-shade-50">{{ t().noBarcodes }}</span>
        }
        @if (showBarcodeForm()) {
          <div class="flex flex-col gap-2 rounded-md border border-hairline-light p-2.5">
            <lib-text-input [label]="t().barcodeCode" [value]="barcodeCode()" (valueChange)="barcodeCode.set($event)" />
            @if (barcodeError(); as err) {
              <span class="font-core text-xs text-status-out-of-stock">{{ err }}</span>
            }
            <div class="flex gap-2">
              <lib-button variant="primary" (click)="submitBarcode()">{{ t().saveBarcode }}</lib-button>
              <lib-button variant="ghost" (click)="cancelBarcode()">{{ t().cancel }}</lib-button>
            </div>
          </div>
        } @else {
          <lib-button variant="secondary" (click)="showBarcodeForm.set(true)">{{ t().addBarcode }}</lib-button>
        }
      </div>
    </aside>
  `,
})
export class ProductDetailPanel {
  protected readonly lang = inject(LangService);
  protected readonly strings = UI_STRINGS;

  readonly product = input.required<Product>();
  readonly categories = input.required<Category[]>();
  readonly brands = input.required<Brand[]>();
  readonly unitsOfMeasure = input.required<UnitOfMeasure[]>();

  readonly closePanel = output<void>();
  readonly toggleStatus = output<void>();
  readonly saveDetails = output<ProductDetailsSave>();
  readonly addBarcode = output<{ code: string }>();

  protected readonly t = computed(() => {
    const en = this.lang.lang() === 'en';
    return {
      eyebrow: en ? 'Product detail' : 'Chi tiết sản phẩm',
      active: en ? 'Active' : 'Hoạt động',
      inactive: en ? 'Inactive' : 'Ngừng hoạt động',
      category: en ? 'Category' : 'Nhóm',
      brand: en ? 'Brand' : 'Thương hiệu',
      uom: en ? 'Unit of measure' : 'Đơn vị tính',
      tracking: en ? 'Tracking' : 'Theo dõi',
      none: en ? '—' : '—',
      editDetails: en ? 'Edit details' : 'Sửa thông tin',
      name: en ? 'Name' : 'Tên',
      description: en ? 'Description' : 'Mô tả',
      lotControlled: en ? 'Lot-controlled' : 'Theo lô',
      serialControlled: en ? 'Serial-controlled' : 'Theo serial',
      save: en ? 'Save' : 'Lưu',
      cancel: en ? 'Cancel' : 'Huỷ',
      detailsRequired: en ? 'Name is required.' : 'Cần nhập tên.',
      deactivate: en ? 'Deactivate' : 'Vô hiệu hoá',
      activate: en ? 'Activate' : 'Kích hoạt',
      barcodes: en ? 'Barcodes' : 'Mã vạch',
      noBarcodes: en ? 'No barcodes yet.' : 'Chưa có mã vạch.',
      barcodeCode: en ? 'Barcode' : 'Mã vạch',
      saveBarcode: en ? 'Save barcode' : 'Lưu mã vạch',
      addBarcode: en ? 'Add barcode' : 'Thêm mã vạch',
      barcodeRequired: en ? 'Barcode is required.' : 'Cần nhập mã vạch.',
    };
  });

  protected readonly categoryName = computed(() => this.categories().find((c) => c.code === this.product().categoryCode)?.name ?? this.t().none);
  protected readonly brandName = computed(() => this.brands().find((b) => b.code === this.product().brandCode)?.name ?? this.t().none);
  protected readonly uomName = computed(() => this.unitsOfMeasure().find((u) => u.code === this.product().defaultUomCode)?.name ?? this.t().none);
  protected readonly trackingLabel = computed(() => {
    const p = this.product();
    if (p.isLotControlled) return this.t().lotControlled;
    if (p.isSerialControlled) return this.t().serialControlled;
    return this.t().none;
  });

  protected readonly editing = signal(false);
  protected readonly editName = signal('');
  protected readonly editDescription = signal('');
  protected readonly editCategoryCode = signal('');
  protected readonly editBrandCode = signal('');
  protected readonly editUomCode = signal('');
  protected readonly editIsLotControlled = signal(false);
  protected readonly editIsSerialControlled = signal(false);
  protected readonly editError = signal<string | null>(null);

  protected readonly showBarcodeForm = signal(false);
  protected readonly barcodeCode = signal('');
  protected readonly barcodeError = signal<string | null>(null);

  constructor() {
    // Resets state whenever the selected product changes AND after any successful save for it —
    // the store's immutable updates give product() a new object identity on every mutation, so
    // a save "closes" its own form as a side effect.
    effect(() => {
      this.product();
      this.editing.set(false);
      this.editError.set(null);
      this.editName.set('');
      this.editDescription.set('');
      this.editCategoryCode.set('');
      this.editBrandCode.set('');
      this.editUomCode.set('');
      this.editIsLotControlled.set(false);
      this.editIsSerialControlled.set(false);
      this.showBarcodeForm.set(false);
      this.barcodeError.set(null);
      this.barcodeCode.set('');
    });
  }

  protected startEdit(): void {
    const p = this.product();
    this.editName.set(p.name);
    this.editDescription.set(p.description);
    this.editCategoryCode.set(p.categoryCode ?? '');
    this.editBrandCode.set(p.brandCode ?? '');
    this.editUomCode.set(p.defaultUomCode ?? '');
    this.editIsLotControlled.set(p.isLotControlled);
    this.editIsSerialControlled.set(p.isSerialControlled);
    this.editError.set(null);
    this.editing.set(true);
  }

  protected submitDetails(): void {
    const name = this.editName().trim();
    if (!name) {
      this.editError.set(this.t().detailsRequired);
      return;
    }
    this.saveDetails.emit({
      name,
      description: this.editDescription().trim(),
      categoryCode: this.editCategoryCode() || undefined,
      brandCode: this.editBrandCode() || undefined,
      defaultUomCode: this.editUomCode() || undefined,
      isLotControlled: this.editIsLotControlled(),
      isSerialControlled: this.editIsSerialControlled(),
    });
  }

  protected cancelEdit(): void {
    this.editing.set(false);
    this.editError.set(null);
  }

  protected submitBarcode(): void {
    const code = this.barcodeCode().trim();
    if (!code) {
      this.barcodeError.set(this.t().barcodeRequired);
      return;
    }
    this.addBarcode.emit({ code });
  }

  protected cancelBarcode(): void {
    this.showBarcodeForm.set(false);
    this.barcodeCode.set('');
    this.barcodeError.set(null);
  }

  /** Lets the parent surface a store-side outcome (e.g. category-not-found) for the open edit form. */
  setDetailsError(message: string): void {
    this.editError.set(message);
  }

  /** Lets the parent surface a store-side outcome (e.g. duplicate-code) for the open barcode form. */
  setBarcodeError(message: string): void {
    this.barcodeError.set(message);
  }
}
```

- [ ] **Step 4: Run the spec to verify it passes**

Run: `pnpm nx test ikho-ui --skip-nx-cache --include='**/product-detail-panel.spec.ts'` (from `source/`)
Expected: all tests PASS.

- [ ] **Step 5: Wire row selection, the detail panel, and its actions into `OfficeCatalogue`**

In `office-catalogue.ts`:
- Add `viewChild` to the existing `@angular/core` import (`import { ChangeDetectionStrategy, Component, computed, inject, signal, viewChild } from '@angular/core';`).
- Add `import { ProductDetailPanel } from './product-detail-panel';`.
- Add `ProductDetailPanel` to the `@Component` `imports` array.
- Replace the Products branch's `lib-data-panel` block:

```html
        <lib-data-panel [title]="t().productsPanelTitle">
          <lib-data-table [columns]="productColumns()" [rows]="filteredProductRows()" [emptyLabel]="t().noProducts" />
        </lib-data-panel>
        <!-- PRODUCTS_SECTION_EXTRA -->
```

with:

```html
        <div class="flex items-start gap-5">
          <div class="min-w-0 flex-1">
            <lib-data-panel [title]="t().productsPanelTitle">
              <lib-data-table [columns]="productColumns()" [rows]="filteredProductRows()" [emptyLabel]="t().noProducts" [clickable]="true" (rowClick)="onProductRowClick($event)" />
            </lib-data-panel>
          </div>
          @if (selectedProduct(); as p) {
            <app-product-detail-panel
              #productDetailPanel
              [product]="p"
              [categories]="store.categories()"
              [brands]="store.brands()"
              [unitsOfMeasure]="store.unitsOfMeasure()"
              (closePanel)="selectedProductSku.set(null)"
              (toggleStatus)="onToggleProductStatus()"
              (saveDetails)="onSaveProductDetails($event)"
              (addBarcode)="onAddBarcode($event)"
            />
          }
        </div>
```

- Add these members to the class (after `query`):

```ts
  protected readonly selectedProductSku = signal<string | null>(null);
  protected readonly productDetailPanel = viewChild<ProductDetailPanel>('productDetailPanel');

  protected readonly selectedProduct = computed<Product | null>(() => {
    const sku = this.selectedProductSku();
    if (!sku) return null;
    return this.store.products().find((p) => p.sku === sku) ?? null;
  });
```

- Add these keys to the `t()` computed's returned object:

```ts
      productNotFoundError: en ? 'This product could not be found. It may have been removed.' : 'Không tìm thấy sản phẩm này. Có thể đã bị xoá.',
      categoryNotFoundError: en ? 'The selected category could not be found.' : 'Không tìm thấy nhóm đã chọn.',
      brandNotFoundError: en ? 'The selected brand could not be found.' : 'Không tìm thấy thương hiệu đã chọn.',
      uomNotFoundError: en ? 'The selected unit of measure could not be found.' : 'Không tìm thấy đơn vị tính đã chọn.',
      duplicateBarcodeError: en ? 'This barcode is already registered to a product.' : 'Mã vạch này đã được đăng ký cho một sản phẩm.',
```

- Add these methods to the class (after `filteredUomRows`):

```ts
  protected onProductRowClick(row: Record<string, unknown>): void {
    this.selectedProductSku.set(String(row['sku']));
  }

  protected onToggleProductStatus(): void {
    const p = this.selectedProduct();
    if (!p) return;
    this.store.setProductStatus(p.sku, !p.isActive);
  }

  protected onSaveProductDetails(input: {
    name: string;
    description: string;
    categoryCode?: string;
    brandCode?: string;
    defaultUomCode?: string;
    isLotControlled: boolean;
    isSerialControlled: boolean;
  }): void {
    const p = this.selectedProduct();
    if (!p) return;
    const outcome = this.store.updateProduct(p.sku, input);
    if (outcome === 'not-found') {
      this.productDetailPanel()?.setDetailsError(this.t().productNotFoundError);
    } else if (outcome === 'category-not-found') {
      this.productDetailPanel()?.setDetailsError(this.t().categoryNotFoundError);
    } else if (outcome === 'brand-not-found') {
      this.productDetailPanel()?.setDetailsError(this.t().brandNotFoundError);
    } else if (outcome === 'uom-not-found') {
      this.productDetailPanel()?.setDetailsError(this.t().uomNotFoundError);
    }
  }

  protected onAddBarcode(event: { code: string }): void {
    const p = this.selectedProduct();
    if (!p) return;
    const outcome = this.store.addBarcode(p.sku, event);
    if (outcome === 'duplicate-code') {
      this.productDetailPanel()?.setBarcodeError(this.t().duplicateBarcodeError);
    } else if (outcome === 'not-found') {
      this.productDetailPanel()?.setBarcodeError(this.t().productNotFoundError);
    }
  }
```

- [ ] **Step 6: Add failing tests for the wiring, then confirm they pass**

Append to `office-catalogue.spec.ts` (inside the existing `describe('OfficeCatalogue', ...)` block):

```ts
  it('clicking a product row opens its detail panel with resolved category/brand/uom names and barcodes', () => {
    const fixture = TestBed.createComponent(OfficeCatalogue);
    fixture.detectChanges();
    const rows = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('[role="button"]'));
    const row = rows.find((r) => r.textContent?.includes('IKH-482910'));
    (row as HTMLElement)?.click();
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('8712345482910');
    expect(text).toContain('Lot-controlled');
  });

  it('deactivating a product from its detail panel flips its status badge in the table', () => {
    const fixture = TestBed.createComponent(OfficeCatalogue);
    fixture.detectChanges();
    const instance = fixture.componentInstance as unknown as { selectedProductSku: { set: (v: string) => void } };
    instance.selectedProductSku.set('IKH-482910');
    fixture.detectChanges();

    (fixture.nativeElement as HTMLElement).querySelectorAll('button').forEach((b) => {
      if (b.textContent?.includes('Deactivate')) b.click();
    });
    fixture.detectChanges();

    const catalogStore = (fixture.componentInstance as unknown as { store: { products: () => { sku: string; isActive: boolean }[] } }).store;
    expect(catalogStore.products().find((p) => p.sku === 'IKH-482910')?.isActive).toBe(false);
  });

  it('adding a barcode with a code already used by a different product shows a duplicate error and does not add it', () => {
    const fixture = TestBed.createComponent(OfficeCatalogue);
    fixture.detectChanges();
    const instance = fixture.componentInstance as unknown as { selectedProductSku: { set: (v: string) => void } };
    instance.selectedProductSku.set('IKH-482910');
    fixture.detectChanges();

    (fixture.nativeElement as HTMLElement).querySelectorAll('button').forEach((b) => {
      if (b.textContent?.includes('Add barcode')) b.click();
    });
    fixture.detectChanges();

    const inputs = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('input'));
    const barcodeInput = inputs.find((i) => i.type !== 'checkbox');
    barcodeInput!.value = '8712345330298'; // belongs to IKH-330298
    barcodeInput!.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    (fixture.nativeElement as HTMLElement).querySelectorAll('button').forEach((b) => {
      if (b.textContent?.includes('Save barcode')) b.click();
    });
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('already registered');

    const catalogStore = (fixture.componentInstance as unknown as { store: { products: () => { sku: string; barcodes: { code: string }[] }[] } }).store;
    expect(catalogStore.products().find((p) => p.sku === 'IKH-482910')?.barcodes.length).toBe(1);
  });
```

Run: `pnpm nx test ikho-ui --skip-nx-cache --include='**/office-catalogue.spec.ts'` (from `source/`)
Expected: all tests PASS.

- [ ] **Step 7: Commit**

```bash
git add source/apps/ikho-ui/src/app/features/office/catalogue/product-detail-panel.ts source/apps/ikho-ui/src/app/features/office/catalogue/product-detail-panel.spec.ts source/apps/ikho-ui/src/app/features/office/catalogue/office-catalogue.ts source/apps/ikho-ui/src/app/features/office/catalogue/office-catalogue.spec.ts
git commit -m "feat(ikho-ui): add ProductDetailPanel with edit, status toggle, and barcodes"
```

---

### Task 5: Product create panel

**Files:**
- Modify: `source/apps/ikho-ui/src/app/features/office/catalogue/office-catalogue.ts`
- Modify: `source/apps/ikho-ui/src/app/features/office/catalogue/office-catalogue.spec.ts`

**Interfaces:**
- Consumes: `CatalogStore.addProduct`/`AddProductOutcome` (Task 1).
- Produces: `OfficeCatalogue` gains a header "New product" action button (Products section only — see the Global Constraints note on forward-references), an inline create panel for Products, and members `showProductCreateForm`, `productSku`, `productName`, `productDescription`, `productCategoryCode`, `productBrandCode`, `productUomCode`, `productIsLotControlled`, `productIsSerialControlled`, `productFormError`, `submitProductCreate()`, `cancelProductCreate()`.

- [ ] **Step 1: Add the failing tests for the product create flow**

Append to `office-catalogue.spec.ts`:

```ts
  it('creating a product with a valid form adds a row and clears the form', () => {
    const fixture = TestBed.createComponent(OfficeCatalogue);
    fixture.detectChanges();

    (fixture.nativeElement as HTMLElement).querySelectorAll('button').forEach((b) => {
      if (b.textContent?.includes('New product')) b.click();
    });
    fixture.detectChanges();

    const instance = fixture.componentInstance as unknown as {
      productSku: { set: (v: string) => void };
      productName: { set: (v: string) => void };
      showProductCreateForm: () => boolean;
    };
    instance.productSku.set('IKH-111111');
    instance.productName.set('Test Widget');
    fixture.detectChanges();

    (fixture.nativeElement as HTMLElement).querySelectorAll('button').forEach((b) => {
      if (b.textContent === 'Save') b.click();
    });
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('IKH-111111');
    expect(instance.showProductCreateForm()).toBe(false);
  });

  it('submitting the product form with no sku/name shows an error and does not create a row', () => {
    const fixture = TestBed.createComponent(OfficeCatalogue);
    fixture.detectChanges();

    (fixture.nativeElement as HTMLElement).querySelectorAll('button').forEach((b) => {
      if (b.textContent?.includes('New product')) b.click();
    });
    fixture.detectChanges();

    const before = (fixture.componentInstance as unknown as { store: { products: () => unknown[] } }).store.products().length;
    (fixture.nativeElement as HTMLElement).querySelectorAll('button').forEach((b) => {
      if (b.textContent === 'Save') b.click();
    });
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('required');
    expect((fixture.componentInstance as unknown as { store: { products: () => unknown[] } }).store.products().length).toBe(before);
  });

  it('cancelling the product form clears its fields for next time', () => {
    const fixture = TestBed.createComponent(OfficeCatalogue);
    fixture.detectChanges();

    (fixture.nativeElement as HTMLElement).querySelectorAll('button').forEach((b) => {
      if (b.textContent?.includes('New product')) b.click();
    });
    fixture.detectChanges();

    const instance = fixture.componentInstance as unknown as { productSku: { set: (v: string) => void; (): string } };
    instance.productSku.set('IKH-222222');

    (fixture.nativeElement as HTMLElement).querySelectorAll('button').forEach((b) => {
      if (b.textContent === 'Cancel') b.click();
    });
    fixture.detectChanges();

    expect(instance.productSku()).toBe('');
  });

  it('submitting a duplicate sku shows a duplicate-sku error', () => {
    const fixture = TestBed.createComponent(OfficeCatalogue);
    fixture.detectChanges();

    (fixture.nativeElement as HTMLElement).querySelectorAll('button').forEach((b) => {
      if (b.textContent?.includes('New product')) b.click();
    });
    fixture.detectChanges();

    const instance = fixture.componentInstance as unknown as {
      productSku: { set: (v: string) => void };
      productName: { set: (v: string) => void };
    };
    instance.productSku.set('IKH-482910'); // already seeded
    instance.productName.set('Duplicate');
    fixture.detectChanges();

    (fixture.nativeElement as HTMLElement).querySelectorAll('button').forEach((b) => {
      if (b.textContent === 'Save') b.click();
    });
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('already in use');
  });
```

- [ ] **Step 2: Add the header action button and the Product create panel, and wire the class**

In `office-catalogue.ts`, replace the header block:

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
        @if (activeSection() === 'products') {
          <lib-button variant="primary" (click)="showProductCreateForm.set(true)">{{ t().newProductAction }}</lib-button>
        }
      </div>
```

(Only the Products-section button is added here. Task 6 adds the remaining three branches — Categories/Brands/UoM — at the same time it defines their `show*CreateForm` signals; those signals don't exist yet at the end of this task, so referencing them now would fail Angular's template type-check.)

Then, immediately above the Products section's search box (`<div class="min-w-60 max-w-md"> ... searchProductsPlaceholder ...`), inside the `@if (activeSection() === 'products') {` branch, add:

```html
        @if (showProductCreateForm()) {
          <lib-data-panel [title]="t().newProductTitle" [subtitle]="t().newProductSubtitle">
            <div class="flex flex-col gap-4">
              <div class="grid grid-cols-2 gap-4">
                <lib-text-input [label]="t().sku" [value]="productSku()" (valueChange)="productSku.set($event)" />
                <lib-text-input [label]="t().name" [value]="productName()" (valueChange)="productName.set($event)" />
              </div>
              <lib-text-input [label]="t().description" [value]="productDescription()" (valueChange)="productDescription.set($event)" />
              <div class="grid grid-cols-3 gap-4">
                <label class="flex flex-col gap-1.5">
                  <span class="font-core text-[13px] font-semibold text-ink">{{ t().category }}</span>
                  <select
                    class="h-10 rounded-md border border-hairline-light bg-canvas-light px-3 font-core text-[13px] text-text-body"
                    [value]="productCategoryCode()"
                    (change)="productCategoryCode.set($any($event.target).value)"
                  >
                    <option value="">{{ t().none }}</option>
                    @for (c of store.categories(); track c.code) {
                      @if (c.isActive) {
                        <option [value]="c.code">{{ c.name }}</option>
                      }
                    }
                  </select>
                </label>
                <label class="flex flex-col gap-1.5">
                  <span class="font-core text-[13px] font-semibold text-ink">{{ t().brand }}</span>
                  <select
                    class="h-10 rounded-md border border-hairline-light bg-canvas-light px-3 font-core text-[13px] text-text-body"
                    [value]="productBrandCode()"
                    (change)="productBrandCode.set($any($event.target).value)"
                  >
                    <option value="">{{ t().none }}</option>
                    @for (b of store.brands(); track b.code) {
                      @if (b.isActive) {
                        <option [value]="b.code">{{ b.name }}</option>
                      }
                    }
                  </select>
                </label>
                <label class="flex flex-col gap-1.5">
                  <span class="font-core text-[13px] font-semibold text-ink">{{ t().uom }}</span>
                  <select
                    class="h-10 rounded-md border border-hairline-light bg-canvas-light px-3 font-core text-[13px] text-text-body"
                    [value]="productUomCode()"
                    (change)="productUomCode.set($any($event.target).value)"
                  >
                    <option value="">{{ t().none }}</option>
                    @for (u of store.unitsOfMeasure(); track u.code) {
                      @if (u.isActive) {
                        <option [value]="u.code">{{ u.name }}</option>
                      }
                    }
                  </select>
                </label>
              </div>
              <label class="flex items-center gap-2 font-core text-[13px] text-text-body">
                <input type="checkbox" [checked]="productIsLotControlled()" (change)="productIsLotControlled.set($any($event.target).checked)" />
                {{ t().lotControlled }}
              </label>
              <label class="flex items-center gap-2 font-core text-[13px] text-text-body">
                <input type="checkbox" [checked]="productIsSerialControlled()" (change)="productIsSerialControlled.set($any($event.target).checked)" />
                {{ t().serialControlled }}
              </label>
              @if (productFormError(); as err) {
                <span class="font-core text-xs text-status-out-of-stock">{{ err }}</span>
              }
              <div class="flex gap-3">
                <lib-button variant="primary" (click)="submitProductCreate()">{{ t().save }}</lib-button>
                <lib-button variant="ghost" (click)="cancelProductCreate()">{{ t().cancel }}</lib-button>
              </div>
            </div>
          </lib-data-panel>
        }
```

Then wire the class:

- Add these members to the class (after `selectedProduct`):

```ts
  protected readonly showProductCreateForm = signal(false);
  protected readonly productSku = signal('');
  protected readonly productName = signal('');
  protected readonly productDescription = signal('');
  protected readonly productCategoryCode = signal('');
  protected readonly productBrandCode = signal('');
  protected readonly productUomCode = signal('');
  protected readonly productIsLotControlled = signal(false);
  protected readonly productIsSerialControlled = signal(false);
  protected readonly productFormError = signal<string | null>(null);
```

- Add these methods to the class (after `onAddBarcode`):

```ts
  protected submitProductCreate(): void {
    const sku = this.productSku().trim();
    const name = this.productName().trim();
    if (!sku || !name) {
      this.productFormError.set(this.t().skuNameRequiredError);
      return;
    }

    const outcome = this.store.addProduct({
      sku,
      name,
      description: this.productDescription().trim(),
      categoryCode: this.productCategoryCode() || undefined,
      brandCode: this.productBrandCode() || undefined,
      defaultUomCode: this.productUomCode() || undefined,
      isLotControlled: this.productIsLotControlled(),
      isSerialControlled: this.productIsSerialControlled(),
    });

    if (outcome === 'invalid') {
      this.productFormError.set(this.t().skuNameRequiredError);
      return;
    }
    if (outcome === 'category-not-found') {
      this.productFormError.set(this.t().categoryNotFoundError);
      return;
    }
    if (outcome === 'brand-not-found') {
      this.productFormError.set(this.t().brandNotFoundError);
      return;
    }
    if (outcome === 'uom-not-found') {
      this.productFormError.set(this.t().uomNotFoundError);
      return;
    }
    if (outcome === 'duplicate-sku') {
      this.productFormError.set(this.t().duplicateSkuError(sku));
      return;
    }

    this.resetProductCreateForm();
  }

  protected cancelProductCreate(): void {
    this.resetProductCreateForm();
  }

  private resetProductCreateForm(): void {
    this.productFormError.set(null);
    this.productSku.set('');
    this.productName.set('');
    this.productDescription.set('');
    this.productCategoryCode.set('');
    this.productBrandCode.set('');
    this.productUomCode.set('');
    this.productIsLotControlled.set(false);
    this.productIsSerialControlled.set(false);
    this.showProductCreateForm.set(false);
  }
```

- Add these keys to the `t()` computed's returned object:

```ts
      newProductAction: en ? 'New product' : 'Sản phẩm mới',
      newProductTitle: en ? 'New product' : 'Sản phẩm mới',
      newProductSubtitle: en ? 'SKU, name, and classification' : 'SKU, tên và phân loại',
      sku: en ? 'SKU' : 'SKU',
      name: en ? 'Name' : 'Tên',
      description: en ? 'Description' : 'Mô tả',
      category: en ? 'Category' : 'Nhóm',
      brand: en ? 'Brand' : 'Thương hiệu',
      uom: en ? 'Unit of measure' : 'Đơn vị tính',
      lotControlled: en ? 'Lot-controlled' : 'Theo lô',
      serialControlled: en ? 'Serial-controlled' : 'Theo serial',
      save: en ? 'Save' : 'Lưu',
      cancel: en ? 'Cancel' : 'Huỷ',
      skuNameRequiredError: en ? 'SKU and Name are required.' : 'Cần nhập SKU và tên.',
      duplicateSkuError: (sku: string) => (en ? `SKU '${sku}' is already in use.` : `SKU '${sku}' đã được sử dụng.`),
```

- [ ] **Step 3: Run the spec to verify it passes**

Run: `pnpm nx test ikho-ui --skip-nx-cache --include='**/office-catalogue.spec.ts'` (from `source/`)
Expected: all tests PASS, including the 4 tests added in Step 1.

- [ ] **Step 4: Commit**

```bash
git add source/apps/ikho-ui/src/app/features/office/catalogue/office-catalogue.ts source/apps/ikho-ui/src/app/features/office/catalogue/office-catalogue.spec.ts
git commit -m "feat(ikho-ui): add product create panel to OfficeCatalogue"
```

---

### Task 6: Category/Brand/UoM detail-panel wiring and create panels

**Files:**
- Modify: `source/apps/ikho-ui/src/app/features/office/catalogue/office-catalogue.ts`
- Modify: `source/apps/ikho-ui/src/app/features/office/catalogue/office-catalogue.spec.ts`

**Interfaces:**
- Consumes: `ReferenceEntityDetailPanel`/`ReferenceEntityLabels` (Task 2), `CatalogStore.addCategory/updateCategory/addBrand/updateBrand/addUom/updateUom` (Task 1).
- Produces: `OfficeCatalogue` gains, for each of Categories/Brands/UoM: `selected*Code`, `selected*` (computed), `on*RowClick`, `on*ToggleStatus`, `on*SaveDetails`, `show*CreateForm`, `*Code`/`*Name` form signals, `*FormError`, `submit*Create()`, `cancel*Create()` — and completes the header action button's remaining three branches.

- [ ] **Step 1: Add the failing tests for all three sections' wiring**

Append to `office-catalogue.spec.ts`:

```ts
  it('clicking a category row opens its detail panel', () => {
    const fixture = TestBed.createComponent(OfficeCatalogue);
    fixture.detectChanges();
    const instance = fixture.componentInstance as unknown as { activeSection: { set: (v: string) => void } };
    instance.activeSection.set('categories');
    fixture.detectChanges();

    const rows = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('[role="button"]'));
    const row = rows.find((r) => r.textContent?.includes('RACK'));
    (row as HTMLElement)?.click();
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Category detail');
  });

  it('deactivating a category from its detail panel flips its status in the store', () => {
    const fixture = TestBed.createComponent(OfficeCatalogue);
    fixture.detectChanges();
    const instance = fixture.componentInstance as unknown as {
      activeSection: { set: (v: string) => void };
      selectedCategoryCode: { set: (v: string) => void };
      store: { categories: () => { code: string; isActive: boolean }[] };
    };
    instance.activeSection.set('categories');
    instance.selectedCategoryCode.set('RACK');
    fixture.detectChanges();

    (fixture.nativeElement as HTMLElement).querySelectorAll('button').forEach((b) => {
      if (b.textContent?.includes('Deactivate')) b.click();
    });
    fixture.detectChanges();

    expect(instance.store.categories().find((c) => c.code === 'RACK')?.isActive).toBe(false);
  });

  it('creating a category with a valid form adds a row and clears the form', () => {
    const fixture = TestBed.createComponent(OfficeCatalogue);
    fixture.detectChanges();
    const sectionInstance = fixture.componentInstance as unknown as { activeSection: { set: (v: string) => void } };
    sectionInstance.activeSection.set('categories');
    fixture.detectChanges();

    (fixture.nativeElement as HTMLElement).querySelectorAll('button').forEach((b) => {
      if (b.textContent?.includes('New category')) b.click();
    });
    fixture.detectChanges();

    const instance = fixture.componentInstance as unknown as {
      categoryCode: { set: (v: string) => void };
      categoryName: { set: (v: string) => void };
      showCategoryCreateForm: () => boolean;
    };
    instance.categoryCode.set('ELEC');
    instance.categoryName.set('Electronics');
    fixture.detectChanges();

    (fixture.nativeElement as HTMLElement).querySelectorAll('button').forEach((b) => {
      if (b.textContent === 'Save') b.click();
    });
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('ELEC');
    expect(instance.showCategoryCreateForm()).toBe(false);
  });

  it('clicking a brand row opens its detail panel and creating a brand works', () => {
    const fixture = TestBed.createComponent(OfficeCatalogue);
    fixture.detectChanges();
    const sectionInstance = fixture.componentInstance as unknown as { activeSection: { set: (v: string) => void } };
    sectionInstance.activeSection.set('brands');
    fixture.detectChanges();

    const rows = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('[role="button"]'));
    const row = rows.find((r) => r.textContent?.includes('VDB'));
    (row as HTMLElement)?.click();
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Brand detail');

    (fixture.nativeElement as HTMLElement).querySelectorAll('button').forEach((b) => {
      if (b.textContent?.includes('New brand')) b.click();
    });
    fixture.detectChanges();

    const instance = fixture.componentInstance as unknown as {
      brandCode: { set: (v: string) => void };
      brandName: { set: (v: string) => void };
    };
    instance.brandCode.set('ACME');
    instance.brandName.set('Acme Co');
    fixture.detectChanges();

    (fixture.nativeElement as HTMLElement).querySelectorAll('button').forEach((b) => {
      if (b.textContent === 'Save') b.click();
    });
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('ACME');
  });

  it('clicking a UoM row opens its detail panel and creating a UoM works', () => {
    const fixture = TestBed.createComponent(OfficeCatalogue);
    fixture.detectChanges();
    const sectionInstance = fixture.componentInstance as unknown as { activeSection: { set: (v: string) => void } };
    sectionInstance.activeSection.set('uom');
    fixture.detectChanges();

    const rows = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('[role="button"]'));
    const row = rows.find((r) => r.textContent?.includes('EA'));
    (row as HTMLElement)?.click();
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Unit of measure detail');

    (fixture.nativeElement as HTMLElement).querySelectorAll('button').forEach((b) => {
      if (b.textContent?.includes('New unit of measure')) b.click();
    });
    fixture.detectChanges();

    const instance = fixture.componentInstance as unknown as {
      uomCode: { set: (v: string) => void };
      uomName: { set: (v: string) => void };
    };
    instance.uomCode.set('KG');
    instance.uomName.set('Kilogram');
    fixture.detectChanges();

    (fixture.nativeElement as HTMLElement).querySelectorAll('button').forEach((b) => {
      if (b.textContent === 'Save') b.click();
    });
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('KG');
  });

  it('switching sections clears a stale open create form and the selected detail panel', () => {
    const fixture = TestBed.createComponent(OfficeCatalogue);
    fixture.detectChanges();

    const rows = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('[role="button"]'));
    (rows.find((r) => r.textContent?.includes('IKH-482910')) as HTMLElement)?.click();
    fixture.detectChanges();

    (fixture.nativeElement as HTMLElement).querySelectorAll('button').forEach((b) => {
      if (b.textContent?.includes('New product')) b.click();
    });
    fixture.detectChanges();

    const instance = fixture.componentInstance as unknown as {
      productSku: { set: (v: string) => void };
      productFormError: () => string | null;
      showProductCreateForm: () => boolean;
      selectedProductSku: () => string | null;
      activeSection: { set: (v: string) => void };
    };
    instance.productSku.set('IKH-333333');
    fixture.detectChanges();

    (fixture.nativeElement as HTMLElement).querySelectorAll('button').forEach((b) => {
      if (b.textContent === 'Save') b.click(); // missing name -> error, form stays open with stale sku
    });
    fixture.detectChanges();
    expect(instance.showProductCreateForm()).toBe(true);
    expect(instance.selectedProductSku()).toBe('IKH-482910');

    instance.activeSection.set('categories');
    fixture.detectChanges();
    instance.activeSection.set('products');
    fixture.detectChanges();

    expect(instance.showProductCreateForm()).toBe(false);
    expect(instance.selectedProductSku()).toBeNull();
  });
```

- [ ] **Step 2: Wire the class and complete the header button**

In `office-catalogue.ts`:
- Add `import { ReferenceEntityDetailPanel, ReferenceEntityLabels } from './reference-entity-detail-panel';` and add `ReferenceEntityDetailPanel` to the `@Component` `imports` array.
- Complete the header button block (added in Task 5) with the remaining three branches:

```html
        @if (activeSection() === 'products') {
          <lib-button variant="primary" (click)="showProductCreateForm.set(true)">{{ t().newProductAction }}</lib-button>
        } @else if (activeSection() === 'categories') {
          <lib-button variant="primary" (click)="showCategoryCreateForm.set(true)">{{ t().newCategoryAction }}</lib-button>
        } @else if (activeSection() === 'brands') {
          <lib-button variant="primary" (click)="showBrandCreateForm.set(true)">{{ t().newBrandAction }}</lib-button>
        } @else {
          <lib-button variant="primary" (click)="showUomCreateForm.set(true)">{{ t().newUomAction }}</lib-button>
        }
```

- Replace the Categories branch's `lib-data-panel` block:

```html
        <lib-data-panel [title]="t().categoriesPanelTitle">
          <lib-data-table [columns]="codeNameColumns()" [rows]="filteredCategoryRows()" [emptyLabel]="t().noCategories" />
        </lib-data-panel>
        <!-- CATEGORIES_SECTION_EXTRA -->
```

with:

```html
        @if (showCategoryCreateForm()) {
          <lib-data-panel [title]="t().newCategoryTitle" [subtitle]="t().newCodeNameSubtitle">
            <div class="flex flex-col gap-4">
              <div class="grid grid-cols-2 gap-4">
                <lib-text-input [label]="t().colCode" [value]="categoryCode()" (valueChange)="categoryCode.set($event)" />
                <lib-text-input [label]="t().colName" [value]="categoryName()" (valueChange)="categoryName.set($event)" />
              </div>
              @if (categoryFormError(); as err) {
                <span class="font-core text-xs text-status-out-of-stock">{{ err }}</span>
              }
              <div class="flex gap-3">
                <lib-button variant="primary" (click)="submitCategoryCreate()">{{ t().save }}</lib-button>
                <lib-button variant="ghost" (click)="cancelCategoryCreate()">{{ t().cancel }}</lib-button>
              </div>
            </div>
          </lib-data-panel>
        }
        <div class="flex items-start gap-5">
          <div class="min-w-0 flex-1">
            <lib-data-panel [title]="t().categoriesPanelTitle">
              <lib-data-table [columns]="codeNameColumns()" [rows]="filteredCategoryRows()" [emptyLabel]="t().noCategories" [clickable]="true" (rowClick)="onCategoryRowClick($event)" />
            </lib-data-panel>
          </div>
          @if (selectedCategory(); as c) {
            <app-reference-entity-detail-panel
              [entity]="c"
              [labels]="categoryLabels()"
              (closePanel)="selectedCategoryCode.set(null)"
              (toggleStatus)="onCategoryToggleStatus()"
              (saveDetails)="onCategorySaveDetails($event)"
            />
          }
        </div>
```

- Replace the Brands branch's `lib-data-panel` block:

```html
        <lib-data-panel [title]="t().brandsPanelTitle">
          <lib-data-table [columns]="codeNameColumns()" [rows]="filteredBrandRows()" [emptyLabel]="t().noBrands" />
        </lib-data-panel>
        <!-- BRANDS_SECTION_EXTRA -->
```

with:

```html
        @if (showBrandCreateForm()) {
          <lib-data-panel [title]="t().newBrandTitle" [subtitle]="t().newCodeNameSubtitle">
            <div class="flex flex-col gap-4">
              <div class="grid grid-cols-2 gap-4">
                <lib-text-input [label]="t().colCode" [value]="brandCode()" (valueChange)="brandCode.set($event)" />
                <lib-text-input [label]="t().colName" [value]="brandName()" (valueChange)="brandName.set($event)" />
              </div>
              @if (brandFormError(); as err) {
                <span class="font-core text-xs text-status-out-of-stock">{{ err }}</span>
              }
              <div class="flex gap-3">
                <lib-button variant="primary" (click)="submitBrandCreate()">{{ t().save }}</lib-button>
                <lib-button variant="ghost" (click)="cancelBrandCreate()">{{ t().cancel }}</lib-button>
              </div>
            </div>
          </lib-data-panel>
        }
        <div class="flex items-start gap-5">
          <div class="min-w-0 flex-1">
            <lib-data-panel [title]="t().brandsPanelTitle">
              <lib-data-table [columns]="codeNameColumns()" [rows]="filteredBrandRows()" [emptyLabel]="t().noBrands" [clickable]="true" (rowClick)="onBrandRowClick($event)" />
            </lib-data-panel>
          </div>
          @if (selectedBrand(); as b) {
            <app-reference-entity-detail-panel
              [entity]="b"
              [labels]="brandLabels()"
              (closePanel)="selectedBrandCode.set(null)"
              (toggleStatus)="onBrandToggleStatus()"
              (saveDetails)="onBrandSaveDetails($event)"
            />
          }
        </div>
```

- Replace the UoM branch's `lib-data-panel` block:

```html
        <lib-data-panel [title]="t().uomPanelTitle">
          <lib-data-table [columns]="codeNameColumns()" [rows]="filteredUomRows()" [emptyLabel]="t().noUom" />
        </lib-data-panel>
        <!-- UOM_SECTION_EXTRA -->
```

with:

```html
        @if (showUomCreateForm()) {
          <lib-data-panel [title]="t().newUomTitle" [subtitle]="t().newCodeNameSubtitle">
            <div class="flex flex-col gap-4">
              <div class="grid grid-cols-2 gap-4">
                <lib-text-input [label]="t().colCode" [value]="uomCode()" (valueChange)="uomCode.set($event)" />
                <lib-text-input [label]="t().colName" [value]="uomName()" (valueChange)="uomName.set($event)" />
              </div>
              @if (uomFormError(); as err) {
                <span class="font-core text-xs text-status-out-of-stock">{{ err }}</span>
              }
              <div class="flex gap-3">
                <lib-button variant="primary" (click)="submitUomCreate()">{{ t().save }}</lib-button>
                <lib-button variant="ghost" (click)="cancelUomCreate()">{{ t().cancel }}</lib-button>
              </div>
            </div>
          </lib-data-panel>
        }
        <div class="flex items-start gap-5">
          <div class="min-w-0 flex-1">
            <lib-data-panel [title]="t().uomPanelTitle">
              <lib-data-table [columns]="codeNameColumns()" [rows]="filteredUomRows()" [emptyLabel]="t().noUom" [clickable]="true" (rowClick)="onUomRowClick($event)" />
            </lib-data-panel>
          </div>
          @if (selectedUom(); as u) {
            <app-reference-entity-detail-panel
              [entity]="u"
              [labels]="uomLabels()"
              (closePanel)="selectedUomCode.set(null)"
              (toggleStatus)="onUomToggleStatus()"
              (saveDetails)="onUomSaveDetails($event)"
            />
          }
        </div>
```

- Replace `selectSection()`'s body to also reset every form and selection:

```ts
  protected selectSection(section: CatalogueSection): void {
    this.activeSection.set(section);
    this.query.set('');
    this.resetProductCreateForm();
    this.resetCategoryCreateForm();
    this.resetBrandCreateForm();
    this.resetUomCreateForm();
    this.selectedProductSku.set(null);
    this.selectedCategoryCode.set(null);
    this.selectedBrandCode.set(null);
    this.selectedUomCode.set(null);
  }
```

- Add these members to the class (after `productFormError`):

```ts
  protected readonly selectedCategoryCode = signal<string | null>(null);
  protected readonly selectedBrandCode = signal<string | null>(null);
  protected readonly selectedUomCode = signal<string | null>(null);

  protected readonly selectedCategory = computed(() => {
    const code = this.selectedCategoryCode();
    if (!code) return null;
    return this.store.categories().find((c) => c.code === code) ?? null;
  });

  protected readonly selectedBrand = computed(() => {
    const code = this.selectedBrandCode();
    if (!code) return null;
    return this.store.brands().find((b) => b.code === code) ?? null;
  });

  protected readonly selectedUom = computed(() => {
    const code = this.selectedUomCode();
    if (!code) return null;
    return this.store.unitsOfMeasure().find((u) => u.code === code) ?? null;
  });

  protected readonly categoryLabels = computed<ReferenceEntityLabels>(() => {
    const t = this.t();
    return { eyebrow: t.categoryDetailEyebrow, name: t.colName, save: t.save, cancel: t.cancel, edit: t.editName, active: t.active, inactive: t.inactive, activate: t.activate, deactivate: t.deactivate, close: t.close, requiredError: t.nameRequiredError };
  });

  protected readonly brandLabels = computed<ReferenceEntityLabels>(() => {
    const t = this.t();
    return { eyebrow: t.brandDetailEyebrow, name: t.colName, save: t.save, cancel: t.cancel, edit: t.editName, active: t.active, inactive: t.inactive, activate: t.activate, deactivate: t.deactivate, close: t.close, requiredError: t.nameRequiredError };
  });

  protected readonly uomLabels = computed<ReferenceEntityLabels>(() => {
    const t = this.t();
    return { eyebrow: t.uomDetailEyebrow, name: t.colName, save: t.save, cancel: t.cancel, edit: t.editName, active: t.active, inactive: t.inactive, activate: t.activate, deactivate: t.deactivate, close: t.close, requiredError: t.nameRequiredError };
  });

  protected readonly showCategoryCreateForm = signal(false);
  protected readonly categoryCode = signal('');
  protected readonly categoryName = signal('');
  protected readonly categoryFormError = signal<string | null>(null);

  protected readonly showBrandCreateForm = signal(false);
  protected readonly brandCode = signal('');
  protected readonly brandName = signal('');
  protected readonly brandFormError = signal<string | null>(null);

  protected readonly showUomCreateForm = signal(false);
  protected readonly uomCode = signal('');
  protected readonly uomName = signal('');
  protected readonly uomFormError = signal<string | null>(null);
```

- Add these keys to the `t()` computed's returned object:

```ts
      editName: en ? 'Edit name' : 'Sửa tên',
      active: en ? 'Active' : 'Hoạt động',
      inactive: en ? 'Inactive' : 'Ngừng hoạt động',
      activate: en ? 'Activate' : 'Kích hoạt',
      deactivate: en ? 'Deactivate' : 'Vô hiệu hoá',
      close: en ? 'Close' : 'Đóng',
      nameRequiredError: en ? 'Name is required.' : 'Cần nhập tên.',
      categoryDetailEyebrow: en ? 'Category detail' : 'Chi tiết nhóm',
      brandDetailEyebrow: en ? 'Brand detail' : 'Chi tiết thương hiệu',
      uomDetailEyebrow: en ? 'Unit of measure detail' : 'Chi tiết đơn vị tính',
      newCategoryAction: en ? 'New category' : 'Nhóm mới',
      newBrandAction: en ? 'New brand' : 'Thương hiệu mới',
      newUomAction: en ? 'New unit of measure' : 'Đơn vị tính mới',
      newCategoryTitle: en ? 'New category' : 'Nhóm mới',
      newBrandTitle: en ? 'New brand' : 'Thương hiệu mới',
      newUomTitle: en ? 'New unit of measure' : 'Đơn vị tính mới',
      newCodeNameSubtitle: en ? 'Code and name' : 'Mã và tên',
      codeRequiredError: en ? 'Code and Name are required.' : 'Cần nhập mã và tên.',
      duplicateCategoryCodeError: (code: string) => (en ? `Category code '${code}' is already in use.` : `Mã nhóm '${code}' đã được sử dụng.`),
      duplicateBrandCodeError: (code: string) => (en ? `Brand code '${code}' is already in use.` : `Mã thương hiệu '${code}' đã được sử dụng.`),
      duplicateUomCodeError: (code: string) => (en ? `Unit of measure code '${code}' is already in use.` : `Mã đơn vị tính '${code}' đã được sử dụng.`),
```

- Add these methods to the class (after `resetProductCreateForm`):

```ts
  protected onCategoryRowClick(row: Record<string, unknown>): void {
    this.selectedCategoryCode.set(String(row['code']));
  }

  protected onCategoryToggleStatus(): void {
    const c = this.selectedCategory();
    if (!c) return;
    this.store.updateCategory(c.code, { name: c.name, isActive: !c.isActive });
  }

  protected onCategorySaveDetails(input: { name: string }): void {
    const c = this.selectedCategory();
    if (!c) return;
    this.store.updateCategory(c.code, { name: input.name, isActive: c.isActive });
  }

  protected submitCategoryCreate(): void {
    const code = this.categoryCode().trim();
    const name = this.categoryName().trim();
    if (!code || !name) {
      this.categoryFormError.set(this.t().codeRequiredError);
      return;
    }
    const outcome = this.store.addCategory({ code, name });
    if (outcome === 'invalid') {
      this.categoryFormError.set(this.t().codeRequiredError);
      return;
    }
    if (outcome === 'duplicate-code') {
      this.categoryFormError.set(this.t().duplicateCategoryCodeError(code));
      return;
    }
    this.resetCategoryCreateForm();
  }

  protected cancelCategoryCreate(): void {
    this.resetCategoryCreateForm();
  }

  private resetCategoryCreateForm(): void {
    this.categoryFormError.set(null);
    this.categoryCode.set('');
    this.categoryName.set('');
    this.showCategoryCreateForm.set(false);
  }

  protected onBrandRowClick(row: Record<string, unknown>): void {
    this.selectedBrandCode.set(String(row['code']));
  }

  protected onBrandToggleStatus(): void {
    const b = this.selectedBrand();
    if (!b) return;
    this.store.updateBrand(b.code, { name: b.name, isActive: !b.isActive });
  }

  protected onBrandSaveDetails(input: { name: string }): void {
    const b = this.selectedBrand();
    if (!b) return;
    this.store.updateBrand(b.code, { name: input.name, isActive: b.isActive });
  }

  protected submitBrandCreate(): void {
    const code = this.brandCode().trim();
    const name = this.brandName().trim();
    if (!code || !name) {
      this.brandFormError.set(this.t().codeRequiredError);
      return;
    }
    const outcome = this.store.addBrand({ code, name });
    if (outcome === 'invalid') {
      this.brandFormError.set(this.t().codeRequiredError);
      return;
    }
    if (outcome === 'duplicate-code') {
      this.brandFormError.set(this.t().duplicateBrandCodeError(code));
      return;
    }
    this.resetBrandCreateForm();
  }

  protected cancelBrandCreate(): void {
    this.resetBrandCreateForm();
  }

  private resetBrandCreateForm(): void {
    this.brandFormError.set(null);
    this.brandCode.set('');
    this.brandName.set('');
    this.showBrandCreateForm.set(false);
  }

  protected onUomRowClick(row: Record<string, unknown>): void {
    this.selectedUomCode.set(String(row['code']));
  }

  protected onUomToggleStatus(): void {
    const u = this.selectedUom();
    if (!u) return;
    this.store.updateUom(u.code, { name: u.name, isActive: !u.isActive });
  }

  protected onUomSaveDetails(input: { name: string }): void {
    const u = this.selectedUom();
    if (!u) return;
    this.store.updateUom(u.code, { name: input.name, isActive: u.isActive });
  }

  protected submitUomCreate(): void {
    const code = this.uomCode().trim();
    const name = this.uomName().trim();
    if (!code || !name) {
      this.uomFormError.set(this.t().codeRequiredError);
      return;
    }
    const outcome = this.store.addUom({ code, name });
    if (outcome === 'invalid') {
      this.uomFormError.set(this.t().codeRequiredError);
      return;
    }
    if (outcome === 'duplicate-code') {
      this.uomFormError.set(this.t().duplicateUomCodeError(code));
      return;
    }
    this.resetUomCreateForm();
  }

  protected cancelUomCreate(): void {
    this.resetUomCreateForm();
  }

  private resetUomCreateForm(): void {
    this.uomFormError.set(null);
    this.uomCode.set('');
    this.uomName.set('');
    this.showUomCreateForm.set(false);
  }
```

- [ ] **Step 3: Run the spec to verify it passes**

Run: `pnpm nx test ikho-ui --skip-nx-cache --include='**/office-catalogue.spec.ts'` (from `source/`)
Expected: all tests PASS, including the 6 tests added in Step 1.

- [ ] **Step 4: Commit**

```bash
git add source/apps/ikho-ui/src/app/features/office/catalogue/office-catalogue.ts source/apps/ikho-ui/src/app/features/office/catalogue/office-catalogue.spec.ts
git commit -m "feat(ikho-ui): wire Category/Brand/UoM detail panels and create forms into OfficeCatalogue"
```

---

### Task 7: Final verification and rollout doc update

**Files:**
- Modify: `docs/plans/catalogue-inventory-rollout-plan.md`

**Interfaces:**
- Consumes: nothing new — this task only runs verification commands and updates tracking documentation.

- [ ] **Step 1: Run the full test suite**

Run: `pnpm nx test ikho-ui --skip-nx-cache` (from `source/`)
Expected: all tests pass, including every `catalogue-store.spec.ts`, `reference-entity-detail-panel.spec.ts`, `product-detail-panel.spec.ts`, and `office-catalogue.spec.ts` test written in Tasks 1–6, alongside every pre-existing test in the app (234 tests existed before this plan; expect that count plus every new test added above).

- [ ] **Step 2: Run lint**

Run: `pnpm nx lint ikho-ui --skip-nx-cache` (from `source/`)
Expected: 0 errors. In particular, confirm no `@angular-eslint/no-output-native` violation exists anywhere in `features/office/catalogue/*.ts` (`grep -rn "output<" source/apps/ikho-ui/src/app/features/office/catalogue/*.ts` and manually confirm none are named `close`).

- [ ] **Step 3: Run the production build**

Run: `pnpm nx build ikho-ui --skip-nx-cache` (from `source/`)
Expected: clean build, with the `office-catalogue` lazy chunk emitted (its content has changed size significantly from the old placeholder version, which is expected).

- [ ] **Step 4: Manual smoke test**

Start the dev server (`pnpm nx serve ikho-ui` from `source/`) and, using a browser, walk through:
1. Navigate to `/office/catalogue`. Confirm the 4 KPI tiles render with non-zero values and the Products table shows 10 rows with resolved category/brand names (not raw codes).
2. Click "Categories" — confirm the table switches to 4 rows (RACK/CONS/PACK/EQIP) and EQIP shows an Inactive badge.
3. Click a product row (e.g. `IKH-482910`) — confirm the detail panel opens showing its resolved Category/Brand/UoM names, tracking label, and one barcode.
4. Click "Add barcode", enter a code already used by a different product (e.g. `8712345330298`), submit — confirm a duplicate error appears and the barcode is not added.
5. Enter a genuinely new barcode, submit — confirm it appears in the list and the form closes.
6. Click "Edit details", change the product's Category picker, submit — confirm the detail panel's Category field updates and the Products table's Category column updates too.
7. Click "Deactivate" — confirm the status badge flips to Inactive in both the detail panel and the table row.
8. Click "New product", fill in a SKU/Name, submit — confirm a new row appears and the form closes. Try submitting a duplicate SKU — confirm the specific duplicate-sku error appears.
9. Switch to Categories, click "New category", fill in Code/Name, submit — confirm a new row appears.
10. Switch to Brands then Units of Measure — confirm each table renders its own seeded rows, and that switching sections after opening a create form (without submitting) leaves no stale state when you return to it.
11. Search within each of the 4 sections — confirm results narrow correctly and the bilingual "no results" label appears for a non-matching query.
12. Switch the app's language toggle to Vietnamese — confirm every label across all 4 sections (KPIs, column headers, status badges, form labels, error messages) switches language with no leftover English strings.

If any step fails, treat it as a real defect — do not mark this task complete until every step passes.

- [ ] **Step 5: Update the rollout tracking doc**

In `docs/plans/catalogue-inventory-rollout-plan.md`, replace the Catalogue row:

```markdown
| 1 | Catalogue | — | — | Not started |
```

with:

```markdown
| 1 | Catalogue | [2026-08-15-catalogue-ui-design.md](../superpowers/specs/2026-08-15-catalogue-ui-design.md) | [2026-08-15-catalogue-ui.md](../superpowers/plans/2026-08-15-catalogue-ui.md) | Implemented |
```

- [ ] **Step 6: Commit**

```bash
git add docs/plans/catalogue-inventory-rollout-plan.md
git commit -m "docs: Mark Catalogue UI implemented in the rollout tracking doc"
```
