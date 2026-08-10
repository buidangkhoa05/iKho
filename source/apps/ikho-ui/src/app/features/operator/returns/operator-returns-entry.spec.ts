import { Router } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { OperatorReturnsEntry } from './operator-returns-entry';

describe('OperatorReturnsEntry', () => {
  let navigateCalls: unknown[][];

  beforeEach(async () => {
    navigateCalls = [];
    await TestBed.configureTestingModule({
      imports: [OperatorReturnsEntry],
      providers: [
        { provide: Router, useValue: { navigate: (...args: unknown[]) => navigateCalls.push(args) } },
      ],
    }).compileComponents();
  });

  it('groups orders into the correct section by stage', () => {
    const fixture = TestBed.createComponent(OperatorReturnsEntry);
    fixture.detectChanges();

    const instance = fixture.componentInstance as unknown as {
      toReceive: () => { rma: string }[];
      toInspect: () => { rma: string }[];
      toDisposition: () => { rma: string }[];
    };

    expect(instance.toReceive().some((o) => o.rma === 'RMA-0343')).toBe(true);
    expect(instance.toInspect().some((o) => o.rma === 'RMA-0337')).toBe(true);
    expect(instance.toDisposition().some((o) => o.rma === 'RMA-0340')).toBe(true);
    // A dispositioned order (RMA-0331) must not appear in any pending section.
    expect(instance.toReceive().some((o) => o.rma === 'RMA-0331')).toBe(false);
    expect(instance.toInspect().some((o) => o.rma === 'RMA-0331')).toBe(false);
    expect(instance.toDisposition().some((o) => o.rma === 'RMA-0331')).toBe(false);
  });

  it('navigates to the correct route per section when a card is opened', () => {
    const fixture = TestBed.createComponent(OperatorReturnsEntry);
    fixture.detectChanges();

    const instance = fixture.componentInstance as unknown as {
      openReceive: (rma: string) => void;
      openInspect: (rma: string) => void;
      openDisposition: (rma: string) => void;
    };

    instance.openReceive('RMA-0343');
    expect(navigateCalls[0][0]).toEqual(['/operator/returns/receive', 'RMA-0343']);

    instance.openInspect('RMA-0337');
    expect(navigateCalls[1][0]).toEqual(['/operator/returns/inspect', 'RMA-0337']);

    instance.openDisposition('RMA-0340');
    expect(navigateCalls[2][0]).toEqual(['/operator/returns/disposition', 'RMA-0340']);
  });
});
