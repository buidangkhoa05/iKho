import { TestBed } from '@angular/core/testing';
import { Invoice } from '../../../core/mock-data/billing.data';
import { InvoiceDetailPanel } from './invoice-detail-panel';

const TEST_INVOICE: Invoice = {
  code: 'INV-4471',
  customerCode: 'CUS-2210',
  warehouseCode: 'WH-1',
  status: 'issued',
  issuedOnUtc: '2026-08-01T09:00:00Z',
  totalAmount: 42180,
  lines: [
    { id: 'L1', productCode: 'IKH-482910', productName: 'Steel shelving bracket, 400mm', quantity: 700, unitPrice: 60, lineTotal: 42000 },
    { id: 'L2', productCode: 'IKH-330298', productName: 'Barcode label roll, 100×50mm', quantity: 30, unitPrice: 6, lineTotal: 180 },
  ],
  payments: [],
};

describe('InvoiceDetailPanel', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [InvoiceDetailPanel] }).compileComponents();
  });

  function create(invoice: Invoice = TEST_INVOICE) {
    const fixture = TestBed.createComponent(InvoiceDetailPanel);
    fixture.componentRef.setInput('invoice', invoice);
    fixture.componentRef.setInput('customerName', 'Meijer Retail Group');
    fixture.componentRef.setInput('warehouseName', 'Rotterdam DC');
    fixture.detectChanges();
    return fixture;
  }

  it('renders the invoice code, customer, warehouse, total, and lines', () => {
    const fixture = create();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('INV-4471');
    expect(text).toContain('Meijer Retail Group');
    expect(text).toContain('Rotterdam DC');
    expect(text).toContain('€ 42,180');
    expect(text).toContain('Steel shelving bracket, 400mm');
    expect(text).toContain('Barcode label roll, 100×50mm');
  });

  it('renders existing payments', () => {
    const fixture = create({
      ...TEST_INVOICE,
      payments: [{ id: 'PAY-2214', amount: 38400, paidOnUtc: '2026-08-05T09:00:00Z', method: 'Bank transfer', status: 'recorded' }],
    });
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('€ 38,400');
    expect(text).toContain('Bank transfer');
  });

  it('shows a status indicator per payment row: recorded vs. reversed', () => {
    const fixture = create({
      ...TEST_INVOICE,
      payments: [
        { id: 'PAY-2214', amount: 38400, paidOnUtc: '2026-08-05T09:00:00Z', method: 'Bank transfer', status: 'recorded' },
        { id: 'PAY-2215', amount: 1000, paidOnUtc: '2026-08-06T09:00:00Z', method: 'Cash', status: 'reversed' },
      ],
    });
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Recorded');
    expect(text).toContain('Reversed');
  });

  it('closePanel emits when the close button is clicked', () => {
    const fixture = create();
    let emitted = false;
    fixture.componentInstance.closePanel.subscribe(() => (emitted = true));
    (fixture.nativeElement as HTMLElement).querySelector('button[aria-label]')?.dispatchEvent(new Event('click', { bubbles: true }));
    expect(emitted).toBe(true);
  });

  it('rejects a record-payment submission missing amount or method, and emits a well-formed payment on success', () => {
    const fixture = create();
    const instance = fixture.componentInstance as unknown as {
      showPaymentForm: { set: (v: boolean) => void };
      paymentAmount: { set: (v: string) => void };
      paymentMethod: { set: (v: string) => void };
      submitPayment: () => void;
    };
    let payload: { amount: number; method: string; referenceNote?: string } | undefined;
    fixture.componentInstance.recordPayment.subscribe((v) => (payload = v));

    instance.showPaymentForm.set(true);
    instance.paymentAmount.set('0');
    instance.paymentMethod.set('');
    instance.submitPayment();
    expect(payload).toBeUndefined();

    instance.paymentAmount.set('1000');
    instance.paymentMethod.set('Bank transfer');
    instance.submitPayment();
    expect(payload).toEqual({ amount: 1000, method: 'Bank transfer', referenceNote: undefined });
  });

  it('setPaymentError surfaces a store-side outcome on the open payment form', () => {
    const fixture = create();
    const instance = fixture.componentInstance as unknown as { showPaymentForm: { set: (v: boolean) => void } };
    instance.showPaymentForm.set(true);
    fixture.componentInstance.setPaymentError('This invoice has been voided and cannot accept payments.');
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('This invoice has been voided and cannot accept payments.');
  });

  it('resets the payment form when the invoice input changes identity', () => {
    const fixture = create();
    const instance = fixture.componentInstance as unknown as {
      showPaymentForm: { set: (v: boolean) => void; (): boolean };
      paymentAmount: { set: (v: string) => void; (): string };
    };
    instance.showPaymentForm.set(true);
    instance.paymentAmount.set('500');
    expect(instance.showPaymentForm()).toBe(true);
    expect(instance.paymentAmount()).toBe('500');

    fixture.componentRef.setInput('invoice', { ...TEST_INVOICE, totalAmount: 99999 });
    fixture.detectChanges();

    expect(instance.showPaymentForm()).toBe(false);
    expect(instance.paymentAmount()).toBe('');
  });
});
