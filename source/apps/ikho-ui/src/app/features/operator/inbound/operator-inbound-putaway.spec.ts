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

  it('confirming marks the task in-stock in the store (keeping it in the ledger) and navigates back to the entry list', () => {
    const store = TestBed.inject(InboundStore);
    const fixture = TestBed.createComponent(OperatorInboundPutaway);
    fixture.componentRef.setInput('taskId', 'PUT-7741');
    fixture.detectChanges();

    (fixture.componentInstance as unknown as { confirm: () => void }).confirm();

    const task = store.putawayTasks().find((t) => t.id === 'PUT-7741');
    expect(task).toBeDefined();
    expect(task!.status).toBe('in-stock');
    expect(navigateCalls[0][0]).toEqual(['/operator/inbound']);
  });

  it('confirming with an edited bin updates the task toBin in the store', () => {
    const store = TestBed.inject(InboundStore);
    const fixture = TestBed.createComponent(OperatorInboundPutaway);
    fixture.componentRef.setInput('taskId', 'PUT-7741');
    fixture.detectChanges();

    const instance = fixture.componentInstance as unknown as {
      binInput: { set: (v: string) => void };
      confirm: () => void;
    };

    instance.binInput.set('Z-01-01');
    instance.confirm();

    const task = store.putawayTasks().find((t) => t.id === 'PUT-7741')!;
    expect(task.toBin).toBe('Z-01-01');
  });
});
