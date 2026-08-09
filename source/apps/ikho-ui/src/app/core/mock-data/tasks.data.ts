import { StockStatus } from '@ikho/shared-ui';
import { Localized } from '../i18n/localized.type';

export interface OperatorTask {
  id: string;
  status: StockStatus;
  icon: string;
  kind: Localized<string>;
  title: Localized<string>;
  route: string;
  qty: Localized<string>;
}

export const TASKS: OperatorTask[] = [
  { id: 'PUT-7741', status: 'inbound', icon: 'truck', kind: { en: 'Putaway', vi: 'Cất kho' }, title: { en: 'Steel shelving bracket, 400mm', vi: 'Giá đỡ kệ thép, 400mm' }, route: 'Dock 3 → A-12-04', qty: { en: '240 units', vi: '240 cái' } },
  { id: 'PUT-7742', status: 'inbound', icon: 'truck', kind: { en: 'Putaway', vi: 'Cất kho' }, title: { en: 'Barcode label roll, 100×50mm', vi: 'Cuộn tem mã vạch, 100×50mm' }, route: 'Dock 3 → A-04-09', qty: { en: '60 rolls', vi: '60 cuộn' } },
  { id: 'PIK-3318', status: 'outbound', icon: 'package-check', kind: { en: 'Pick', vi: 'Lấy hàng' }, title: { en: 'Euro pallet, heat-treated', vi: 'Pallet Euro, xử lý nhiệt' }, route: 'D-01-01 → Dock 2', qty: { en: '48 units', vi: '48 cái' } },
];
