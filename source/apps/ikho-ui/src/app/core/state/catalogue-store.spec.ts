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
