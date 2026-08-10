import { Localized } from '../i18n/localized.type';

export interface Inspection {
  [key: string]: unknown;
  id: string;
  rma: string;
  sku: string;
  outcome: Localized<string>;
  inspector: string;
}

export const INSPECTIONS: Inspection[] = [
  { id: 'INS-0912', rma: 'RMA-0331', sku: 'IKH-105522', outcome: { en: 'Unsellable — crushed', vi: 'Không bán được — bị bẹp' }, inspector: 'S. Peeters' },
  { id: 'INS-0914', rma: 'RMA-0334', sku: 'IKH-318440', outcome: { en: 'Sellable — unopened', vi: 'Bán được — chưa mở' }, inspector: 'S. Peeters' },
  { id: 'INS-0915', rma: 'RMA-0340', sku: 'IKH-559071', outcome: { en: 'Unsellable — water damage', vi: 'Không bán được — hư nước' }, inspector: 'S. Peeters' },
];
