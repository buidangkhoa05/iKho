import { StockStatus } from '@ikho/shared-ui';
import { Localized } from '../i18n/localized.type';

export interface SalesOrderLine {
  sku: string;
  productName: Localized<string>;
  orderedQty: number;
  allocatedQty: number;
}

export interface SalesOrder {
  [key: string]: unknown;
  so: string;
  customer: string;
  ordered: number;
  allocated: number;
  dock: string;
  cutoff: string;
  status: StockStatus;
  label: Localized<string>;
  lines: SalesOrderLine[];
}

export const SALES_ORDERS: SalesOrder[] = [
  {
    so: 'SO-88214', customer: 'Meijer Retail Group', ordered: 18, allocated: 18, dock: 'Dock 2', cutoff: '17:00',
    status: 'in-stock', label: { en: 'Dispatched', vi: 'Đã xuất' },
    lines: [
      { sku: 'IKH-482910', productName: { en: 'Steel shelving bracket, 400mm', vi: 'Giá đỡ kệ thép, 400mm' }, orderedQty: 18, allocatedQty: 18 },
    ],
  },
  {
    so: 'SO-88219', customer: 'Brico Bouwmarkt', ordered: 24, allocated: 24, dock: 'Dock 2', cutoff: '17:00',
    status: 'outbound', label: { en: 'Allocated', vi: 'Đã phân bổ' },
    lines: [
      { sku: 'IKH-105522', productName: { en: 'Corrugated box, 305×229×229mm', vi: 'Thùng carton, 305×229×229mm' }, orderedQty: 24, allocatedQty: 24 },
    ],
  },
  {
    so: 'SO-88222', customer: 'Meijer Retail Group', ordered: 9, allocated: 9, dock: 'Dock 4', cutoff: '12:00',
    status: 'outbound', label: { en: 'Allocated', vi: 'Đã phân bổ' },
    lines: [
      { sku: 'IKH-559071', productName: { en: 'Void fill paper, 380mm', vi: 'Giấy chèn lót, 380mm' }, orderedQty: 9, allocatedQty: 9 },
    ],
  },
  {
    so: 'SO-88208', customer: 'Hafen Bremen GmbH', ordered: 32, allocated: 0, dock: 'Dock 1', cutoff: '17:00',
    status: 'inbound', label: { en: 'Open', vi: 'Đang mở' },
    lines: [
      { sku: 'IKH-664120', productName: { en: 'Pallet wrap film, 500mm', vi: 'Màng quấn pallet, 500mm' }, orderedQty: 32, allocatedQty: 0 },
    ],
  },
];
