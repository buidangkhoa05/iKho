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
    expect(panel.fields.some((f) => f.value.includes('Customer return'))).toBe(true);
    expect(panel.fields.some((f) => f.value.includes('Damaged'))).toBe(true);
    expect(panel.fields.some((f) => f.value.includes('Scrap'))).toBe(true);
  });
});
