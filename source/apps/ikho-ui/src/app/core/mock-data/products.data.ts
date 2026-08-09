import { StockStatus } from '@ikho/shared-ui';
import { Localized } from '../i18n/localized.type';

export interface Product {
  [key: string]: unknown;
  sku: string;
  status: StockStatus;
  bin: string;
  qty: number;
  reorder: number;
  brand: string;
  uom: string;
  barcode: string;
  tracking: Localized<string>;
  name: Localized<string>;
  category: Localized<string>;
}

export const PRODUCTS: Product[] = [
  { sku: 'IKH-482910', status: 'in-stock', bin: 'A-12-04', qty: 240, reorder: 80, brand: 'Vanderberg', uom: 'EA', barcode: '8712345482910', tracking: { en: 'Lot-controlled', vi: 'Theo lô' }, name: { en: 'Steel shelving bracket, 400mm', vi: 'Giá đỡ kệ thép, 400mm' }, category: { en: 'Racking', vi: 'Kệ hàng' } },
  { sku: 'IKH-330298', status: 'low-stock', bin: 'A-04-09', qty: 60, reorder: 120, brand: 'Nordic Labels', uom: 'ROL', barcode: '8712345330298', tracking: { en: 'Lot-controlled', vi: 'Theo lô' }, name: { en: 'Barcode label roll, 100×50mm', vi: 'Cuộn tem mã vạch, 100×50mm' }, category: { en: 'Consumables', vi: 'Vật tư tiêu hao' } },
  { sku: 'IKH-770145', status: 'out-of-stock', bin: 'D-01-01', qty: 0, reorder: 40, brand: 'EuroPallet', uom: 'EA', barcode: '8712345770145', tracking: { en: 'None', vi: 'Không' }, name: { en: 'Euro pallet, heat-treated', vi: 'Pallet Euro, xử lý nhiệt' }, category: { en: 'Packaging', vi: 'Bao bì' } },
  { sku: 'IKH-105522', status: 'in-stock', bin: 'B-02-11', qty: 1840, reorder: 400, brand: 'Kartonex', uom: 'EA', barcode: '8712345105522', tracking: { en: 'None', vi: 'Không' }, name: { en: 'Corrugated box, 305×229×229mm', vi: 'Thùng carton, 305×229×229mm' }, category: { en: 'Packaging', vi: 'Bao bì' } },
  { sku: 'IKH-664120', status: 'low-stock', bin: 'A-04-02', qty: 18, reorder: 60, brand: 'Wrapline', uom: 'ROL', barcode: '8712345664120', tracking: { en: 'Lot-controlled', vi: 'Theo lô' }, name: { en: 'Pallet wrap film, 500mm', vi: 'Màng quấn pallet, 500mm' }, category: { en: 'Consumables', vi: 'Vật tư tiêu hao' } },
  { sku: 'IKH-201884', status: 'in-stock', bin: 'C-07-03', qty: 96, reorder: 24, brand: 'Vanderberg', uom: 'EA', barcode: '8712345201884', tracking: { en: 'Serial-controlled', vi: 'Theo serial' }, name: { en: 'Hand pallet truck, 2.5t', vi: 'Xe nâng tay, 2,5 tấn' }, category: { en: 'Equipment', vi: 'Thiết bị' } },
  { sku: 'IKH-559071', status: 'in-stock', bin: 'B-05-08', qty: 620, reorder: 150, brand: 'Kartonex', uom: 'EA', barcode: '8712345559071', tracking: { en: 'None', vi: 'Không' }, name: { en: 'Void fill paper, 380mm', vi: 'Giấy chèn lót, 380mm' }, category: { en: 'Packaging', vi: 'Bao bì' } },
  { sku: 'IKH-318440', status: 'low-stock', bin: 'A-11-06', qty: 34, reorder: 100, brand: 'Vanderberg', uom: 'EA', barcode: '8712345318440', tracking: { en: 'Lot-controlled', vi: 'Theo lô' }, name: { en: 'Shelf divider, 600mm', vi: 'Vách ngăn kệ, 600mm' }, category: { en: 'Racking', vi: 'Kệ hàng' } },
  { sku: 'IKH-902316', status: 'in-stock', bin: 'C-02-01', qty: 48, reorder: 12, brand: 'ScanTech', uom: 'EA', barcode: '8712345902316', tracking: { en: 'Serial-controlled', vi: 'Theo serial' }, name: { en: 'Handheld scanner, 2D', vi: 'Máy quét cầm tay, 2D' }, category: { en: 'Equipment', vi: 'Thiết bị' } },
  { sku: 'IKH-447203', status: 'out-of-stock', bin: 'A-04-11', qty: 0, reorder: 80, brand: 'Nordic Labels', uom: 'ROL', barcode: '8712345447203', tracking: { en: 'Lot-controlled', vi: 'Theo lô' }, name: { en: 'Thermal ribbon, 110mm', vi: 'Ruy băng nhiệt, 110mm' }, category: { en: 'Consumables', vi: 'Vật tư tiêu hao' } },
];
