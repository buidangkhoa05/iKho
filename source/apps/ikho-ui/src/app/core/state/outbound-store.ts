import { computed, Injectable, signal } from '@angular/core';
import { Localized } from '../i18n/localized.type';
import { Allocation, ALLOCATIONS } from '../mock-data/allocations.data';
import { PRODUCTS } from '../mock-data/products.data';
import { SalesOrder, SalesOrderLine, SALES_ORDERS } from '../mock-data/sales-orders.data';
import { Shipment, SHIPMENTS } from '../mock-data/shipments.data';

export interface CreateSalesOrderLineInput {
  sku: string;
  qty: number;
}

export interface CreateSalesOrderInput {
  customer: string;
  dock: string;
  cutoff: string;
  lines: CreateSalesOrderLineInput[];
}

export type AllocateResult = { ok: true } | { ok: false; error: string };
export type DispatchResult = { ok: true; shipment: Shipment } | { ok: false; error: string };

let soSeq = 88300;
let shipmentSeq = 51200;

function productName(sku: string): Localized<string> {
  return PRODUCTS.find((p) => p.sku === sku)?.name ?? { en: sku, vi: sku };
}

@Injectable({ providedIn: 'root' })
export class OutboundStore {
  readonly salesOrders = signal<SalesOrder[]>([...SALES_ORDERS]);
  readonly allocations = signal<Allocation[]>([...ALLOCATIONS]);
  readonly shipments = signal<Shipment[]>([...SHIPMENTS]);

  /** Single source of truth for which sales orders are ready to dispatch. */
  readonly dispatchReady = computed(() => this.salesOrders().filter((o) => o.status === 'outbound'));

  createSalesOrder(input: CreateSalesOrderInput): SalesOrder {
    const lines: SalesOrderLine[] = input.lines.map((line) => ({
      sku: line.sku,
      productName: productName(line.sku),
      orderedQty: line.qty,
      allocatedQty: 0,
    }));

    const order: SalesOrder = {
      so: `SO-${soSeq++}`,
      customer: input.customer,
      ordered: lines.reduce((sum, l) => sum + l.orderedQty, 0),
      allocated: 0,
      dock: input.dock,
      cutoff: input.cutoff,
      status: 'inbound',
      label: { en: 'Open', vi: 'Đang mở' },
      lines,
    };

    this.salesOrders.update((orders) => [order, ...orders]);
    return order;
  }

  allocate(soId: string): AllocateResult {
    const order = this.salesOrders().find((o) => o.so === soId);
    if (!order) return { ok: false, error: `Sales order '${soId}' was not found.` };

    const insufficient = order.lines.filter((l) => {
      const product = PRODUCTS.find((p) => p.sku === l.sku);
      return !product || product.qty < l.orderedQty;
    });
    if (insufficient.length > 0) {
      const skus = insufficient.map((l) => l.sku).join(', ');
      return { ok: false, error: `Insufficient stock to allocate: ${skus}.` };
    }

    const updatedLines = order.lines.map((l) => ({ ...l, allocatedQty: l.orderedQty }));
    const updatedOrder: SalesOrder = {
      ...order,
      lines: updatedLines,
      allocated: order.ordered,
      status: 'outbound',
      label: { en: 'Allocated', vi: 'Đã phân bổ' },
    };
    this.salesOrders.update((orders) => orders.map((o) => (o.so === soId ? updatedOrder : o)));

    const newAllocations: Allocation[] = updatedLines.map((l) => ({
      so: soId,
      sku: l.sku,
      bin: PRODUCTS.find((p) => p.sku === l.sku)?.bin ?? '—',
      qty: l.orderedQty,
      status: 'outbound',
      label: { en: 'Reserved', vi: 'Đã giữ' },
    }));
    this.allocations.update((allocs) => [...allocs, ...newAllocations]);

    return { ok: true };
  }

  dispatch(soId: string): DispatchResult {
    const order = this.salesOrders().find((o) => o.so === soId);
    if (!order || order.status !== 'outbound') {
      return { ok: false, error: `Sales order '${soId}' is not ready to dispatch.` };
    }

    const shipment: Shipment = {
      shipment: `SHP-${shipmentSeq++}`,
      so: soId,
      carrier: 'Standard Freight',
      dock: order.dock,
      departure: 'Now',
      status: 'in-stock',
      label: { en: 'Departed', vi: 'Đã rời kho' },
    };
    this.shipments.update((s) => [shipment, ...s]);

    const updatedOrder: SalesOrder = { ...order, status: 'in-stock', label: { en: 'Dispatched', vi: 'Đã xuất' } };
    this.salesOrders.update((orders) => orders.map((o) => (o.so === soId ? updatedOrder : o)));

    this.allocations.update((allocs) => allocs.filter((a) => a.so !== soId));

    return { ok: true, shipment };
  }
}
