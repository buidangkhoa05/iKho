import { StockStatus } from '@ikho/shared-ui';
import { Localized } from '../i18n/localized.type';

export interface ReceiptLineDetail {
  sku: string;
  productName: Localized<string>;
  qty: number;
  exceptionReason?: Localized<string>;
}

export interface Receipt {
  [key: string]: unknown;
  id: string;
  po: string;
  supplier: string;
  lines: string;
  dock: string;
  time: string;
  status: StockStatus;
  label: Localized<string>;
  lineDetails: ReceiptLineDetail[];
}

export const RECEIPTS: Receipt[] = [
  {
    id: 'RCP-20418', po: 'PO-10482', supplier: 'Vanderberg Steel', lines: '40 / 40', dock: 'Dock 3', time: '09:30',
    status: 'in-stock', label: { en: 'Posted', vi: 'Đã ghi nhận' },
    lineDetails: [{ sku: 'IKH-482910', productName: { en: 'Steel shelving bracket, 400mm', vi: 'Giá đỡ kệ thép, 400mm' }, qty: 40 }],
  },
  {
    id: 'RCP-20419', po: 'PO-10488', supplier: 'Nordic Labels A/S', lines: '12 / 18', dock: 'Dock 3', time: '09:52',
    status: 'inbound', label: { en: 'Receiving', vi: 'Đang nhận' },
    lineDetails: [{ sku: 'IKH-330298', productName: { en: 'Barcode label roll, 100×50mm', vi: 'Cuộn tem mã vạch, 100×50mm' }, qty: 12 }],
  },
  {
    id: 'RCP-20420', po: 'PO-10490', supplier: 'EuroPallet NV', lines: '0 / 24', dock: 'Dock 1', time: '10:15',
    status: 'inbound', label: { en: 'Expected', vi: 'Dự kiến' },
    lineDetails: [],
  },
  {
    id: 'RCP-20415', po: 'PO-10477', supplier: 'Wrapline BV', lines: '6 / 30', dock: 'Dock 2', time: '08:05',
    status: 'low-stock', label: { en: 'Short', vi: 'Thiếu' },
    lineDetails: [{
      sku: 'IKH-664120', productName: { en: 'Pallet wrap film, 500mm', vi: 'Màng quấn pallet, 500mm' }, qty: 6,
      exceptionReason: { en: 'Short-shipped by supplier', vi: 'Nhà cung cấp giao thiếu' },
    }],
  },
];
