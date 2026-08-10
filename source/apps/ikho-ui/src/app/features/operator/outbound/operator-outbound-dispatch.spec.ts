import { Router } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { OutboundStore } from '../../../core/state/outbound-store';
import { OperatorOutboundDispatch } from './operator-outbound-dispatch';

describe('OperatorOutboundDispatch', () => {
  let navigateCalls: unknown[][];

  beforeEach(async () => {
    navigateCalls = [];
    await TestBed.configureTestingModule({
      imports: [OperatorOutboundDispatch],
      providers: [
        { provide: Router, useValue: { navigate: (...args: unknown[]) => navigateCalls.push(args) } },
      ],
    }).compileComponents();
  });

  it('shows the order lines for the given soId', () => {
    const fixture = TestBed.createComponent(OperatorOutboundDispatch);
    fixture.componentRef.setInput('soId', 'SO-88219');
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Brico Bouwmarkt');
    expect(text).toContain('Corrugated box');
  });

  it('confirming dispatch calls the store, creates a shipment, and navigates back to the entry list', () => {
    const store = TestBed.inject(OutboundStore);
    const fixture = TestBed.createComponent(OperatorOutboundDispatch);
    fixture.componentRef.setInput('soId', 'SO-88219');
    fixture.detectChanges();

    const shipmentsBefore = store.shipments().length;

    (fixture.componentInstance as unknown as { confirm: () => void }).confirm();

    expect(store.shipments().length).toBe(shipmentsBefore + 1);
    expect(navigateCalls[0][0]).toEqual(['/operator/outbound']);
  });

  it('surfaces the store error and does not navigate if dispatch fails', () => {
    const fixture = TestBed.createComponent(OperatorOutboundDispatch);
    fixture.componentRef.setInput('soId', 'SO-88208');
    fixture.detectChanges();

    (fixture.componentInstance as unknown as { confirm: () => void }).confirm();
    fixture.detectChanges();

    const instance = fixture.componentInstance as unknown as { dispatchError: () => string | null };
    expect(instance.dispatchError()).toContain('not fully allocated');
    expect(navigateCalls.length).toBe(0);
  });
});
