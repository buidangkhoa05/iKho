import { provideRouter } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { OfficeInbound } from './office-inbound';

describe('OfficeInbound', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OfficeInbound],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('renders the purchase orders table with seeded rows', () => {
    const fixture = TestBed.createComponent(OfficeInbound);
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('PO-10482');
    expect(text).toContain('Vanderberg Steel');
  });

  it('opens the create-purchase-order form when the primary action fires, and adds a row on submit', () => {
    const fixture = TestBed.createComponent(OfficeInbound);
    fixture.detectChanges();

    const instance = fixture.componentInstance as unknown as {
      showCreateForm: { set: (v: boolean) => void };
      formSupplier: { set: (v: string) => void };
      formDock: { set: (v: string) => void };
      updateLineSku: (i: number, v: string) => void;
      updateLineQty: (i: number, v: string) => void;
      submitCreate: () => void;
    };

    instance.showCreateForm.set(true);
    instance.formSupplier.set('New Supplier BV');
    instance.formDock.set('Dock 5');
    instance.updateLineSku(0, 'IKH-482910');
    instance.updateLineQty(0, '15');
    instance.submitCreate();
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('New Supplier BV');
  });
});
