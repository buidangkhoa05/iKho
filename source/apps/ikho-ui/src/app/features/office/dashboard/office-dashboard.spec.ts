import { provideRouter } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { InboundStore } from '../../../core/state/inbound-store';
import { OfficeDashboard } from './office-dashboard';

describe('OfficeDashboard', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OfficeDashboard],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('renders receipts sourced from the InboundStore, not the static mock array', () => {
    const store = TestBed.inject(InboundStore);
    const fixture = TestBed.createComponent(OfficeDashboard);
    fixture.detectChanges();

    store.recordDockReceipt('PO-10490', [{ sku: 'IKH-770145', qty: 24 }]);
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    const newReceipt = store.receipts()[0];
    expect(text).toContain(newReceipt.id);
    expect(text).toContain('EuroPallet NV');
  });
});
