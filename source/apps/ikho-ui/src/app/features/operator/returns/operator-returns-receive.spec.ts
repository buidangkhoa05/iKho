import { Router } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { ReturnsStore } from '../../../core/state/returns-store';
import { OperatorReturnsReceive } from './operator-returns-receive';

describe('OperatorReturnsReceive', () => {
  let navigateCalls: unknown[][];

  beforeEach(async () => {
    navigateCalls = [];
    await TestBed.configureTestingModule({
      imports: [OperatorReturnsReceive],
      providers: [
        { provide: Router, useValue: { navigate: (...args: unknown[]) => navigateCalls.push(args) } },
      ],
    }).compileComponents();
  });

  it('shows the order lines for the given rma', () => {
    const fixture = TestBed.createComponent(OperatorReturnsReceive);
    fixture.componentRef.setInput('rma', 'RMA-0343');
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Wrapline BV');
    expect(text).toContain('Pallet wrap film');
  });

  it('confirming receipt calls the store, moves the order to the received stage, and navigates back to the entry list', () => {
    const store = TestBed.inject(ReturnsStore);
    const fixture = TestBed.createComponent(OperatorReturnsReceive);
    fixture.componentRef.setInput('rma', 'RMA-0343');
    fixture.detectChanges();

    (fixture.componentInstance as unknown as { confirm: () => void }).confirm();

    expect(store.returnOrders().find((o) => o.rma === 'RMA-0343')!.stage).toBe('received');
    expect(navigateCalls[0][0]).toEqual(['/operator/returns']);
  });

  it('surfaces the store error and does not navigate if the order is not awaiting receipt', () => {
    const fixture = TestBed.createComponent(OperatorReturnsReceive);
    fixture.componentRef.setInput('rma', 'RMA-0337'); // already received
    fixture.detectChanges();

    (fixture.componentInstance as unknown as { confirm: () => void }).confirm();
    fixture.detectChanges();

    const instance = fixture.componentInstance as unknown as { receiveError: () => string | null };
    expect(instance.receiveError()).toContain('not awaiting receipt');
    expect(navigateCalls.length).toBe(0);
  });

  it('hides the confirm button and shows an already-received message for an order not awaiting receipt', () => {
    const fixture = TestBed.createComponent(OperatorReturnsReceive);
    fixture.componentRef.setInput('rma', 'RMA-0337'); // already received
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    const buttons = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button'));
    expect(buttons.length).toBe(0);
    expect(text).toContain('already been received');
  });
});
