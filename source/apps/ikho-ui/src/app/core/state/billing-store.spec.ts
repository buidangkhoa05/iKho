// source/apps/ikho-ui/src/app/core/state/billing-store.spec.ts
import { TestBed } from '@angular/core/testing';
import { BillingStore } from './billing-store';

describe('BillingStore', () => {
  let store: BillingStore;

  beforeAll(() => {
    TestBed.configureTestingModule({});
    store = TestBed.inject(BillingStore);
  });

  it('seeds 6 invoices and 1 credit note', () => {
    expect(store.invoices().length).toBe(6);
    expect(store.creditNotes().length).toBe(1);
  });

  describe('addInvoice', () => {
    const validLines = [{ productCode: 'IKH-482910', quantity: 2, unitPrice: 60 }];

    it('rejects a blank customerCode or warehouseCode as invalid', () => {
      expect(store.addInvoice({ customerCode: '', warehouseCode: 'WH-1', lines: validLines })).toBe('invalid');
      expect(store.addInvoice({ customerCode: 'CUS-2210', warehouseCode: '  ', lines: validLines })).toBe('invalid');
    });

    it('rejects an empty lines array as invalid', () => {
      expect(store.addInvoice({ customerCode: 'CUS-2210', warehouseCode: 'WH-1', lines: [] })).toBe('invalid');
    });

    it('rejects a non-positive quantity as invalid', () => {
      const outcome = store.addInvoice({
        customerCode: 'CUS-2210',
        warehouseCode: 'WH-1',
        lines: [{ productCode: 'IKH-482910', quantity: 0, unitPrice: 60 }],
      });
      expect(outcome).toBe('invalid');
    });

    it('rejects a negative unit price as invalid', () => {
      const outcome = store.addInvoice({
        customerCode: 'CUS-2210',
        warehouseCode: 'WH-1',
        lines: [{ productCode: 'IKH-482910', quantity: 2, unitPrice: -1 }],
      });
      expect(outcome).toBe('invalid');
    });

    it('rejects an unknown customer code', () => {
      expect(store.addInvoice({ customerCode: 'CUS-9999', warehouseCode: 'WH-1', lines: validLines })).toBe('customer-not-found');
    });

    it('rejects an inactive customer (CUS-2318, Hafen Bremen)', () => {
      expect(store.addInvoice({ customerCode: 'CUS-2318', warehouseCode: 'WH-1', lines: validLines })).toBe('customer-not-found');
    });

    it('rejects a supplier-type partner code, since it is not a customer', () => {
      expect(store.addInvoice({ customerCode: 'SUP-0142', warehouseCode: 'WH-1', lines: validLines })).toBe('customer-not-found');
    });

    it('rejects an unknown product code', () => {
      const outcome = store.addInvoice({
        customerCode: 'CUS-2210',
        warehouseCode: 'WH-1',
        lines: [{ productCode: 'IKH-000000', quantity: 1, unitPrice: 10 }],
      });
      expect(outcome).toBe('product-not-found');
    });

    it('creates an invoice with a computed total, issued status, next INV code, and empty payments', () => {
      const before = store.invoices().length;
      const outcome = store.addInvoice({
        customerCode: 'CUS-2210',
        warehouseCode: 'WH-1',
        sourceReferenceType: 'OutboundShipment',
        sourceReferenceId: 'SHP-1',
        lines: [
          { productCode: 'IKH-482910', quantity: 2, unitPrice: 60 },
          { productCode: 'IKH-330298', quantity: 3, unitPrice: 6 },
        ],
      });
      expect(outcome).toBe('ok');
      expect(store.invoices().length).toBe(before + 1);

      const created = store.invoices()[0];
      expect(created.code).toBe('INV-4473');
      expect(created.status).toBe('issued');
      expect(created.totalAmount).toBe(138); // 2*60 + 3*6
      expect(created.payments).toEqual([]);
      expect(created.sourceReferenceType).toBe('OutboundShipment');
      expect(created.lines[0].productName).toBe('Steel shelving bracket, 400mm');
      expect(created.lines[0].lineTotal).toBe(120);
    });

    it('assigns sequential INV codes across multiple creations', () => {
      store.addInvoice({ customerCode: 'CUS-2210', warehouseCode: 'WH-1', lines: validLines });
      store.addInvoice({ customerCode: 'CUS-2210', warehouseCode: 'WH-1', lines: validLines });
      const codes = store.invoices().slice(0, 2).map((i) => i.code);
      expect(codes).toEqual(['INV-4475', 'INV-4474']);
    });
  });

  describe('addCreditNote', () => {
    const validLines = [{ productCode: 'IKH-318440', quantity: 1, unitPrice: 70 }];

    it('rejects a blank customerCode as invalid', () => {
      expect(store.addCreditNote({ customerCode: '', lines: validLines })).toBe('invalid');
    });

    it('rejects an empty lines array as invalid', () => {
      expect(store.addCreditNote({ customerCode: 'CUS-2210', lines: [] })).toBe('invalid');
    });

    it('rejects a non-positive quantity as invalid', () => {
      const outcome = store.addCreditNote({ customerCode: 'CUS-2210', lines: [{ productCode: 'IKH-318440', quantity: 0, unitPrice: 70 }] });
      expect(outcome).toBe('invalid');
    });

    it('rejects a negative unit price as invalid', () => {
      const outcome = store.addCreditNote({ customerCode: 'CUS-2210', lines: [{ productCode: 'IKH-318440', quantity: 1, unitPrice: -1 }] });
      expect(outcome).toBe('invalid');
    });

    it('rejects an inactive customer', () => {
      expect(store.addCreditNote({ customerCode: 'CUS-2318', lines: validLines })).toBe('customer-not-found');
    });

    it('rejects an unknown product code', () => {
      const outcome = store.addCreditNote({ customerCode: 'CUS-2210', lines: [{ productCode: 'IKH-000000', quantity: 1, unitPrice: 10 }] });
      expect(outcome).toBe('product-not-found');
    });

    it('creates a credit note with a computed total, issued status, and next zero-padded CRN code', () => {
      const outcome = store.addCreditNote({ customerCode: 'CUS-2274', lines: validLines });
      expect(outcome).toBe('ok');
      const created = store.creditNotes()[0];
      expect(created.code).toBe('CRN-0119');
      expect(created.status).toBe('issued');
      expect(created.totalAmount).toBe(70);
    });
  });

  describe('recordPayment', () => {
    it('rejects a non-positive amount as invalid', () => {
      expect(store.recordPayment('INV-4471', { amount: 0, method: 'Bank transfer' })).toBe('invalid');
    });

    it('rejects a blank method as invalid', () => {
      expect(store.recordPayment('INV-4471', { amount: 100, method: '  ' })).toBe('invalid');
    });

    it('rejects an unknown invoice code', () => {
      expect(store.recordPayment('INV-9999', { amount: 100, method: 'Bank transfer' })).toBe('invoice-not-found');
    });

    it('rejects a payment against a void invoice (INV-4400)', () => {
      expect(store.recordPayment('INV-4400', { amount: 100, method: 'Bank transfer' })).toBe('invoice-void');
    });

    it('rejects a payment that would exceed the invoice total', () => {
      // INV-4455 has totalAmount 7320 and 3000 already recorded; 4321 would push cumulative to 7321.
      expect(store.recordPayment('INV-4455', { amount: 4321, method: 'Bank transfer' })).toBe('exceeds-total');
    });

    it('records a partial payment and sets status to partially-paid', () => {
      const outcome = store.recordPayment('INV-4471', { amount: 20000, method: 'Bank transfer', referenceNote: 'Ref-1' });
      expect(outcome).toBe('ok');
      const invoice = store.invoices().find((i) => i.code === 'INV-4471');
      expect(invoice?.status).toBe('partially-paid');
      expect(invoice?.payments.length).toBe(1);
      expect(invoice?.payments[0].referenceNote).toBe('Ref-1');
    });

    it('records a payment that exactly reaches the total and sets status to paid', () => {
      // INV-4455 needs exactly 4320 more to reach its 7320 total.
      const outcome = store.recordPayment('INV-4455', { amount: 4320, method: 'Bank transfer' });
      expect(outcome).toBe('ok');
      const invoice = store.invoices().find((i) => i.code === 'INV-4455');
      expect(invoice?.status).toBe('paid');
    });

    it('assigns sequential PAY codes', () => {
      store.recordPayment('INV-4471', { amount: 100, method: 'Cash' });
      const invoice = store.invoices().find((i) => i.code === 'INV-4471');
      expect(invoice?.payments[0].id).toBe('PAY-2217');
    });
  });
});
