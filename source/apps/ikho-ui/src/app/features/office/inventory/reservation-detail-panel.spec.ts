import { TestBed } from '@angular/core/testing';
import { StockReservation } from '../../../core/mock-data/inventory.data';
import { ReservationDetailPanel } from './reservation-detail-panel';

const ACTIVE: StockReservation = {
  id: 'RES-1', stockItemId: 'SI-8', sku: 'IKH-201884', warehouseCode: 'WH-1', quantity: 1, status: 'active',
  referenceType: 'SalesOrder', referenceId: 'SO-3301', createdOnUtc: '2024-08-01T09:00:00Z',
};

const RELEASED: StockReservation = {
  id: 'RES-2', stockItemId: 'SI-2', sku: 'IKH-330298', warehouseCode: 'WH-1', quantity: 5, status: 'released',
  referenceType: 'SalesOrder', referenceId: 'SO-3288', createdOnUtc: '2024-07-20T09:00:00Z', releasedOnUtc: '2024-07-25T09:00:00Z',
};

describe('ReservationDetailPanel', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [ReservationDetailPanel] }).compileComponents();
  });

  function create(reservation: StockReservation = ACTIVE) {
    const fixture = TestBed.createComponent(ReservationDetailPanel);
    fixture.componentRef.setInput('reservation', reservation);
    fixture.componentRef.setInput('productName', 'Hand pallet truck, 2.5t');
    fixture.componentRef.setInput('warehouseName', 'Rotterdam DC');
    fixture.detectChanges();
    return fixture;
  }

  it('renders sku, product/warehouse name, quantity, status, and reference', () => {
    const fixture = create();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('IKH-201884');
    expect(text).toContain('Hand pallet truck, 2.5t');
    expect(text).toContain('Rotterdam DC');
    expect(text).toContain('SalesOrder SO-3301');
  });

  it('shows a Release button for an active reservation', () => {
    const fixture = create(ACTIVE);
    const buttons = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button'));
    expect(buttons.some((b) => b.textContent?.includes('Release'))).toBe(true);
  });

  it('hides the Release button for a released reservation', () => {
    const fixture = create(RELEASED);
    const buttons = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button'));
    expect(buttons.some((b) => b.textContent?.includes('Release'))).toBe(false);
  });

  it('release emits when the Release button is clicked', () => {
    const fixture = create(ACTIVE);
    let emitted = false;
    fixture.componentInstance.release.subscribe(() => (emitted = true));
    const buttons = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button'));
    (buttons.find((b) => b.textContent?.includes('Release')) as HTMLElement)?.click();
    expect(emitted).toBe(true);
  });

  it('closePanel emits when the close button is clicked', () => {
    const fixture = create();
    let emitted = false;
    fixture.componentInstance.closePanel.subscribe(() => (emitted = true));
    (fixture.nativeElement as HTMLElement).querySelector('button[aria-label]')?.dispatchEvent(new Event('click', { bubbles: true }));
    expect(emitted).toBe(true);
  });

  it('setReleaseError surfaces a store-side outcome on the panel', () => {
    const fixture = create();
    fixture.componentInstance.setReleaseError('This reservation could not be found.');
    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('This reservation could not be found.');
  });

  it('resets the release error when the reservation input changes identity, including after a successful release', () => {
    const fixture = create(ACTIVE);
    const instance = fixture.componentInstance as unknown as { releaseError: () => string | null };
    fixture.componentInstance.setReleaseError('This reservation could not be found.');
    fixture.detectChanges();
    expect(instance.releaseError()).toBe('This reservation could not be found.');

    fixture.componentRef.setInput('reservation', { ...ACTIVE, status: 'released' as const, releasedOnUtc: '2024-08-02T09:00:00Z' });
    fixture.detectChanges();

    expect(instance.releaseError()).toBeNull();
  });
});
