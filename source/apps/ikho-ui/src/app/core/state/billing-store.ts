// source/apps/ikho-ui/src/app/core/state/billing-store.ts
import { Injectable, signal } from '@angular/core';
import {
  CREDIT_NOTES,
  CreditNote,
  CreditNoteLine,
  INVOICES,
  Invoice,
  InvoiceLine,
  InvoiceStatus,
  Payment,
} from '../mock-data/billing.data';
import { PARTNERS } from '../mock-data/partners.data';
import { PRODUCTS } from '../mock-data/products.data';

export type AddInvoiceOutcome = 'ok' | 'invalid' | 'customer-not-found' | 'product-not-found';
export type AddCreditNoteOutcome = 'ok' | 'invalid' | 'customer-not-found' | 'product-not-found';
export type RecordPaymentOutcome = 'ok' | 'invalid' | 'invoice-not-found' | 'invoice-void' | 'exceeds-total';

export interface LineInput {
  productCode: string;
  quantity: number;
  unitPrice: number;
}

export interface AddInvoiceInput {
  customerCode: string;
  warehouseCode: string;
  sourceReferenceType?: string;
  sourceReferenceId?: string;
  lines: LineInput[];
}

export interface AddCreditNoteInput {
  customerCode: string;
  sourceReferenceType?: string;
  sourceReferenceId?: string;
  lines: LineInput[];
}

export interface RecordPaymentInput {
  amount: number;
  method: string;
  referenceNote?: string;
}

let invoiceSeq = 4473;
let creditNoteSeq = 119;
let paymentSeq = 2217;
let lineSeq = 100;

function validateLines(lines: LineInput[]): boolean {
  if (lines.length === 0) return false;
  if (lines.some((l) => l.quantity <= 0)) return false;
  if (lines.some((l) => l.unitPrice < 0)) return false;
  return true;
}

/** Resolves each line's product and snapshots its code/name, mirroring InvoicesService/CreditNotesService. Returns null if any productCode doesn't resolve. */
function buildLines(lines: LineInput[]): InvoiceLine[] | CreditNoteLine[] | null {
  const built: InvoiceLine[] = [];
  for (const l of lines) {
    const product = PRODUCTS.find((p) => p.sku === l.productCode);
    if (!product) return null;
    built.push({
      id: `LN-${lineSeq++}`,
      productCode: product.sku,
      productName: product.name.en,
      quantity: l.quantity,
      unitPrice: l.unitPrice,
      lineTotal: l.quantity * l.unitPrice,
    });
  }
  return built;
}

function resolveActiveCustomer(customerCode: string): boolean {
  const customer = PARTNERS.find((p) => p.code === customerCode);
  return !!customer && customer.type === 'customer' && customer.isActive;
}

@Injectable({ providedIn: 'root' })
export class BillingStore {
  readonly invoices = signal<Invoice[]>([...INVOICES]);
  readonly creditNotes = signal<CreditNote[]>([...CREDIT_NOTES]);

  addInvoice(input: AddInvoiceInput): AddInvoiceOutcome {
    const customerCode = input.customerCode.trim();
    const warehouseCode = input.warehouseCode.trim();
    if (!customerCode || !warehouseCode || !validateLines(input.lines)) return 'invalid';
    if (!resolveActiveCustomer(customerCode)) return 'customer-not-found';

    const lines = buildLines(input.lines);
    if (!lines) return 'product-not-found';

    const totalAmount = lines.reduce((sum, l) => sum + l.lineTotal, 0);
    const invoice: Invoice = {
      code: `INV-${invoiceSeq++}`,
      customerCode,
      warehouseCode,
      sourceReferenceType: input.sourceReferenceType,
      sourceReferenceId: input.sourceReferenceId,
      status: 'issued',
      issuedOnUtc: new Date().toISOString(),
      totalAmount,
      lines,
      payments: [],
    };
    this.invoices.update((list) => [invoice, ...list]);
    return 'ok';
  }

  addCreditNote(input: AddCreditNoteInput): AddCreditNoteOutcome {
    const customerCode = input.customerCode.trim();
    if (!customerCode || !validateLines(input.lines)) return 'invalid';
    if (!resolveActiveCustomer(customerCode)) return 'customer-not-found';

    const lines = buildLines(input.lines);
    if (!lines) return 'product-not-found';

    const totalAmount = lines.reduce((sum, l) => sum + l.lineTotal, 0);
    const creditNote: CreditNote = {
      code: `CRN-${String(creditNoteSeq++).padStart(4, '0')}`,
      customerCode,
      sourceReferenceType: input.sourceReferenceType,
      sourceReferenceId: input.sourceReferenceId,
      status: 'issued',
      issuedOnUtc: new Date().toISOString(),
      totalAmount,
      lines,
    };
    this.creditNotes.update((list) => [creditNote, ...list]);
    return 'ok';
  }

  recordPayment(invoiceCode: string, input: RecordPaymentInput): RecordPaymentOutcome {
    const method = input.method.trim();
    if (input.amount <= 0 || !method) return 'invalid';

    const invoice = this.invoices().find((i) => i.code === invoiceCode);
    if (!invoice) return 'invoice-not-found';
    if (invoice.status === 'void') return 'invoice-void';

    const recordedSoFar = invoice.payments.filter((p) => p.status === 'recorded').reduce((sum, p) => sum + p.amount, 0);
    const cumulative = recordedSoFar + input.amount;
    if (cumulative > invoice.totalAmount) return 'exceeds-total';

    const payment: Payment = {
      id: `PAY-${paymentSeq++}`,
      amount: input.amount,
      paidOnUtc: new Date().toISOString(),
      method,
      referenceNote: input.referenceNote,
      status: 'recorded',
    };
    const newStatus: InvoiceStatus = cumulative === invoice.totalAmount ? 'paid' : 'partially-paid';

    this.invoices.update((list) =>
      list.map((i) => (i.code === invoiceCode ? { ...i, status: newStatus, payments: [...i.payments, payment] } : i)),
    );
    return 'ok';
  }
}
