import { computed, Injectable, signal } from '@angular/core';
import { Localized } from '../i18n/localized.type';
import { Disposition, DISPOSITIONS } from '../mock-data/dispositions.data';
import { Inspection, INSPECTIONS } from '../mock-data/inspections.data';
import { PRODUCTS } from '../mock-data/products.data';
import {
  DISPOSITION_OUTCOME_LABELS,
  DispositionOutcome,
  INSPECTION_RESULT_LABELS,
  InspectionResult,
  ReturnOrder,
  ReturnOrderLine,
  ReturnReasonCode,
  RETURN_ORDERS,
} from '../mock-data/return-orders.data';

export interface CreateReturnOrderLineInput {
  sku: string;
  qty: number;
  reasonCode: ReturnReasonCode;
}

export interface CreateReturnOrderInput {
  type: 'customer' | 'supplier';
  partner: string;
  sourceRef: string;
  lines: CreateReturnOrderLineInput[];
}

export type ReceiveResult = { ok: true } | { ok: false; error: string };
export type InspectResult = { ok: true } | { ok: false; error: string };
export type DispositionResult = { ok: true; disposition: Disposition } | { ok: false; error: string };

/** Single source of truth for which disposition outcomes are valid for a given inspection result. */
export const DISPOSITION_RULE: Record<InspectionResult, DispositionOutcome[]> = {
  Good: ['Restock'],
  Damaged: ['Quarantine', 'Scrap', 'VendorReturn'],
  Defective: ['Quarantine', 'Scrap', 'VendorReturn'],
};

let rmaSeq = 344;
let inspectionSeq = 920;
let dispositionSeq = 443;

function productName(sku: string): Localized<string> {
  return PRODUCTS.find((p) => p.sku === sku)?.name ?? { en: sku, vi: sku };
}

@Injectable({ providedIn: 'root' })
export class ReturnsStore {
  readonly returnOrders = signal<ReturnOrder[]>([...RETURN_ORDERS]);
  readonly inspections = signal<Inspection[]>([...INSPECTIONS]);
  readonly dispositions = signal<Disposition[]>([...DISPOSITIONS]);

  /** Single source of truth for which orders are awaiting each next step. */
  readonly toReceive = computed(() => this.returnOrders().filter((o) => o.stage === 'created'));
  readonly toInspect = computed(() => this.returnOrders().filter((o) => o.stage === 'received'));
  readonly toDisposition = computed(() => this.returnOrders().filter((o) => o.stage === 'inspected'));

  createReturnOrder(input: CreateReturnOrderInput): ReturnOrder {
    const lines: ReturnOrderLine[] = input.lines.map((line) => ({
      sku: line.sku,
      productName: productName(line.sku),
      qty: line.qty,
      reasonCode: line.reasonCode,
    }));

    const order: ReturnOrder = {
      rma: `RMA-${rmaSeq++}`,
      type: input.type,
      partner: input.partner,
      sourceRef: input.sourceRef,
      qty: lines.reduce((sum, l) => sum + l.qty, 0),
      stage: 'created',
      status: 'returns',
      label: { en: 'Open', vi: 'Đang mở' },
      lines,
    };

    this.returnOrders.update((orders) => [order, ...orders]);
    return order;
  }

  receive(rma: string): ReceiveResult {
    const order = this.returnOrders().find((o) => o.rma === rma);
    if (!order || order.stage !== 'created') {
      return { ok: false, error: `Return order '${rma}' is not awaiting receipt.` };
    }

    const updated: ReturnOrder = {
      ...order,
      stage: 'received',
      status: 'low-stock',
      label: { en: 'Awaiting inspection', vi: 'Chờ kiểm tra' },
    };
    this.returnOrders.update((orders) => orders.map((o) => (o.rma === rma ? updated : o)));
    return { ok: true };
  }

  inspect(rma: string, result: InspectionResult): InspectResult {
    const order = this.returnOrders().find((o) => o.rma === rma);
    if (!order || order.stage !== 'received') {
      return { ok: false, error: `Return order '${rma}' is not awaiting inspection.` };
    }

    const updated: ReturnOrder = {
      ...order,
      stage: 'inspected',
      status: 'outbound',
      label: { en: 'Inspected', vi: 'Đã kiểm tra' },
      inspectionResult: result,
    };
    this.returnOrders.update((orders) => orders.map((o) => (o.rma === rma ? updated : o)));

    const newInspection: Inspection = {
      id: `INS-${inspectionSeq++}`,
      rma,
      sku: order.lines[0].sku,
      outcome: INSPECTION_RESULT_LABELS[result],
      inspector: 'Operator',
    };
    this.inspections.update((ins) => [newInspection, ...ins]);

    return { ok: true };
  }

  disposition(rma: string, outcome: DispositionOutcome, bin?: string): DispositionResult {
    const order = this.returnOrders().find((o) => o.rma === rma);
    if (!order || order.stage !== 'inspected' || !order.inspectionResult) {
      return { ok: false, error: `Return order '${rma}' is not awaiting disposition.` };
    }

    if (!DISPOSITION_RULE[order.inspectionResult].includes(outcome)) {
      return { ok: false, error: `'${outcome}' is not a valid disposition for a '${order.inspectionResult}' inspection result.` };
    }

    const needsBin = outcome === 'Restock' || outcome === 'Quarantine';
    const trimmedBin = bin?.trim();
    if (needsBin && !trimmedBin) {
      return { ok: false, error: 'A bin is required for Restock or Quarantine.' };
    }

    const label: Localized<string> =
      outcome === 'Restock'
        ? { en: 'Restocked', vi: 'Đã nhập lại' }
        : outcome === 'Quarantine'
          ? { en: 'Quarantined', vi: 'Đã cách ly' }
          : outcome === 'Scrap'
            ? { en: 'Scrapped', vi: 'Đã huỷ' }
            : { en: 'Sent to vendor', vi: 'Đã gửi trả NCC' };
    const status = outcome === 'Restock' ? 'in-stock' : outcome === 'Quarantine' ? 'low-stock' : 'out-of-stock';

    const updated: ReturnOrder = {
      ...order,
      stage: 'dispositioned',
      status,
      label,
      dispositionOutcome: outcome,
      dispositionBin: needsBin ? trimmedBin : undefined,
    };
    this.returnOrders.update((orders) => orders.map((o) => (o.rma === rma ? updated : o)));

    const actionText: Localized<string> = needsBin
      ? {
          en: `${DISPOSITION_OUTCOME_LABELS[outcome].en} to ${trimmedBin}`,
          vi: `${DISPOSITION_OUTCOME_LABELS[outcome].vi} vào ${trimmedBin}`,
        }
      : DISPOSITION_OUTCOME_LABELS[outcome];
    const disposition: Disposition = {
      id: `DIS-${dispositionSeq++}`,
      rma,
      sku: order.lines[0].sku,
      action: actionText,
      qty: order.qty,
    };
    this.dispositions.update((d) => [disposition, ...d]);

    return { ok: true, disposition };
  }
}
