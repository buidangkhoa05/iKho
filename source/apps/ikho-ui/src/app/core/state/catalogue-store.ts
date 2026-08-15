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
    const target = this.products().find((p) => p.sku === sku);
    if (!target || target.isActive === isActive) return; // true no-op — don't touch the signal

    this.products.update((list) => list.map((p) => (p.sku === sku ? { ...p, isActive } : p)));
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
