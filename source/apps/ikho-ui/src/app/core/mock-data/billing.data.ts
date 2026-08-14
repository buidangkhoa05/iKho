// source/apps/ikho-ui/src/app/core/mock-data/billing.data.ts
import { PRODUCTS } from './products.data';

export type InvoiceStatus = 'issued' | 'partially-paid' | 'paid' | 'void';
export type CreditNoteStatus = 'issued' | 'void';
// 'void' on Invoice/CreditNote and 'reversed' on Payment are unreachable through any UI
// action — the backend exposes no endpoint that ever sets them. They're modeled here only
// for fidelity, and so INV-4400 below can give the invoice-void payment guard a real seed
// invoice to reject against (mirrors Organization seeding one inactive warehouse, WH-3,
// specifically to exercise a status guard).
export type PaymentStatus = 'recorded' | 'reversed';

export interface InvoiceLine {
  id: string;
  productCode: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface CreditNoteLine {
  id: string;
  productCode: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface Payment {
  id: string;
  amount: number;
  paidOnUtc: string;
  method: string;
  referenceNote?: string;
  status: PaymentStatus;
}

export interface Invoice {
  code: string;
  customerCode: string;
  warehouseCode: string;
  sourceReferenceType?: string;
  sourceReferenceId?: string;
  status: InvoiceStatus;
  issuedOnUtc: string;
  totalAmount: number;
  lines: InvoiceLine[];
  payments: Payment[];
}

export interface CreditNote {
  code: string;
  customerCode: string;
  sourceReferenceType?: string;
  sourceReferenceId?: string;
  status: CreditNoteStatus;
  issuedOnUtc: string;
  totalAmount: number;
  lines: CreditNoteLine[];
}

function seedLine(id: string, sku: string, quantity: number, unitPrice: number): InvoiceLine {
  const product = PRODUCTS.find((p) => p.sku === sku);
  if (!product) throw new Error(`Seed data error: unknown product sku '${sku}'.`);
  return { id, productCode: product.sku, productName: product.name.en, quantity, unitPrice, lineTotal: quantity * unitPrice };
}

// Issue dates are deliberately split across the current month (2026-08) and the prior one
// (2026-07) so "this month" KPIs in office-billing.spec.ts have both included and excluded
// rows to assert against. See the design spec's "Seed data" section for the worked totals.
export const INVOICES: Invoice[] = [
  {
    code: 'INV-4468',
    customerCode: 'CUS-2210',
    warehouseCode: 'WH-1',
    status: 'paid',
    issuedOnUtc: '2026-07-28T09:00:00Z',
    totalAmount: 38400,
    lines: [seedLine('INVL-1', 'IKH-201884', 12, 3200)],
    payments: [{ id: 'PAY-2214', amount: 38400, paidOnUtc: '2026-08-05T09:00:00Z', method: 'Bank transfer', status: 'recorded' }],
  },
  {
    code: 'INV-4470',
    customerCode: 'CUS-2274',
    warehouseCode: 'WH-1',
    status: 'paid',
    issuedOnUtc: '2026-07-30T09:00:00Z',
    totalAmount: 12880,
    lines: [seedLine('INVL-2', 'IKH-105522', 3220, 4)],
    payments: [{ id: 'PAY-2215', amount: 12880, paidOnUtc: '2026-08-06T09:00:00Z', method: 'Bank transfer', status: 'recorded' }],
  },
  {
    code: 'INV-4471',
    customerCode: 'CUS-2210',
    warehouseCode: 'WH-1',
    status: 'issued',
    issuedOnUtc: '2026-08-01T09:00:00Z',
    totalAmount: 42180,
    lines: [seedLine('INVL-3', 'IKH-482910', 700, 60), seedLine('INVL-4', 'IKH-330298', 30, 6)],
    payments: [],
  },
  {
    code: 'INV-4472',
    customerCode: 'CUS-2274',
    warehouseCode: 'WH-1',
    status: 'issued',
    issuedOnUtc: '2026-08-02T09:00:00Z',
    totalAmount: 18940,
    lines: [seedLine('INVL-5', 'IKH-770145', 430, 44), seedLine('INVL-6', 'IKH-559071', 4, 5)],
    payments: [],
  },
  {
    // Hafen Bremen (CUS-2318) is an inactive customer in PARTNERS — this invoice was issued
    // before they went inactive and stays on the books; addInvoice must still reject NEW
    // invoices for this customer (see the 'customer-not-found' test in Step 6).
    code: 'INV-4455',
    customerCode: 'CUS-2318',
    warehouseCode: 'WH-2',
    status: 'partially-paid',
    issuedOnUtc: '2026-07-12T09:00:00Z',
    totalAmount: 7320,
    lines: [seedLine('INVL-7', 'IKH-902316', 6, 1220)],
    payments: [{ id: 'PAY-2216', amount: 3000, paidOnUtc: '2026-08-07T09:00:00Z', method: 'Bank transfer', status: 'recorded' }],
  },
  {
    code: 'INV-4400',
    customerCode: 'CUS-2210',
    warehouseCode: 'WH-1',
    status: 'void',
    issuedOnUtc: '2026-07-01T09:00:00Z',
    totalAmount: 500,
    lines: [seedLine('INVL-8', 'IKH-447203', 50, 10)],
    payments: [],
  },
];

export const CREDIT_NOTES: CreditNote[] = [
  {
    code: 'CRN-0118',
    customerCode: 'CUS-2210',
    status: 'issued',
    issuedOnUtc: '2026-08-04T09:00:00Z',
    totalAmount: 1260,
    lines: [seedLine('CRNL-1', 'IKH-318440', 18, 70)],
  },
];
