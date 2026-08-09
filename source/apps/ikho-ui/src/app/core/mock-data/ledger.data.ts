import { Localized } from '../i18n/localized.type';

export interface LedgerEntry {
  [key: string]: unknown;
  doc: string;
  type: Localized<string>;
  sku: string;
  bin: string;
  delta: string;
  time: string;
  user: string;
}

export const LEDGER: LedgerEntry[] = [
  { doc: 'RCP-20418', type: { en: 'Receipt', vi: 'Nhập kho' }, sku: 'IKH-482910', bin: 'A-12-04', delta: '+240', time: '09:30', user: 'T. Willems' },
  { doc: 'PUT-7741', type: { en: 'Putaway', vi: 'Cất kho' }, sku: 'IKH-482910', bin: 'A-12-04', delta: '0', time: '09:41', user: 'T. Willems' },
  { doc: 'SO-88214', type: { en: 'Allocation', vi: 'Phân bổ' }, sku: 'IKH-105522', bin: 'B-02-11', delta: '−260', time: '09:12', user: 'K. Bakker' },
  { doc: 'ADJ-0442', type: { en: 'Adjustment', vi: 'Điều chỉnh' }, sku: 'IKH-664120', bin: 'A-04-02', delta: '−6', time: '08:47', user: 'M. de Vries' },
  { doc: 'RMA-0334', type: { en: 'Return restock', vi: 'Nhập lại hàng trả' }, sku: 'IKH-318440', bin: 'A-11-06', delta: '+12', time: '08:20', user: 'S. Peeters' },
  { doc: 'SHP-51120', type: { en: 'Dispatch', vi: 'Xuất hàng' }, sku: 'IKH-559071', bin: 'B-05-08', delta: '−140', time: '07:55', user: 'K. Bakker' },
];
