import { Injectable, inject, signal } from '@angular/core';
import {
  STOCK_ITEMS, STOCK_LEDGER, STOCK_RESERVATIONS,
  StockItem, StockLedgerEntry, StockReservation,
} from '../mock-data/inventory.data';
import { CatalogStore } from './catalogue-store';

export type ReceiveStockOutcome =
  | 'ok' | 'invalid' | 'product-not-found' | 'lot-required' | 'serial-required' | 'serial-count-mismatch' | 'duplicate-serial';
export type AdjustStockOutcome = 'ok' | 'invalid' | 'not-found' | 'would-go-negative';
export type ReleaseReservationOutcome = 'ok' | 'not-found' | 'not-active';

export interface ReceiveStockInput {
  sku: string;
  warehouseCode: string;
  bin: string;
  quantity: number;
  lotNumber?: string;
  expirationDateUtc?: string;
  serialNumbers?: string[];
}

export interface AdjustStockInput {
  quantityDelta: number;
  reasonCode: string;
  notes: string;
}

let stockItemSeq = 9;
let ledgerSeq = 10;

@Injectable({ providedIn: 'root' })
export class InventoryStore {
  private readonly catalog = inject(CatalogStore);

  readonly stockItems = signal<StockItem[]>([...STOCK_ITEMS]);
  readonly ledger = signal<StockLedgerEntry[]>([...STOCK_LEDGER]);
  readonly reservations = signal<StockReservation[]>([...STOCK_RESERVATIONS]);

  receiveStock(input: ReceiveStockInput): ReceiveStockOutcome {
    const sku = input.sku.trim();
    const bin = input.bin.trim();
    if (!sku || !bin || input.quantity <= 0) return 'invalid';

    const product = this.catalog.products().find((p) => p.sku === sku);
    if (!product || !product.isActive) return 'product-not-found';

    if (product.isLotControlled && !input.lotNumber?.trim()) return 'lot-required';

    if (product.isSerialControlled) {
      const serials = input.serialNumbers ?? [];
      if (serials.length === 0) return 'serial-required';
      if (serials.length !== input.quantity) return 'serial-count-mismatch';
      const normalized = serials.map((s) => s.trim().toLowerCase());
      if (new Set(normalized).size !== normalized.length) return 'duplicate-serial';

      const now = new Date().toISOString();
      const newItems: StockItem[] = serials.map((serialValue) => ({
        id: `SI-${stockItemSeq++}`,
        sku,
        warehouseCode: input.warehouseCode,
        bin,
        serial: { serialValue: serialValue.trim(), status: 'in-stock' },
        onHand: 1,
        reserved: 0,
        damaged: 0,
        quarantine: 0,
        status: 'in-stock',
        createdOnUtc: now,
        updatedOnUtc: now,
      }));
      this.stockItems.update((list) => [...newItems, ...list]);
      this.ledger.update((list) => [
        ...newItems.map((item) => ({
          id: `LED-${ledgerSeq++}`,
          stockItemId: item.id,
          movementType: 'receipt' as const,
          quantityDelta: 1,
          occurredOnUtc: now,
        })),
        ...list,
      ]);
      return 'ok';
    }

    const now = new Date().toISOString();
    const lot = product.isLotControlled ? { lotNumber: input.lotNumber!.trim(), expirationDateUtc: input.expirationDateUtc } : undefined;
    const existing = this.stockItems().find(
      (item) => item.sku === sku && item.warehouseCode === input.warehouseCode && item.bin === bin && item.lot?.lotNumber === lot?.lotNumber,
    );

    let affectedId: string;
    if (existing) {
      affectedId = existing.id;
      this.stockItems.update((list) =>
        list.map((item) => (item.id === existing.id ? { ...item, onHand: item.onHand + input.quantity, updatedOnUtc: now } : item)),
      );
    } else {
      affectedId = `SI-${stockItemSeq++}`;
      const created: StockItem = {
        id: affectedId,
        sku,
        warehouseCode: input.warehouseCode,
        bin,
        lot,
        onHand: input.quantity,
        reserved: 0,
        damaged: 0,
        quarantine: 0,
        status: 'in-stock',
        createdOnUtc: now,
        updatedOnUtc: now,
      };
      this.stockItems.update((list) => [created, ...list]);
    }

    this.ledger.update((list) => [
      { id: `LED-${ledgerSeq++}`, stockItemId: affectedId, movementType: 'receipt', quantityDelta: input.quantity, occurredOnUtc: now },
      ...list,
    ]);
    return 'ok';
  }

  adjustStock(stockItemId: string, input: AdjustStockInput): AdjustStockOutcome {
    const reasonCode = input.reasonCode.trim();
    if (!reasonCode) return 'invalid';

    const stockItem = this.stockItems().find((s) => s.id === stockItemId);
    if (!stockItem) return 'not-found';

    const newOnHand = stockItem.onHand + input.quantityDelta;
    if (newOnHand < 0) return 'would-go-negative';

    const now = new Date().toISOString();
    this.stockItems.update((list) => list.map((s) => (s.id === stockItemId ? { ...s, onHand: newOnHand, updatedOnUtc: now } : s)));
    this.ledger.update((list) => [
      { id: `LED-${ledgerSeq++}`, stockItemId, movementType: 'adjustment', quantityDelta: input.quantityDelta, reasonCode, occurredOnUtc: now },
      ...list,
    ]);
    return 'ok';
  }

  releaseReservation(id: string): ReleaseReservationOutcome {
    const reservation = this.reservations().find((r) => r.id === id);
    if (!reservation) return 'not-found';
    if (reservation.status !== 'active') return 'not-active';

    const now = new Date().toISOString();
    this.stockItems.update((list) =>
      list.map((s) => (s.id === reservation.stockItemId ? { ...s, reserved: s.reserved - reservation.quantity, updatedOnUtc: now } : s)),
    );
    this.reservations.update((list) => list.map((r) => (r.id === id ? { ...r, status: 'released' as const, releasedOnUtc: now } : r)));
    this.ledger.update((list) => [
      {
        id: `LED-${ledgerSeq++}`,
        stockItemId: reservation.stockItemId,
        movementType: 'release',
        quantityDelta: 0,
        referenceType: reservation.referenceType,
        referenceId: reservation.referenceId,
        occurredOnUtc: now,
      },
      ...list,
    ]);
    return 'ok';
  }
}
