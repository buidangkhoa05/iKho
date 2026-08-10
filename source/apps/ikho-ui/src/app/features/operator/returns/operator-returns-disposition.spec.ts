import { Router } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { ReturnsStore } from '../../../core/state/returns-store';
import { OperatorReturnsDisposition } from './operator-returns-disposition';

describe('OperatorReturnsDisposition', () => {
  let navigateCalls: unknown[][];

  beforeEach(async () => {
    navigateCalls = [];
    await TestBed.configureTestingModule({
      imports: [OperatorReturnsDisposition],
      providers: [
        { provide: Router, useValue: { navigate: (...args: unknown[]) => navigateCalls.push(args) } },
      ],
    }).compileComponents();
  });

  it('shows the order lines and inspection result for the given rma', () => {
    const fixture = TestBed.createComponent(OperatorReturnsDisposition);
    fixture.componentRef.setInput('rma', 'RMA-0340');
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Meijer Retail Group');
    expect(text).toContain('Void fill paper');
    expect(text).toContain('Damaged');
  });

  it('shows only the outcome buttons allowed for the recorded inspection result', () => {
    const fixture = TestBed.createComponent(OperatorReturnsDisposition);
    fixture.componentRef.setInput('rma', 'RMA-0340'); // inspected as Damaged
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Quarantine');
    expect(text).toContain('Scrap');
    expect(text).toContain('Vendor return');
    expect(text).not.toContain('Restock');
  });

  it('submitting an allowed outcome calls the store, moves the order to the dispositioned stage, and navigates back', () => {
    const store = TestBed.inject(ReturnsStore);
    const fixture = TestBed.createComponent(OperatorReturnsDisposition);
    fixture.componentRef.setInput('rma', 'RMA-0340');
    fixture.detectChanges();

    (fixture.componentInstance as unknown as { submit: (o: 'Restock' | 'Quarantine' | 'Scrap' | 'VendorReturn') => void }).submit('Scrap');

    const order = store.returnOrders().find((o) => o.rma === 'RMA-0340')!;
    expect(order.stage).toBe('dispositioned');
    expect(order.dispositionOutcome).toBe('Scrap');
    expect(navigateCalls[0][0]).toEqual(['/operator/returns']);
  });

  it('surfaces the store error and does not navigate if the order is not awaiting disposition', () => {
    const fixture = TestBed.createComponent(OperatorReturnsDisposition);
    fixture.componentRef.setInput('rma', 'RMA-0331'); // already dispositioned
    fixture.detectChanges();

    (fixture.componentInstance as unknown as { submit: (o: 'Restock' | 'Quarantine' | 'Scrap' | 'VendorReturn') => void }).submit('Scrap');
    fixture.detectChanges();

    const instance = fixture.componentInstance as unknown as { dispositionError: () => string | null };
    expect(instance.dispositionError()).toContain('not awaiting disposition');
    expect(navigateCalls.length).toBe(0);
  });

  it('hides the outcome buttons and shows an already-dispositioned message for an order not awaiting disposition', () => {
    const fixture = TestBed.createComponent(OperatorReturnsDisposition);
    fixture.componentRef.setInput('rma', 'RMA-0331'); // already dispositioned
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    const buttons = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button'));
    expect(buttons.length).toBe(0);
    expect(text).toContain('already been dispositioned');
  });
});
