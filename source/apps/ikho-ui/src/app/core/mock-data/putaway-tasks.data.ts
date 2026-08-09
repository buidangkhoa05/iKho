import { StockStatus } from '@ikho/shared-ui';
import { Localized } from '../i18n/localized.type';

export interface PutawayTask {
  [key: string]: unknown;
  id: string;
  poId: string;
  sku: string;
  productName: Localized<string>;
  fromDock: string;
  toBin: string;
  qty: number;
  operator: string;
  status: StockStatus;
  label: Localized<string>;
}

export const PUTAWAY_TASKS: PutawayTask[] = [
  {
    id: 'PUT-7741', poId: 'PO-10482', sku: 'IKH-482910',
    productName: { en: 'Steel shelving bracket, 400mm', vi: 'Giá đỡ kệ thép, 400mm' },
    fromDock: 'Dock 3', toBin: 'A-12-04', qty: 240, operator: 'T. Willems',
    status: 'inbound', label: { en: 'Assigned', vi: 'Đã giao' },
  },
  {
    id: 'PUT-7742', poId: 'PO-10488', sku: 'IKH-330298',
    productName: { en: 'Barcode label roll, 100×50mm', vi: 'Cuộn tem mã vạch, 100×50mm' },
    fromDock: 'Dock 3', toBin: 'A-04-09', qty: 60, operator: 'T. Willems',
    status: 'inbound', label: { en: 'Assigned', vi: 'Đã giao' },
  },
  {
    id: 'PUT-7739', poId: 'PO-10399', sku: 'IKH-559071',
    productName: { en: 'Void fill paper, 380mm', vi: 'Giấy chèn lót, 380mm' },
    fromDock: 'Dock 1', toBin: 'B-05-08', qty: 620, operator: 'S. Peeters',
    status: 'in-stock', label: { en: 'Complete', vi: 'Hoàn thành' },
  },
];
