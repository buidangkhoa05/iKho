import { Router } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { ReturnsStore } from '../../../core/state/returns-store';
import { OperatorReturnsInspect } from './operator-returns-inspect';

describe('OperatorReturnsInspect', () => {
  let navigateCalls: unknown[][];

  beforeEach(async () => {
    navigateCalls = [];
    await TestBed.configureTestingModule({
      imports: [OperatorReturnsInspect],
      providers: [
        { provide: Router, useValue: { navigate: (...args: unknown[]) => navigateCalls.push(args) } },
      ],
    }).compileComponents();
  });

  it('shows the order lines and return reason for the given rma', () => {
    const fixture = TestBed.createComponent(OperatorReturnsInspect);
    fixture.componentRef.setInput('rma', 'RMA-0337');
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Hafen Bremen GmbH');
    expect(text).toContain('Steel shelving bracket');
  });

  it('submitting a result calls the store, moves the order to the inspected stage, and navigates back', () => {
    const store = TestBed.inject(ReturnsStore);
    const fixture = TestBed.createComponent(OperatorReturnsInspect);
    fixture.componentRef.setInput('rma', 'RMA-0337');
    fixture.detectChanges();

    (fixture.componentInstance as unknown as { submit: (r: 'Good' | 'Damaged' | 'Defective') => void }).submit('Good');

    const order = store.returnOrders().find((o) => o.rma === 'RMA-0337')!;
    expect(order.stage).toBe('inspected');
    expect(order.inspectionResult).toBe('Good');
    expect(navigateCalls[0][0]).toEqual(['/operator/returns']);
  });

  it('surfaces the store error and does not navigate if the order is not awaiting inspection', () => {
    const fixture = TestBed.createComponent(OperatorReturnsInspect);
    fixture.componentRef.setInput('rma', 'RMA-0340'); // already inspected
    fixture.detectChanges();

    (fixture.componentInstance as unknown as { submit: (r: 'Good' | 'Damaged' | 'Defective') => void }).submit('Good');
    fixture.detectChanges();

    const instance = fixture.componentInstance as unknown as { inspectError: () => string | null };
    expect(instance.inspectError()).toContain('not awaiting inspection');
    expect(navigateCalls.length).toBe(0);
  });

  it('hides the result buttons and shows an already-inspected message for an order not awaiting inspection', () => {
    const fixture = TestBed.createComponent(OperatorReturnsInspect);
    fixture.componentRef.setInput('rma', 'RMA-0340'); // already inspected
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    const buttons = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button'));
    expect(buttons.length).toBe(0);
    expect(text).toContain('already been inspected');
  });
});
