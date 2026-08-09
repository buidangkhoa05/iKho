import { StockStatus } from '@ikho/shared-ui';
import { Localized } from '../i18n/localized.type';

export interface PurchaseOrderLine {
  sku: string;
  productName: Localized<string>;
  expectedQty: number;
  receivedQty: number;
}

export interface PurchaseOrder {
  [key: string]: unknown;
  po: string;
  supplier: string;
  expected: number;
  received: number;
  dock: string;
  eta: string;
  status: StockStatus;
  label: Localized<string>;
  lines: PurchaseOrderLine[];
}

export const PURCHASE_ORDERS: PurchaseOrder[] = [
  {
    po: 'PO-10482', supplier: 'Vanderberg Steel', expected: 40, received: 40, dock: 'Dock 3', eta: '09:30',
    status: 'in-stock', label: { en: 'Posted', vi: 'Đã ghi nhận' },
    lines: [
      { sku: 'IKH-482910', productName: { en: 'Steel shelving bracket, 400mm', vi: 'Giá đỡ kệ thép, 400mm' }, expectedQty: 40, receivedQty: 40 },
    ],
  },
  {
    po: 'PO-10488', supplier: 'Nordic Labels A/S', expected: 18, received: 12, dock: 'Dock 3', eta: '09:52',
    status: 'inbound', label: { en: 'Receiving', vi: 'Đang nhận' },
    lines: [
      { sku: 'IKH-330298', productName: { en: 'Barcode label roll, 100×50mm', vi: 'Cuộn tem mã vạch, 100×50mm' }, expectedQty: 18, receivedQty: 12 },
    ],
  },
  {
    po: 'PO-10490', supplier: 'EuroPallet NV', expected: 24, received: 0, dock: 'Dock 1', eta: '10:15',
    status: 'inbound', label: { en: 'Expected', vi: 'Dự kiến' },
    lines: [
      { sku: 'IKH-770145', productName: { en: 'Euro pallet, heat-treated', vi: 'Pallet Euro, xử lý nhiệt' }, expectedQty: 24, receivedQty: 0 },
    ],
  },
  {
    po: 'PO-10477', supplier: 'Wrapline BV', expected: 30, received: 6, dock: 'Dock 2', eta: '08:05',
    status: 'low-stock', label: { en: 'Short', vi: 'Thiếu' },
    lines: [
      { sku: 'IKH-664120', productName: { en: 'Pallet wrap film, 500mm', vi: 'Màng quấn pallet, 500mm' }, expectedQty: 30, receivedQty: 6 },
    ],
  },
];
