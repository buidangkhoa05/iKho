import { AppLang, Localized } from '../i18n/localized.type';
import { AppRole } from '../session/role.service';

export type ScreenId =
  | 'dashboard'
  | 'organization'
  | 'catalogue'
  | 'partners'
  | 'inventory'
  | 'inbound'
  | 'outbound'
  | 'returns'
  | 'billing'
  | 'reporting';

export interface ScreenDef {
  icon: string;
  label: Localized<string>;
  roles: AppRole[];
  title?: { admin: Localized<string>; operator: Localized<string> };
  meta?: { admin: Localized<string>; operator: Localized<string> };
  action: Localized<string>;
  /** Bullet list used for Operator Mode's "not yet designed" outlined screens. */
  bullets?: Localized<string[]>;
}

export const SCREENS: Record<ScreenId, ScreenDef> = {
  dashboard: {
    icon: 'layout-dashboard',
    label: { en: 'Dashboard', vi: 'Dashboard' },
    roles: ['admin', 'operator'],
    title: { admin: { en: 'Dashboard', vi: 'Dashboard' }, operator: { en: 'My tasks', vi: 'Nhiệm vụ của tôi' } },
    meta: {
      admin: { en: 'WH-1 Rotterdam · 07 Aug · 09:42', vi: 'WH-1 Rotterdam · 07 Thg 8 · 09:42' },
      operator: { en: 'WH-1 Rotterdam · Shift 06:00–14:00', vi: 'WH-1 Rotterdam · Ca 06:00–14:00' },
    },
    action: { en: 'Export report', vi: 'Xuất báo cáo' },
  },
  organization: {
    icon: 'building-2',
    label: { en: 'Organization', vi: 'Tổ chức' },
    roles: ['admin'],
    action: { en: 'Add warehouse', vi: 'Thêm kho' },
    bullets: {
      en: [
        'Company → warehouse → zone → aisle → bin tree',
        'Dock register with inbound/outbound assignment',
        'Activate or deactivate a location without deleting history',
      ],
      vi: [
        'Cây công ty → kho → khu → dãy → ô kệ',
        'Danh sách cửa kho gắn với nhập/xuất',
        'Bật/tắt vị trí mà không xoá lịch sử',
      ],
    },
  },
  catalogue: {
    icon: 'package',
    label: { en: 'Catalogue', vi: 'Danh mục' },
    roles: ['admin', 'operator'],
    title: { admin: { en: 'Catalogue', vi: 'Danh mục sản phẩm' }, operator: { en: 'Product lookup', vi: 'Tra cứu sản phẩm' } },
    meta: {
      admin: { en: 'Product master data · Category, brand, barcode', vi: 'Dữ liệu sản phẩm · Nhóm, thương hiệu, mã vạch' },
      operator: { en: 'Scan a barcode or search', vi: 'Quét mã vạch hoặc tìm kiếm' },
    },
    action: { en: 'Add product', vi: 'Thêm sản phẩm' },
  },
  partners: {
    icon: 'users',
    label: { en: 'Partners', vi: 'Đối tác' },
    roles: ['admin'],
    action: { en: 'Add partner', vi: 'Thêm đối tác' },
    bullets: {
      en: [
        'Supplier and customer records with addresses and contacts',
        'Partner identity kept separate from orders',
        'Lead time and default incoterms per supplier',
      ],
      vi: [
        'Hồ sơ nhà cung cấp và khách hàng kèm địa chỉ, liên hệ',
        'Danh tính đối tác tách khỏi đơn hàng',
        'Thời gian giao và điều kiện mặc định theo nhà cung cấp',
      ],
    },
  },
  inventory: {
    icon: 'boxes',
    label: { en: 'Inventory', vi: 'Tồn kho' },
    roles: ['admin', 'operator'],
    action: { en: 'Adjust stock', vi: 'Điều chỉnh tồn' },
    bullets: {
      en: [
        'On hand, available, reserved, damaged, quarantine per bin',
        'Stock ledger — every quantity change with its source document',
        'Lot and serial tracking driven by catalogue policy',
      ],
      vi: [
        'Tồn thực, khả dụng, đã giữ, hư hỏng, cách ly theo ô kệ',
        'Sổ cái tồn kho — mọi thay đổi kèm chứng từ nguồn',
        'Theo dõi lô và serial theo chính sách danh mục',
      ],
    },
  },
  inbound: {
    icon: 'truck',
    label: { en: 'Inbound', vi: 'Nhập kho' },
    roles: ['admin', 'operator'],
    action: { en: 'Create purchase order', vi: 'Tạo đơn mua hàng' },
    bullets: {
      en: [
        'Purchase order lines with expected quantity and dock',
        'Receipt posting with over/under exception workflow',
        'Putaway tasks generated from received lines',
      ],
      vi: [
        'Dòng đơn mua với số lượng dự kiến và cửa kho',
        'Ghi nhận phiếu nhập kèm luồng xử lý thừa/thiếu',
        'Sinh nhiệm vụ cất kho từ dòng đã nhận',
      ],
    },
  },
  outbound: {
    icon: 'package-check',
    label: { en: 'Outbound', vi: 'Xuất kho' },
    roles: ['admin', 'operator'],
    action: { en: 'Create sales order', vi: 'Tạo đơn bán hàng' },
    bullets: {
      en: [
        'Sales order lines allocated against available stock',
        'Shipment dispatched directly from confirmed allocations',
        'Cut-off times and dock assignment per shipment',
      ],
      vi: [
        'Dòng đơn bán được phân bổ theo tồn khả dụng',
        'Xuất hàng trực tiếp từ phân bổ đã xác nhận',
        'Giờ chốt và cửa kho theo từng lô xuất',
      ],
    },
  },
  returns: {
    icon: 'undo-2',
    label: { en: 'Returns', vi: 'Trả hàng' },
    roles: ['admin', 'operator'],
    action: { en: 'Log return', vi: 'Ghi nhận trả hàng' },
    bullets: {
      en: [
        'Return order and receipt against the original shipment',
        'Inspection step before stock becomes sellable again',
        'Disposition: restock, quarantine, scrap, or vendor return',
      ],
      vi: [
        'Đơn trả và phiếu nhận đối chiếu lô xuất gốc',
        'Bước kiểm tra trước khi hàng được bán lại',
        'Xử lý: nhập lại, cách ly, huỷ, hoặc trả nhà cung cấp',
      ],
    },
  },
  billing: {
    icon: 'receipt-text',
    label: { en: 'Billing', vi: 'Hoá đơn' },
    roles: ['admin'],
    action: { en: 'Issue invoice', vi: 'Phát hành hoá đơn' },
    bullets: {
      en: [
        'Invoices and credit notes from operational snapshots',
        'Issued documents preserve the captured commercial facts',
        'Payment register linked to invoice lines',
      ],
      vi: [
        'Hoá đơn và giấy báo có từ ảnh chụp nghiệp vụ',
        'Chứng từ đã phát hành giữ nguyên dữ kiện thương mại',
        'Sổ thanh toán liên kết với dòng hoá đơn',
      ],
    },
  },
  reporting: {
    icon: 'chart-line',
    label: { en: 'Reporting', vi: 'Báo cáo' },
    roles: ['admin'],
    action: { en: 'Build report', vi: 'Tạo báo cáo' },
    bullets: {
      en: [
        'Inventory position, inbound and outbound status read models',
        'Fulfillment KPIs rebuildable from source events',
        'Scheduled exports — Office Console only, never on a handheld',
      ],
      vi: [
        'Mô hình đọc: vị thế tồn kho, trạng thái nhập và xuất',
        'KPI giao hàng dựng lại được từ sự kiện gốc',
        'Xuất theo lịch — chỉ trên Office Console, không trên thiết bị cầm tay',
      ],
    },
  },
};

export const ADMIN_ORDER: ScreenId[] = [
  'dashboard', 'organization', 'catalogue', 'partners', 'inventory', 'inbound', 'outbound', 'returns', 'billing', 'reporting',
];

export const OPERATOR_ORDER: ScreenId[] = ['dashboard', 'catalogue', 'inbound', 'outbound', 'inventory', 'returns'];

export function screenTitle(id: ScreenId, role: AppRole, lang: AppLang): string {
  const def = SCREENS[id];
  return def.title ? def.title[role][lang] : def.label[lang];
}

export function screenMeta(id: ScreenId, role: AppRole, lang: AppLang): string {
  const def = SCREENS[id];
  if (def.meta) return def.meta[role][lang];
  return role === 'admin' ? 'Office Console · WH-1 Rotterdam' : lang === 'en' ? 'Operator · WH-1 Rotterdam' : 'Vận hành · WH-1 Rotterdam';
}

export function navOrder(role: AppRole): ScreenId[] {
  return role === 'admin' ? ADMIN_ORDER : OPERATOR_ORDER;
}

/** Screen to land on when switching to `targetRole` — keeps the current screen if it exists there, else that role's dashboard. */
export function equivalentScreen(current: ScreenId, targetRole: AppRole): ScreenId {
  const order = navOrder(targetRole);
  return order.includes(current) ? current : 'dashboard';
}
