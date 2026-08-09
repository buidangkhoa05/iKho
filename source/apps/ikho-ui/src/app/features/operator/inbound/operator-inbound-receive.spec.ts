import { Router } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { InboundStore } from '../../../core/state/inbound-store';
import { OperatorInboundReceive } from './operator-inbound-receive';

describe('OperatorInboundReceive', () => {
  let navigateCalls: unknown[][];

  beforeEach(async () => {
    navigateCalls = [];
    await TestBed.configureTestingModule({
      imports: [OperatorInboundReceive],
      providers: [
        { provide: Router, useValue: { navigate: (...args: unknown[]) => navigateCalls.push(args) } },
      ],
    }).compileComponents();
  });

  it('shows the current line for the given PO', () => {
    const fixture = TestBed.createComponent(OperatorInboundReceive);
    fixture.componentRef.setInput('poId', 'PO-10488');
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Barcode label roll');
    expect(text).toContain('IKH-330298');
  });

  it('flags a mismatch and requires a reason before confirming an exact-vs-entered quantity difference', () => {
    const fixture = TestBed.createComponent(OperatorInboundReceive);
    fixture.componentRef.setInput('poId', 'PO-10488');
    fixture.detectChanges();

    const instance = fixture.componentInstance as unknown as {
      qtyInput: { set: (v: string) => void };
      canConfirmLine: () => boolean;
      reasonInput: { set: (v: string) => void };
    };

    instance.qtyInput.set('3');
    fixture.detectChanges();
    expect(instance.canConfirmLine()).toBe(false);

    instance.reasonInput.set('Short-shipped');
    fixture.detectChanges();
    expect(instance.canConfirmLine()).toBe(true);
  });

  it('completing the last line moves to the summary view, and completing calls the store and navigates back', () => {
    const store = TestBed.inject(InboundStore);
    const fixture = TestBed.createComponent(OperatorInboundReceive);
    fixture.componentRef.setInput('poId', 'PO-10490');
    fixture.detectChanges();

    const instance = fixture.componentInstance as unknown as {
      qtyInput: { set: (v: string) => void };
      confirmLine: () => void;
      view: { (): string };
      complete: () => void;
    };

    instance.qtyInput.set('24');
    instance.confirmLine();
    fixture.detectChanges();

    expect(instance.view()).toBe('summary');

    const receiptsBefore = store.receipts().length;
    instance.complete();

    expect(store.receipts().length).toBe(receiptsBefore + 1);
    expect(navigateCalls[0][0]).toEqual(['/operator/inbound']);
  });
});
