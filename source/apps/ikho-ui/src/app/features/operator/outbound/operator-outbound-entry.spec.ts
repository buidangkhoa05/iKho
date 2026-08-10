import { Router } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { OperatorOutboundEntry } from './operator-outbound-entry';

describe('OperatorOutboundEntry', () => {
  let navigateCalls: unknown[][];

  beforeEach(async () => {
    navigateCalls = [];
    await TestBed.configureTestingModule({
      imports: [OperatorOutboundEntry],
      providers: [
        { provide: Router, useValue: { navigate: (...args: unknown[]) => navigateCalls.push(args) } },
      ],
    }).compileComponents();
  });

  it('shows only allocated, not-yet-dispatched sales orders', () => {
    const fixture = TestBed.createComponent(OperatorOutboundEntry);
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('SO-88219');
    expect(text).toContain('SO-88222');
    expect(text).not.toContain('SO-88214');
    expect(text).not.toContain('SO-88208');
  });

  it('navigates to the dispatch-confirm flow when a card is opened', () => {
    const fixture = TestBed.createComponent(OperatorOutboundEntry);
    fixture.detectChanges();

    (fixture.componentInstance as unknown as { openDispatch: (id: string) => void }).openDispatch('SO-88219');

    expect(navigateCalls[0][0]).toEqual(['/operator/outbound/dispatch', 'SO-88219']);
  });
});
