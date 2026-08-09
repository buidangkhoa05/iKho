import { StockStatus } from '@ikho/shared-ui';
import { Localized } from '../i18n/localized.type';

export interface Shipment {
  [key: string]: unknown;
  shipment: string;
  so: string;
  carrier: string;
  dock: string;
  departure: string;
  status: StockStatus;
  label: Localized<string>;
}

export const SHIPMENTS: Shipment[] = [
  { shipment: 'SHP-51120', so: 'SO-88214', carrier: 'DHL Freight', dock: 'Dock 2', departure: '07:55', status: 'in-stock', label: { en: 'Departed', vi: 'Đã rời kho' } },
];
