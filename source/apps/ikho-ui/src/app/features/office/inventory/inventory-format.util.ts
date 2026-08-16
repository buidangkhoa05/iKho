import { StockStatus } from '@ikho/shared-ui';
import { AppLang } from '../../../core/i18n/localized.type';
import { Product } from '../../../core/mock-data/catalogue.data';
import { ReservationStatus, StockItem, StockReservation } from '../../../core/mock-data/inventory.data';
import { Warehouse } from '../../../core/mock-data/organization.data';

/** On-hand minus reserved, damaged, and quarantined units — the sellable/pickable quantity. */
export function availableOf(item: Pick<StockItem, 'onHand' | 'reserved' | 'damaged' | 'quarantine'>): number {
  return item.onHand - item.reserved - item.damaged - item.quarantine;
}

type ReservationBadgeStatus = Extract<StockStatus, 'in-stock' | 'out-of-stock' | 'outbound'>;

const RESERVATION_BADGE: Record<ReservationStatus, { status: ReservationBadgeStatus; label: { en: string; vi: string } }> = {
  active: { status: 'in-stock', label: { en: 'Active', vi: 'Đang giữ' } },
  fulfilled: { status: 'outbound', label: { en: 'Fulfilled', vi: 'Đã hoàn tất' } },
  released: { status: 'out-of-stock', label: { en: 'Released', vi: 'Đã nhả' } },
};

/** Maps a reservation status to its status-badge color and bilingual label. */
export function reservationBadge(status: ReservationStatus, lang: AppLang): { status: ReservationBadgeStatus; label: string } {
  const entry = RESERVATION_BADGE[status];
  return { status: entry.status, label: entry.label[lang] };
}

/** Formats a reservation's reference (type + id), or `noneLabel` when either part is missing. */
export function referenceOf(r: Pick<StockReservation, 'referenceType' | 'referenceId'>, noneLabel: string): string {
  return r.referenceType && r.referenceId ? `${r.referenceType} ${r.referenceId}` : noneLabel;
}

/** Resolves a product's display name by SKU, falling back to the SKU itself when not found. */
export function productNameOf(products: Pick<Product, 'sku' | 'name'>[], sku: string): string {
  return products.find((p) => p.sku === sku)?.name ?? sku;
}

/** Resolves a warehouse's display name by code, falling back to the code itself when not found. */
export function warehouseNameOf(warehouses: Pick<Warehouse, 'code' | 'name'>[], code: string): string {
  return warehouses.find((w) => w.code === code)?.name ?? code;
}

/** A stock item's lot number or serial value, whichever is set, or `fallback` when neither is. */
export function lotOrSerialOf(item: Pick<StockItem, 'lot' | 'serial'>, fallback = ''): string {
  return item.lot?.lotNumber ?? item.serial?.serialValue ?? fallback;
}
