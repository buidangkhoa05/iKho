import { provideRouter } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { OfficeOutbound } from './office-outbound';

describe('OfficeOutbound', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OfficeOutbound],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('renders the sales orders table with seeded rows', () => {
    const fixture = TestBed.createComponent(OfficeOutbound);
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('SO-88214');
    expect(text).toContain('Meijer Retail Group');
  });

  it('opens the create-sales-order form when the primary action fires, and adds a row on submit', () => {
    const fixture = TestBed.createComponent(OfficeOutbound);
    fixture.detectChanges();

    const instance = fixture.componentInstance as unknown as {
      showCreateForm: { set: (v: boolean) => void };
      formCustomer: { set: (v: string) => void };
      formDock: { set: (v: string) => void };
      formCutoff: { set: (v: string) => void };
      updateLineSku: (i: number, v: string) => void;
      updateLineQty: (i: number, v: string) => void;
      submitCreate: () => void;
    };

    instance.showCreateForm.set(true);
    instance.formCustomer.set('New Retail BV');
    instance.formDock.set('Dock 5');
    instance.formCutoff.set('16:00');
    instance.updateLineSku(0, 'IKH-482910');
    instance.updateLineQty(0, '10');
    instance.submitCreate();
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('New Retail BV');
  });

  it('allocating an unallocated order via its detail action updates its status, and an insufficient-stock order surfaces the error', () => {
    const fixture = TestBed.createComponent(OfficeOutbound);
    fixture.detectChanges();

    const instance = fixture.componentInstance as unknown as {
      detail: () => (row: Record<string, unknown>) => { action?: { label: string; onClick: () => void } };
      allocateError: () => string | null;
    };

    const detailFn = instance.detail();
    const openOrderRow = { so: 'SO-88208', customer: 'Hafen Bremen GmbH', dock: 'Dock 1', cutoff: '17:00', status: 'inbound', label: { en: 'Open', vi: 'Đang mở' }, lines: [{ sku: 'IKH-664120', productName: { en: 'Pallet wrap film, 500mm', vi: 'Màng quấn pallet, 500mm' }, orderedQty: 32, allocatedQty: 0 }] };

    const panel = detailFn(openOrderRow);
    expect(panel.action).toBeTruthy();

    panel.action!.onClick();
    fixture.detectChanges();

    expect(instance.allocateError()).toContain('Insufficient stock');
  });
});
