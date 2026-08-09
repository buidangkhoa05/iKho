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

/** Static, non-Inbound task-queue entries (e.g. Outbound picks). Putaway tasks come from InboundStore / PUTAWAY_TASKS. */
export const STATIC_TASKS: OperatorTask[] = [
  {
    id: 'PIK-3318', status: 'outbound', icon: 'package-check',
    kind: { en: 'Pick', vi: 'Lấy hàng' }, title: { en: 'Euro pallet, heat-treated', vi: 'Pallet Euro, xử lý nhiệt' },
    route: 'D-01-01 → Dock 2', qty: { en: '48 units', vi: '48 cái' },
  },
];
