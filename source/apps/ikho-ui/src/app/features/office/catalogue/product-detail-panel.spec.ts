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
