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

    // Filter to type="text" specifically — the page's own Products search box (type="search",
    // always rendered above the table) would otherwise be matched first by a looser selector.
    const inputs = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('input'));
    const barcodeInput = inputs.find((i) => i.type === 'text');
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
});
