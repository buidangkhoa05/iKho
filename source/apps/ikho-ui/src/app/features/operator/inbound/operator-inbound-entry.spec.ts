import { Router } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { OperatorInboundEntry } from './operator-inbound-entry';

describe('OperatorInboundEntry', () => {
  let navigateCalls: unknown[][];

  beforeEach(async () => {
    navigateCalls = [];
    await TestBed.configureTestingModule({
      imports: [OperatorInboundEntry],
      providers: [
        { provide: Router, useValue: { navigate: (...args: unknown[]) => navigateCalls.push(args) } },
      ],
    }).compileComponents();
  });

  it('shows open purchase orders in the receiving tab, excluding fully-received ones', () => {
    const fixture = TestBed.createComponent(OperatorInboundEntry);
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('PO-10488');
    expect(text).not.toContain('PO-10482');
  });

  it('navigates to the receiving flow when a PO card is opened', () => {
    const fixture = TestBed.createComponent(OperatorInboundEntry);
    fixture.detectChanges();

    (fixture.componentInstance as unknown as { openReceive: (id: string) => void }).openReceive('PO-10488');

    expect(navigateCalls[0][0]).toEqual(['/operator/inbound/receive', 'PO-10488']);
  });

  it('switches to the putaway tab and lists active putaway tasks', () => {
    const fixture = TestBed.createComponent(OperatorInboundEntry);
    fixture.detectChanges();

    (fixture.componentInstance as unknown as { view: { set: (v: string) => void } }).view.set('putaway');
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('PUT-7741');
    expect(text).not.toContain('PUT-7739');
  });
});
