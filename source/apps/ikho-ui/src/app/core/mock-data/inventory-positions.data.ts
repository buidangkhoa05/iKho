import { StockStatus } from '@ikho/shared-ui';
import { Localized } from '../i18n/localized.type';

export interface InventoryPosition {
  [key: string]: unknown;
  sku: string;
  productName: Localized<string>;
  warehouse: string;
  onHand: number;
  reserved: number;
  quarantine: number;
  damaged: number;
  available: number;
  status: StockStatus;
}

export const INVENTORY_POSITIONS: InventoryPosition[] = [
  { sku: 'IKH-482910', productName: { en: 'Steel shelving bracket, 400mm', vi: 'Giá đỡ kệ thép, 400mm' }, warehouse: 'WH-1 Rotterdam', onHand: 240, reserved: 40, quarantine: 0, damaged: 0, available: 200, status: 'in-stock' },
  { sku: 'IKH-330298', productName: { en: 'Barcode label roll, 100×50mm', vi: 'Cuộn tem mã vạch, 100×50mm' }, warehouse: 'WH-1 Rotterdam', onHand: 60, reserved: 12, quarantine: 0, damaged: 0, available: 48, status: 'low-stock' },
  { sku: 'IKH-770145', productName: { en: 'Euro pallet, heat-treated', vi: 'Pallet Euro, xử lý nhiệt' }, warehouse: 'WH-1 Rotterdam', onHand: 0, reserved: 0, quarantine: 0, damaged: 0, available: 0, status: 'out-of-stock' },
  { sku: 'IKH-105522', productName: { en: 'Corrugated box, 305×229×229mm', vi: 'Thùng carton, 305×229×229mm' }, warehouse: 'WH-3 Utrecht', onHand: 1840, reserved: 300, quarantine: 20, damaged: 4, available: 1516, status: 'in-stock' },
  { sku: 'IKH-664120', productName: { en: 'Pallet wrap film, 500mm', vi: 'Màng quấn pallet, 500mm' }, warehouse: 'WH-1 Rotterdam', onHand: 18, reserved: 6, quarantine: 6, damaged: 0, available: 6, status: 'low-stock' },
  { sku: 'IKH-318440', productName: { en: 'Shelf divider, 600mm', vi: 'Vách ngăn kệ, 600mm' }, warehouse: 'WH-3 Utrecht', onHand: 34, reserved: 10, quarantine: 0, damaged: 0, available: 24, status: 'low-stock' },
];
