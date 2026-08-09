import { Localized } from '../i18n/localized.type';
import { AdminColumn, AdminKpi } from './admin-screens.data';

export const DASHBOARD_KPIS: AdminKpi[] = [
  {
    label: { en: 'Units in stock', vi: 'Đơn vị tồn kho' },
    value: '184,220',
    trend: { en: '+4.2%', vi: '+4.2%' },
    trendStatus: 'in-stock',
    caption: { en: 'vs. last week', vi: 'so với tuần trước' },
  },
  {
    label: { en: 'Open inbound orders', vi: 'Đơn nhập đang mở' },
    value: '37',
    trend: { en: '6 overdue', vi: '6 quá hạn' },
    trendStatus: 'low-stock',
  },
  {
    label: { en: 'Out of stock SKUs', vi: 'SKU hết hàng' },
    value: '12',
    trend: { en: '-2 vs. yesterday', vi: '-2 so với hôm qua' },
    trendStatus: 'out-of-stock',
  },
  {
    label: { en: 'Pending returns', vi: 'Trả hàng chờ xử lý' },
    value: '8',
  },
];

export const RECEIPT_COLUMNS: AdminColumn[] = [
  { key: 'id', label: { en: 'Receipt', vi: 'Phiếu nhập' }, mono: true },
  { key: 'po', label: { en: 'PO', vi: 'PO' }, mono: true },
  { key: 'supplier', label: { en: 'Supplier', vi: 'Nhà cung cấp' } },
  { key: 'lines', label: { en: 'Lines', vi: 'Dòng' }, mono: true },
  { key: 'dock', label: { en: 'Dock', vi: 'Cửa' } },
  { key: 'time', label: { en: 'Time', vi: 'Giờ' }, mono: true },
  { key: 'status', label: { en: 'Status', vi: 'Trạng thái' }, status: true },
];

export const INBOUND_TODAY_TITLE: Localized<string> = { en: 'Inbound receipts today', vi: 'Phiếu nhập hôm nay' };
export const INBOUND_TODAY_SUBTITLE: Localized<string> = {
  en: 'Posted and in progress · WH-1 Rotterdam',
  vi: 'Đã ghi nhận và đang xử lý · WH-1 Rotterdam',
};

export const OPERATOR_STATS: { label: Localized<string>; value: string }[] = [
  { label: { en: 'Assigned', vi: 'Được giao' }, value: '3' },
  { label: { en: 'In progress', vi: 'Đang xử lý' }, value: '1' },
  { label: { en: 'Done today', vi: 'Hoàn thành hôm nay' }, value: '12' },
];

export const TASK_QUEUE_LABEL: Localized<string> = { en: 'Task queue', vi: 'Hàng đợi nhiệm vụ' };
