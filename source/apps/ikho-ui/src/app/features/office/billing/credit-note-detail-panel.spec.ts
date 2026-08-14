import { TestBed } from '@angular/core/testing';
import { CreditNote } from '../../../core/mock-data/billing.data';
import { CreditNoteDetailPanel } from './credit-note-detail-panel';

const TEST_CREDIT_NOTE: CreditNote = {
  code: 'CRN-0118',
  customerCode: 'CUS-2210',
  status: 'issued',
  issuedOnUtc: '2026-08-04T09:00:00Z',
  totalAmount: 1260,
  lines: [{ id: 'L1', productCode: 'IKH-318440', productName: 'Shelf divider, 600mm', quantity: 18, unitPrice: 70, lineTotal: 1260 }],
};

describe('CreditNoteDetailPanel', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [CreditNoteDetailPanel] }).compileComponents();
  });

  it('renders the credit note code, customer, total, status, and lines', () => {
    const fixture = TestBed.createComponent(CreditNoteDetailPanel);
    fixture.componentRef.setInput('creditNote', TEST_CREDIT_NOTE);
    fixture.componentRef.setInput('customerName', 'Meijer Retail Group');
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('CRN-0118');
    expect(text).toContain('Meijer Retail Group');
    expect(text).toContain('€ 1,260');
    expect(text).toContain('Shelf divider, 600mm');
    expect(text).toContain('Issued');
  });

  it('closePanel emits when the close button is clicked', () => {
    const fixture = TestBed.createComponent(CreditNoteDetailPanel);
    fixture.componentRef.setInput('creditNote', TEST_CREDIT_NOTE);
    fixture.componentRef.setInput('customerName', 'Meijer Retail Group');
    fixture.detectChanges();

    let emitted = false;
    fixture.componentInstance.closePanel.subscribe(() => (emitted = true));
    (fixture.nativeElement as HTMLElement).querySelector('button[aria-label]')?.dispatchEvent(new Event('click', { bubbles: true }));
    expect(emitted).toBe(true);
  });
});
