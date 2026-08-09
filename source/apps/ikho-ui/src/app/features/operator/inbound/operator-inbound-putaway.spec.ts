import { Router } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { InboundStore } from '../../../core/state/inbound-store';
import { OperatorInboundPutaway } from './operator-inbound-putaway';

describe('OperatorInboundPutaway', () => {
  let navigateCalls: unknown[][];

  beforeEach(async () => {
    navigateCalls = [];
    await TestBed.configureTestingModule({
      imports: [OperatorInboundPutaway],
      providers: [
        { provide: Router, useValue: { navigate: (...args: unknown[]) => navigateCalls.push(args) } },
      ],
    }).compileComponents();
  });

  it('shows the task detail for the given taskId', () => {
    const fixture = TestBed.createComponent(OperatorInboundPutaway);
    fixture.componentRef.setInput('taskId', 'PUT-7741');
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Dock 3');
    expect(text).toContain('A-12-04');
  });

  it('confirming removes the task from the store and navigates back to the entry list', () => {
    const store = TestBed.inject(InboundStore);
    const fixture = TestBed.createComponent(OperatorInboundPutaway);
    fixture.componentRef.setInput('taskId', 'PUT-7741');
    fixture.detectChanges();

    (fixture.componentInstance as unknown as { confirm: () => void }).confirm();

    expect(store.putawayTasks().some((t) => t.id === 'PUT-7741')).toBe(false);
    expect(navigateCalls[0][0]).toEqual(['/operator/inbound']);
  });
});
