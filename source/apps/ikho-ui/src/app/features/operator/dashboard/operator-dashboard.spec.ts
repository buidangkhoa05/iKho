import { Router } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { InboundStore } from '../../../core/state/inbound-store';
import { OutboundStore } from '../../../core/state/outbound-store';
import { ReturnsStore } from '../../../core/state/returns-store';
import { OperatorDashboard } from './operator-dashboard';

describe('OperatorDashboard', () => {
  let navigateCalls: unknown[][];

  beforeEach(async () => {
    navigateCalls = [];
    await TestBed.configureTestingModule({
      imports: [OperatorDashboard],
      providers: [
        { provide: Router, useValue: { navigate: (...args: unknown[]) => navigateCalls.push(args) } },
      ],
    }).compileComponents();
  });

  it('lists active putaway tasks from the store', () => {
    const fixture = TestBed.createComponent(OperatorDashboard);
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('PUT-7741');
  });

  it('reflects a confirmed putaway task disappearing from the queue', () => {
    const store = TestBed.inject(InboundStore);
    const fixture = TestBed.createComponent(OperatorDashboard);
    fixture.detectChanges();

    store.confirmPutaway('PUT-7741');
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).not.toContain('PUT-7741');
  });

  it('navigates to the putaway confirmation screen when a putaway task card is clicked', () => {
    const fixture = TestBed.createComponent(OperatorDashboard);
    fixture.detectChanges();

    (fixture.componentInstance as unknown as { onTaskClick: (t: { clickable: boolean; navTarget?: string[] }) => void }).onTaskClick({
      clickable: true,
      navTarget: ['/operator/inbound/putaway', 'PUT-7741'],
    });

    expect(navigateCalls[0][0]).toEqual(['/operator/inbound/putaway', 'PUT-7741']);
  });

  it('lists dispatch-ready sales orders from OutboundStore alongside putaway tasks', () => {
    const fixture = TestBed.createComponent(OperatorDashboard);
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('PUT-7741');
    expect(text).toContain('SO-88219');
  });

  it('reflects a dispatched sales order disappearing from the queue', () => {
    const store = TestBed.inject(OutboundStore);
    const fixture = TestBed.createComponent(OperatorDashboard);
    fixture.detectChanges();

    store.dispatch('SO-88219');
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).not.toContain('SO-88219');
  });

  it('navigates to the dispatch-confirm screen when a dispatch-ready card is clicked', () => {
    const fixture = TestBed.createComponent(OperatorDashboard);
    fixture.detectChanges();

    (fixture.componentInstance as unknown as { onTaskClick: (t: { clickable: boolean; navTarget?: string[] }) => void }).onTaskClick({
      clickable: true,
      navTarget: ['/operator/outbound/dispatch', 'SO-88219'],
    });

    expect(navigateCalls[0][0]).toEqual(['/operator/outbound/dispatch', 'SO-88219']);
  });

  it('lists a return order needing receipt alongside putaway and dispatch-ready tasks', () => {
    const fixture = TestBed.createComponent(OperatorDashboard);
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('PUT-7741');
    expect(text).toContain('SO-88219');
    expect(text).toContain('RMA-0343');
  });

  it('reflects a return order moving to its next stage, updating its dashboard card', () => {
    const store = TestBed.inject(ReturnsStore);
    const fixture = TestBed.createComponent(OperatorDashboard);
    fixture.detectChanges();

    let text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('RMA-0343');
    expect(text).toContain('Receive');

    store.receive('RMA-0343');
    fixture.detectChanges();

    text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('RMA-0343');
    expect(text).toContain('Inspect');
  });

  it('navigates to the returns receive screen when a to-receive card is clicked', () => {
    const fixture = TestBed.createComponent(OperatorDashboard);
    fixture.detectChanges();

    (fixture.componentInstance as unknown as { onTaskClick: (t: { clickable: boolean; navTarget?: string[] }) => void }).onTaskClick({
      clickable: true,
      navTarget: ['/operator/returns/receive', 'RMA-0343'],
    });

    expect(navigateCalls[0][0]).toEqual(['/operator/returns/receive', 'RMA-0343']);
  });
});
