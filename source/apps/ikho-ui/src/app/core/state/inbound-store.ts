import { Injectable, signal } from '@angular/core';
import { Localized } from '../i18n/localized.type';
import { PRODUCTS } from '../mock-data/products.data';
import { PURCHASE_ORDERS, PurchaseOrder, PurchaseOrderLine } from '../mock-data/purchase-orders.data';
import { PUTAWAY_TASKS, PutawayTask } from '../mock-data/putaway-tasks.data';
import { RECEIPTS, Receipt, ReceiptLineDetail } from '../mock-data/receipts.data';

export interface CreatePurchaseOrderLineInput {
  sku: string;
  qty: number;
}

export interface CreatePurchaseOrderInput {
  supplier: string;
  dock: string;
  lines: CreatePurchaseOrderLineInput[];
}

export interface DockReceiptLineInput {
  sku: string;
  qty: number;
  exceptionReason?: Localized<string>;
}

let poSeq = 10500;
let receiptSeq = 20500;
let putawaySeq = 7800;

function productName(sku: string): Localized<string> {
  return PRODUCTS.find((p) => p.sku === sku)?.name ?? { en: sku, vi: sku };
}

@Injectable({ providedIn: 'root' })
export class InboundStore {
  readonly purchaseOrders = signal<PurchaseOrder[]>([...PURCHASE_ORDERS]);
  readonly receipts = signal<Receipt[]>([...RECEIPTS]);
  readonly putawayTasks = signal<PutawayTask[]>([...PUTAWAY_TASKS]);

  createPurchaseOrder(input: CreatePurchaseOrderInput): PurchaseOrder {
    const lines: PurchaseOrderLine[] = input.lines.map((line) => ({
      sku: line.sku,
      productName: productName(line.sku),
      expectedQty: line.qty,
      receivedQty: 0,
    }));

    const order: PurchaseOrder = {
      po: `PO-${poSeq++}`,
      supplier: input.supplier,
      expected: lines.reduce((sum, l) => sum + l.expectedQty, 0),
      received: 0,
      dock: input.dock,
      eta: '—',
      status: 'inbound',
      label: { en: 'Expected', vi: 'Dự kiến' },
      lines,
    };

    this.purchaseOrders.update((orders) => [order, ...orders]);
    return order;
  }

  recordDockReceipt(poId: string, lines: DockReceiptLineInput[]): void {
    const order = this.purchaseOrders().find((o) => o.po === poId);
    if (!order) return;

    const updatedLines = order.lines.map((line) => {
      const received = lines.find((l) => l.sku === line.sku);
      return received ? { ...line, receivedQty: line.receivedQty + received.qty } : line;
    });

    const hasException = lines.some((l) => l.exceptionReason);
    const isComplete = updatedLines.every((l) => l.receivedQty >= l.expectedQty);
    const status = hasException ? 'low-stock' : isComplete ? 'in-stock' : 'inbound';
    const label: Localized<string> = hasException
      ? { en: 'Short', vi: 'Thiếu' }
      : isComplete
        ? { en: 'Posted', vi: 'Đã ghi nhận' }
        : { en: 'Receiving', vi: 'Đang nhận' };
    const totalReceived = updatedLines.reduce((sum, l) => sum + l.receivedQty, 0);

    const updatedOrder: PurchaseOrder = { ...order, lines: updatedLines, received: totalReceived, status, label };
    this.purchaseOrders.update((orders) => orders.map((o) => (o.po === poId ? updatedOrder : o)));

    const lineDetails: ReceiptLineDetail[] = lines.map((l) => ({
      sku: l.sku,
      productName: productName(l.sku),
      qty: l.qty,
      exceptionReason: l.exceptionReason,
    }));

    const receipt: Receipt = {
      id: `RCP-${receiptSeq++}`,
      po: poId,
      supplier: order.supplier,
      lines: `${totalReceived} / ${order.expected}`,
      dock: order.dock,
      time: 'Now',
      status,
      label,
      lineDetails,
    };
    this.receipts.update((receipts) => [receipt, ...receipts]);

    const newTasks: PutawayTask[] = lines
      .filter((l) => l.qty > 0)
      .map((l) => ({
        id: `PUT-${putawaySeq++}`,
        poId,
        sku: l.sku,
        productName: productName(l.sku),
        fromDock: order.dock,
        toBin: PRODUCTS.find((p) => p.sku === l.sku)?.bin ?? '—',
        qty: l.qty,
        operator: '—',
        status: 'inbound',
        label: { en: 'Assigned', vi: 'Đã giao' },
      }));
    this.putawayTasks.update((tasks) => [...tasks, ...newTasks]);
  }

  confirmPutaway(taskId: string): void {
    this.putawayTasks.update((tasks) => tasks.filter((t) => t.id !== taskId));
  }
}
