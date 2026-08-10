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

/**
 * Static, non-store-backed task-queue entries. Empty for now — Inbound's putaway
 * tasks and Outbound's dispatch-ready orders are both store-backed (see
 * InboundStore/OutboundStore); this array exists for any future domain that adds
 * simple decorative queue entries before it has its own store.
 */
export const STATIC_TASKS: OperatorTask[] = [];
