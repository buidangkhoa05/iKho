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
    expect(instance.dispatchError()).toContain('not ready to dispatch');
    expect(navigateCalls.length).toBe(0);
  });

  it('does not render a confirm button for an already-dispatched order and shows a status message instead', () => {
    const fixture = TestBed.createComponent(OperatorOutboundDispatch);
    fixture.componentRef.setInput('soId', 'SO-88214'); // seeded with status 'in-stock' (already dispatched)
    fixture.detectChanges();

    const nativeElement = fixture.nativeElement as HTMLElement;
    expect(nativeElement.querySelector('lib-button')).toBeNull();
    expect(nativeElement.textContent).toContain('already been dispatched');
  });

  it('prevents a duplicate dispatch if confirm is somehow invoked again on an already-dispatched order', () => {
    const store = TestBed.inject(OutboundStore);
    const fixture = TestBed.createComponent(OperatorOutboundDispatch);
    fixture.componentRef.setInput('soId', 'SO-88214');
    fixture.detectChanges();

    const shipmentsBefore = store.shipments().length;

    (fixture.componentInstance as unknown as { confirm: () => void }).confirm();

    expect(store.shipments().length).toBe(shipmentsBefore);
    expect(navigateCalls.length).toBe(0);
  });
});
