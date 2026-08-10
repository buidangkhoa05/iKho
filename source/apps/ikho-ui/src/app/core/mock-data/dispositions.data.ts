import { Localized } from '../i18n/localized.type';

export interface Disposition {
  [key: string]: unknown;
  id: string;
  rma: string;
  sku: string;
  action: Localized<string>;
  qty: number;
}

export const DISPOSITIONS: Disposition[] = [
  { id: 'DIS-0441', rma: 'RMA-0331', sku: 'IKH-105522', action: { en: 'Scrap', vi: 'Huỷ' }, qty: 4 },
  { id: 'DIS-0442', rma: 'RMA-0334', sku: 'IKH-318440', action: { en: 'Restock to A-11-06', vi: 'Nhập lại vào A-11-06' }, qty: 12 },
];
