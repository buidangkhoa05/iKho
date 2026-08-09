import { StockStatus } from '@ikho/shared-ui';
import { AppLang, Localized } from './localized.type';

const STATUS_LABEL: Record<StockStatus, Localized<string>> = {
  'in-stock': { en: 'In Stock', vi: 'Còn hàng' },
  'low-stock': { en: 'Low Stock', vi: 'Sắp hết' },
  'out-of-stock': { en: 'Out of Stock', vi: 'Hết hàng' },
  inbound: { en: 'Inbound', vi: 'Nhập kho' },
  outbound: { en: 'Outbound', vi: 'Xuất kho' },
  returns: { en: 'Returns', vi: 'Trả hàng' },
};

/** Resolves a row's status badge label: its own {en,vi} label if present, else the status's default. */
export function resolveStatusLabel(row: { status: StockStatus; label?: Localized<string> }, lang: AppLang): string {
  return row.label ? row.label[lang] : STATUS_LABEL[row.status][lang];
}
