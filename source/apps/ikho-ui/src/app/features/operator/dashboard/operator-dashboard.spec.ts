import { Router } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { InboundStore } from '../../../core/state/inbound-store';
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

    (fixture.componentInstance as unknown as { onTaskClick: (t: { clickable: boolean; taskId?: string }) => void }).onTaskClick({
      clickable: true,
      taskId: 'PUT-7741',
    });

    expect(navigateCalls[0][0]).toEqual(['/operator/inbound/putaway', 'PUT-7741']);
  });
});
