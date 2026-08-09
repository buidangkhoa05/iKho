import { StockStatus } from '@ikho/shared-ui';
import { Localized } from '../i18n/localized.type';

export interface Allocation {
  [key: string]: unknown;
  so: string;
  sku: string;
  bin: string;
  qty: number;
  status: StockStatus;
  label: Localized<string>;
}

export const ALLOCATIONS: Allocation[] = [
  { so: 'SO-88219', sku: 'IKH-105522', bin: 'B-02-11', qty: 24, status: 'outbound', label: { en: 'Reserved', vi: 'Đã giữ' } },
  { so: 'SO-88222', sku: 'IKH-559071', bin: 'B-05-08', qty: 9, status: 'outbound', label: { en: 'Reserved', vi: 'Đã giữ' } },
];
