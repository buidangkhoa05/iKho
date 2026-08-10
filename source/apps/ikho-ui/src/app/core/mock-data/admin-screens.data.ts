import { StockStatus } from '@ikho/shared-ui';
import { Localized } from '../i18n/localized.type';
import { ALLOCATIONS } from './allocations.data';
import { CATEGORIES } from './categories.data';
import { DISPOSITIONS } from './dispositions.data';
import { INSPECTIONS } from './inspections.data';
import { LEDGER } from './ledger.data';
import { PRODUCTS } from './products.data';
import { PURCHASE_ORDERS } from './purchase-orders.data';
import { PUTAWAY_TASKS } from './putaway-tasks.data';
import { RECEIPTS } from './receipts.data';
import { RETURN_ORDERS } from './return-orders.data';
import { SALES_ORDERS } from './sales-orders.data';
import { SHIPMENTS } from './shipments.data';
import { ScreenId } from './screens.data';

export interface AdminKpi {
  label: Localized<string>;
  value: string;
  trend?: Localized<string>;
  trendStatus?: StockStatus;
  caption?: Localized<string>;
}

export interface AdminColumn {
  key: string;
  label: Localized<string>;
  align?: 'left' | 'right';
  mono?: boolean;
  /** row[key] is a {en,vi} pair that must be resolved to plain text for the current lang. */
  localized?: boolean;
  /** row[key] is a StockStatus; renders as a StatusBadge (label from row.label if present). */
  status?: boolean;
}

export interface AdminTab {
  id: string;
  label: Localized<string>;
  subtitle?: Localized<string>;
  columns: AdminColumn[];
  rows: Record<string, unknown>[];
}

export interface AdminScreenData {
  panelTitle: Localized<string>;
  panelSubtitle: Localized<string>;
  kpis: AdminKpi[];
  tabs: AdminTab[];
  /** catalogue + inventory only: the main tab supports search / status filter / detail drawer. */
  detailedTabId?: string;
}

const same = (v: string): Localized<string> => ({ en: v, vi: v });

export const ADMIN_SCREENS: Record<Exclude<ScreenId, 'dashboard'>, AdminScreenData> = {
  organization: {
    panelTitle: { en: 'Warehouses', vi: 'Danh sách kho' },
    panelSubtitle: { en: 'Company → warehouse → zone → aisle → bin', vi: 'Công ty → kho → khu → dãy → ô kệ' },
    kpis: [
      { label: { en: 'Warehouses', vi: 'Kho' }, value: '3' },
      { label: { en: 'Zones', vi: 'Khu' }, value: '14' },
      { label: { en: 'Bins', vi: 'Ô kệ' }, value: '4,820' },
      { label: { en: 'Docks', vi: 'Cửa kho' }, value: '9' },
    ],
    tabs: [
      {
        id: 'main',
        label: { en: 'Warehouses', vi: 'Danh sách kho' },
        columns: [
          { key: 'code', label: { en: 'Code', vi: 'Mã' }, mono: true },
          { key: 'name', label: { en: 'Warehouse', vi: 'Kho' }, localized: true },
          { key: 'zones', label: { en: 'Zones', vi: 'Khu' }, align: 'right', mono: true },
          { key: 'aisles', label: { en: 'Aisles', vi: 'Dãy' }, align: 'right', mono: true },
          { key: 'bins', label: { en: 'Bins', vi: 'Ô kệ' }, align: 'right', mono: true },
          { key: 'docks', label: { en: 'Docks', vi: 'Cửa' }, align: 'right', mono: true },
          { key: 'state', label: { en: 'State', vi: 'Tình trạng' }, localized: true },
        ],
        rows: [
          { code: 'WH-1', name: { en: 'Rotterdam DC', vi: 'Trung tâm Rotterdam' }, zones: '6', aisles: '42', bins: '2,140', docks: '5', state: { en: 'Active', vi: 'Đang hoạt động' } },
          { code: 'WH-2', name: { en: 'Antwerp Overflow', vi: 'Kho phụ Antwerp' }, zones: '4', aisles: '26', bins: '1,480', docks: '3', state: { en: 'Active', vi: 'Đang hoạt động' } },
          { code: 'WH-3', name: { en: 'Utrecht Returns Hub', vi: 'Trung tâm trả hàng Utrecht' }, zones: '4', aisles: '18', bins: '1,200', docks: '1', state: { en: 'Commissioning', vi: 'Đang thiết lập' } },
        ],
      },
      {
        id: 'zones',
        label: { en: 'Zones and bins', vi: 'Khu và ô kệ' },
        subtitle: { en: 'Location tree below warehouse level', vi: 'Cây vị trí dưới cấp kho' },
        columns: [
          { key: 'zone', label: { en: 'Zone', vi: 'Khu' }, mono: true },
          { key: 'warehouse', label: { en: 'Warehouse', vi: 'Kho' }, mono: true },
          { key: 'type', label: { en: 'Type', vi: 'Loại' }, localized: true },
          { key: 'aisles', label: { en: 'Aisles', vi: 'Dãy' }, align: 'right', mono: true },
          { key: 'bins', label: { en: 'Bins', vi: 'Ô kệ' }, align: 'right', mono: true },
        ],
        rows: [
          { zone: 'Z-A', warehouse: 'WH-1', type: { en: 'Bulk storage', vi: 'Lưu trữ khối' }, aisles: '14', bins: '720' },
          { zone: 'Z-B', warehouse: 'WH-1', type: { en: 'Pick face', vi: 'Khu lấy hàng' }, aisles: '12', bins: '640' },
          { zone: 'Z-C', warehouse: 'WH-1', type: { en: 'Equipment', vi: 'Thiết bị' }, aisles: '8', bins: '380' },
          { zone: 'Z-D', warehouse: 'WH-1', type: { en: 'Quarantine', vi: 'Cách ly' }, aisles: '8', bins: '400' },
        ],
      },
      {
        id: 'docks',
        label: { en: 'Docks', vi: 'Cửa kho' },
        subtitle: { en: 'Inbound and outbound door assignment', vi: 'Phân công cửa nhập và xuất' },
        columns: [
          { key: 'dock', label: { en: 'Dock', vi: 'Cửa' }, mono: true },
          { key: 'warehouse', label: { en: 'Warehouse', vi: 'Kho' }, mono: true },
          { key: 'direction', label: { en: 'Direction', vi: 'Chiều' }, localized: true },
          { key: 'state', label: { en: 'State', vi: 'Tình trạng' }, localized: true },
        ],
        rows: [
          { dock: 'Dock 1', warehouse: 'WH-1', direction: { en: 'Inbound', vi: 'Nhập' }, state: { en: 'Occupied', vi: 'Đang bận' } },
          { dock: 'Dock 2', warehouse: 'WH-1', direction: { en: 'Outbound', vi: 'Xuất' }, state: { en: 'Loading', vi: 'Đang xếp hàng' } },
          { dock: 'Dock 3', warehouse: 'WH-1', direction: { en: 'Inbound', vi: 'Nhập' }, state: { en: 'Occupied', vi: 'Đang bận' } },
          { dock: 'Dock 4', warehouse: 'WH-1', direction: { en: 'Outbound', vi: 'Xuất' }, state: { en: 'Free', vi: 'Trống' } },
        ],
      },
    ],
  },

  partners: {
    panelTitle: { en: 'Suppliers and customers', vi: 'Nhà cung cấp và khách hàng' },
    panelSubtitle: { en: 'Partner identity is kept separate from orders', vi: 'Danh tính đối tác tách khỏi đơn hàng' },
    kpis: [
      { label: { en: 'Suppliers', vi: 'Nhà cung cấp' }, value: '48' },
      { label: { en: 'Customers', vi: 'Khách hàng' }, value: '132' },
      { label: { en: 'Blocked', vi: 'Bị khoá' }, value: '2' },
    ],
    tabs: [
      {
        id: 'main',
        label: { en: 'Suppliers and customers', vi: 'Nhà cung cấp và khách hàng' },
        columns: [
          { key: 'id', label: { en: 'Partner', vi: 'Đối tác' }, mono: true },
          { key: 'name', label: { en: 'Name', vi: 'Tên' } },
          { key: 'type', label: { en: 'Type', vi: 'Loại' }, localized: true },
          { key: 'city', label: { en: 'City', vi: 'Thành phố' } },
          { key: 'contact', label: { en: 'Contact', vi: 'Liên hệ' } },
          { key: 'terms', label: { en: 'Payment terms', vi: 'Điều kiện thanh toán' }, localized: true },
        ],
        rows: [
          { id: 'SUP-0142', name: 'Vanderberg Steel', type: { en: 'Supplier', vi: 'Nhà cung cấp' }, city: 'Eindhoven', contact: 'J. Vanderberg', terms: { en: '14 days', vi: '14 ngày' } },
          { id: 'SUP-0188', name: 'Nordic Labels A/S', type: { en: 'Supplier', vi: 'Nhà cung cấp' }, city: 'Aarhus', contact: 'L. Sørensen', terms: { en: '30 days', vi: '30 ngày' } },
          { id: 'CUS-2210', name: 'Meijer Retail Group', type: { en: 'Customer', vi: 'Khách hàng' }, city: 'Amsterdam', contact: 'S. Meijer', terms: { en: '30 days', vi: '30 ngày' } },
          { id: 'CUS-2274', name: 'Brico Bouwmarkt', type: { en: 'Customer', vi: 'Khách hàng' }, city: 'Ghent', contact: 'P. Claes', terms: { en: '45 days', vi: '45 ngày' } },
        ],
      },
      {
        id: 'contacts',
        label: { en: 'Contacts', vi: 'Người liên hệ' },
        subtitle: { en: 'Named contacts per supplier and customer', vi: 'Người liên hệ theo nhà cung cấp và khách hàng' },
        columns: [
          { key: 'name', label: { en: 'Name', vi: 'Họ tên' } },
          { key: 'partner', label: { en: 'Partner', vi: 'Đối tác' } },
          { key: 'role', label: { en: 'Role', vi: 'Vai trò' }, localized: true },
          { key: 'email', label: { en: 'Email', vi: 'Email' } },
          { key: 'phone', label: { en: 'Phone', vi: 'Điện thoại' }, mono: true },
        ],
        rows: [
          { name: 'J. Vanderberg', partner: 'Vanderberg Steel', role: { en: 'Account manager', vi: 'Quản lý khách hàng' }, email: 'j.vanderberg@vbsteel.nl', phone: '+31 40 224 8810' },
          { name: 'L. Sørensen', partner: 'Nordic Labels A/S', role: { en: 'Sales', vi: 'Kinh doanh' }, email: 'ls@nordiclabels.dk', phone: '+45 86 12 44 00' },
          { name: 'S. Meijer', partner: 'Meijer Retail Group', role: { en: 'Buyer', vi: 'Thu mua' }, email: 's.meijer@meijerretail.nl', phone: '+31 20 555 1201' },
        ],
      },
    ],
  },

  catalogue: {
    panelTitle: { en: 'Products', vi: 'Sản phẩm' },
    panelSubtitle: { en: 'Product master data · category, brand, barcode, tracking policy', vi: 'Dữ liệu sản phẩm · nhóm, thương hiệu, mã vạch, chính sách theo dõi' },
    detailedTabId: 'main',
    kpis: [
      { label: { en: 'Active SKUs', vi: 'SKU đang hoạt động' }, value: '1,842' },
      { label: { en: 'Categories', vi: 'Nhóm sản phẩm' }, value: '4' },
      { label: { en: 'Lot-controlled', vi: 'Theo lô' }, value: '640' },
      { label: { en: 'Below reorder point', vi: 'Dưới điểm đặt lại' }, value: '17', trendStatus: 'low-stock' },
    ],
    tabs: [
      {
        id: 'main',
        label: { en: 'Products', vi: 'Sản phẩm' },
        columns: [
          { key: 'sku', label: same('SKU'), mono: true },
          { key: 'name', label: { en: 'Name', vi: 'Tên' }, localized: true },
          { key: 'category', label: { en: 'Category', vi: 'Nhóm' }, localized: true },
          { key: 'brand', label: { en: 'Brand', vi: 'Thương hiệu' } },
          { key: 'uom', label: { en: 'UoM', vi: 'ĐVT' }, mono: true },
          { key: 'reorder', label: { en: 'Reorder point', vi: 'Điểm đặt lại' }, align: 'right', mono: true },
          { key: 'qty', label: { en: 'On hand', vi: 'Tồn' }, align: 'right', mono: true },
          { key: 'status', label: { en: 'Status', vi: 'Trạng thái' }, status: true },
        ],
        rows: PRODUCTS,
      },
      {
        id: 'secondary',
        label: { en: 'Categories', vi: 'Nhóm sản phẩm' },
        subtitle: { en: 'SKU count and stock position per category', vi: 'Số SKU và vị thế tồn theo nhóm' },
        columns: [
          { key: 'name', label: { en: 'Category', vi: 'Nhóm' }, localized: true },
          { key: 'skus', label: { en: 'SKUs', vi: 'Số SKU' }, align: 'right', mono: true },
          { key: 'onHand', label: { en: 'Units on hand', vi: 'Đơn vị tồn' }, align: 'right', mono: true },
          { key: 'below', label: { en: 'Below reorder', vi: 'Dưới điểm đặt lại' }, align: 'right', mono: true },
        ],
        rows: CATEGORIES,
      },
      {
        id: 'brands',
        label: { en: 'Brands', vi: 'Thương hiệu' },
        subtitle: { en: 'Brand references and their primary supplier', vi: 'Thương hiệu và nhà cung cấp chính' },
        columns: [
          { key: 'brand', label: { en: 'Brand', vi: 'Thương hiệu' } },
          { key: 'skus', label: { en: 'SKUs', vi: 'Số SKU' }, align: 'right', mono: true },
          { key: 'supplier', label: { en: 'Primary supplier', vi: 'Nhà cung cấp chính' } },
          { key: 'lead', label: { en: 'Lead time', vi: 'Thời gian giao' }, localized: true },
        ],
        rows: [
          { brand: 'Vanderberg', skus: '402', supplier: 'Vanderberg Steel', lead: { en: '14 days', vi: '14 ngày' } },
          { brand: 'Kartonex', skus: '318', supplier: 'Kartonex Verpakking', lead: { en: '7 days', vi: '7 ngày' } },
          { brand: 'Nordic Labels', skus: '244', supplier: 'Nordic Labels A/S', lead: { en: '21 days', vi: '21 ngày' } },
          { brand: 'ScanTech', skus: '96', supplier: 'ScanTech Benelux', lead: { en: '30 days', vi: '30 ngày' } },
        ],
      },
      {
        id: 'uom',
        label: { en: 'Units of measure', vi: 'Đơn vị tính' },
        subtitle: { en: 'Base units and pack conversions', vi: 'Đơn vị cơ bản và quy đổi đóng gói' },
        columns: [
          { key: 'code', label: { en: 'Code', vi: 'Mã' }, mono: true },
          { key: 'name', label: { en: 'Name', vi: 'Tên' }, localized: true },
          { key: 'type', label: { en: 'Type', vi: 'Loại' }, localized: true },
          { key: 'factor', label: { en: 'Base factor', vi: 'Hệ số quy đổi' }, align: 'right', mono: true },
        ],
        rows: [
          { code: 'EA', name: { en: 'Each', vi: 'Cái' }, type: { en: 'Base', vi: 'Cơ bản' }, factor: '1' },
          { code: 'ROL', name: { en: 'Roll', vi: 'Cuộn' }, type: { en: 'Base', vi: 'Cơ bản' }, factor: '1' },
          { code: 'BOX', name: { en: 'Box of 12', vi: 'Hộp 12' }, type: { en: 'Pack', vi: 'Đóng gói' }, factor: '12' },
          { code: 'PAL', name: { en: 'Pallet of 480', vi: 'Pallet 480' }, type: { en: 'Pack', vi: 'Đóng gói' }, factor: '480' },
        ],
      },
    ],
  },

  inventory: {
    panelTitle: { en: 'Stock balances', vi: 'Số dư tồn kho' },
    panelSubtitle: { en: 'On hand, reserved and available per bin · WH-1 Rotterdam', vi: 'Tồn thực, đã giữ và khả dụng theo ô kệ · WH-1 Rotterdam' },
    detailedTabId: 'main',
    kpis: [
      { label: { en: 'Units in stock', vi: 'Đơn vị tồn kho' }, value: '184,220' },
      { label: { en: 'Reserved', vi: 'Đã giữ' }, value: '12,480' },
      { label: { en: 'Damaged', vi: 'Hư hỏng' }, value: '320', trendStatus: 'out-of-stock' },
      { label: { en: 'Quarantine', vi: 'Cách ly' }, value: '96', trendStatus: 'low-stock' },
    ],
    tabs: [
      {
        id: 'main',
        label: { en: 'Stock balances', vi: 'Số dư tồn kho' },
        columns: [
          { key: 'sku', label: same('SKU'), mono: true },
          { key: 'bin', label: { en: 'Bin', vi: 'Ô kệ' }, mono: true },
          { key: 'lot', label: { en: 'Lot', vi: 'Lô' }, mono: true },
          { key: 'onHand', label: { en: 'On hand', vi: 'Tồn' }, align: 'right', mono: true },
          { key: 'reserved', label: { en: 'Reserved', vi: 'Đã giữ' }, align: 'right', mono: true },
          { key: 'available', label: { en: 'Available', vi: 'Khả dụng' }, align: 'right', mono: true },
          { key: 'damaged', label: { en: 'Damaged', vi: 'Hư hỏng' }, align: 'right', mono: true },
          { key: 'quarantine', label: { en: 'Quarantine', vi: 'Cách ly' }, align: 'right', mono: true },
          { key: 'status', label: { en: 'Status', vi: 'Trạng thái' }, status: true },
        ],
        rows: [
          { sku: 'IKH-482910', bin: 'A-12-04', lot: 'LOT-2026-0417', onHand: '240', reserved: '40', available: '200', damaged: '0', quarantine: '0', status: 'in-stock' },
          { sku: 'IKH-330298', bin: 'A-04-09', lot: 'LOT-2026-0392', onHand: '60', reserved: '12', available: '48', damaged: '2', quarantine: '0', status: 'low-stock' },
          { sku: 'IKH-770145', bin: 'D-01-01', lot: '—', onHand: '0', reserved: '0', available: '0', damaged: '0', quarantine: '0', status: 'out-of-stock' },
          { sku: 'IKH-105522', bin: 'B-02-11', lot: 'LOT-2026-0388', onHand: '1,840', reserved: '260', available: '1,580', damaged: '12', quarantine: '0', status: 'in-stock' },
          { sku: 'IKH-664120', bin: 'A-04-02', lot: 'LOT-2026-0401', onHand: '18', reserved: '0', available: '18', damaged: '0', quarantine: '6', status: 'low-stock' },
          { sku: 'IKH-201884', bin: 'C-07-03', lot: '—', onHand: '96', reserved: '8', available: '88', damaged: '1', quarantine: '0', status: 'in-stock' },
          { sku: 'IKH-559071', bin: 'B-05-08', lot: 'LOT-2026-0377', onHand: '620', reserved: '140', available: '480', damaged: '0', quarantine: '0', status: 'in-stock' },
          { sku: 'IKH-318440', bin: 'A-11-06', lot: 'LOT-2026-0410', onHand: '34', reserved: '4', available: '30', damaged: '0', quarantine: '12', status: 'low-stock' },
          { sku: 'IKH-447203', bin: 'A-04-11', lot: '—', onHand: '0', reserved: '0', available: '0', damaged: '0', quarantine: '0', status: 'out-of-stock' },
        ],
      },
      {
        id: 'secondary',
        label: { en: 'Stock ledger', vi: 'Sổ cái tồn kho' },
        subtitle: { en: 'Every quantity change with its source document · today', vi: 'Mọi thay đổi số lượng kèm chứng từ nguồn · hôm nay' },
        columns: [
          { key: 'doc', label: { en: 'Document', vi: 'Chứng từ' }, mono: true },
          { key: 'type', label: { en: 'Movement', vi: 'Nghiệp vụ' }, localized: true },
          { key: 'sku', label: same('SKU'), mono: true },
          { key: 'bin', label: { en: 'Bin', vi: 'Ô kệ' }, mono: true },
          { key: 'delta', label: { en: 'Change', vi: 'Thay đổi' }, align: 'right', mono: true },
          { key: 'time', label: { en: 'Time', vi: 'Giờ' }, mono: true },
          { key: 'user', label: { en: 'By', vi: 'Người thực hiện' } },
        ],
        rows: LEDGER,
      },
      {
        id: 'lots',
        label: { en: 'Lots', vi: 'Lô hàng' },
        subtitle: { en: 'Lot-controlled stock with expiry tracking', vi: 'Tồn kho theo lô kèm hạn sử dụng' },
        columns: [
          { key: 'lot', label: { en: 'Lot', vi: 'Lô' }, mono: true },
          { key: 'sku', label: same('SKU'), mono: true },
          { key: 'produced', label: { en: 'Produced', vi: 'Ngày sản xuất' }, mono: true },
          { key: 'expiry', label: { en: 'Expiry', vi: 'Hạn dùng' }, mono: true },
          { key: 'qty', label: { en: 'Quantity', vi: 'Số lượng' }, align: 'right', mono: true },
          { key: 'status', label: { en: 'Status', vi: 'Trạng thái' }, status: true },
        ],
        rows: [
          { lot: 'LOT-2026-0417', sku: 'IKH-482910', produced: '12/04', expiry: '12/04/28', qty: '240', status: 'in-stock', label: { en: 'Released', vi: 'Đã xuất lô' } },
          { lot: 'LOT-2026-0392', sku: 'IKH-330298', produced: '02/03', expiry: '02/03/27', qty: '60', status: 'low-stock', label: { en: 'Low', vi: 'Sắp hết' } },
          { lot: 'LOT-2026-0410', sku: 'IKH-318440', produced: '28/03', expiry: '28/03/28', qty: '34', status: 'returns', label: { en: 'Quarantine', vi: 'Cách ly' } },
        ],
      },
      {
        id: 'adjustments',
        label: { en: 'Adjustments', vi: 'Điều chỉnh' },
        subtitle: { en: 'Manual corrections with reason codes', vi: 'Điều chỉnh thủ công kèm lý do' },
        columns: [
          { key: 'doc', label: { en: 'Document', vi: 'Chứng từ' }, mono: true },
          { key: 'sku', label: same('SKU'), mono: true },
          { key: 'bin', label: { en: 'Bin', vi: 'Ô kệ' }, mono: true },
          { key: 'delta', label: { en: 'Change', vi: 'Thay đổi' }, align: 'right', mono: true },
          { key: 'reason', label: { en: 'Reason', vi: 'Lý do' }, localized: true },
          { key: 'by', label: { en: 'By', vi: 'Người thực hiện' } },
        ],
        rows: [
          { doc: 'ADJ-0442', sku: 'IKH-664120', bin: 'A-04-02', delta: '−6', reason: { en: 'Damaged on handling', vi: 'Hư hỏng khi bốc dỡ' }, by: 'M. de Vries' },
          { doc: 'ADJ-0441', sku: 'IKH-105522', bin: 'B-02-11', delta: '+18', reason: { en: 'Cycle count surplus', vi: 'Kiểm kê thừa' }, by: 'S. Peeters' },
          { doc: 'ADJ-0439', sku: 'IKH-201884', bin: 'C-07-03', delta: '−1', reason: { en: 'Write-off', vi: 'Xoá sổ' }, by: 'M. de Vries' },
        ],
      },
    ],
  },

  inbound: {
    panelTitle: { en: 'Purchase orders', vi: 'Đơn mua hàng' },
    panelSubtitle: { en: 'Expected and received lines · WH-1 Rotterdam', vi: 'Dòng dự kiến và đã nhận · WH-1 Rotterdam' },
    detailedTabId: 'main',
    kpis: [
      { label: { en: 'Open orders', vi: 'Đơn đang mở' }, value: '37' },
      { label: { en: 'Receiving now', vi: 'Đang nhận' }, value: '3' },
      { label: { en: 'Short receipts', vi: 'Phiếu thiếu' }, value: '4', trendStatus: 'low-stock' },
      { label: { en: 'Overdue', vi: 'Quá hạn' }, value: '6', trendStatus: 'out-of-stock' },
    ],
    tabs: [
      {
        id: 'main',
        label: { en: 'Purchase orders', vi: 'Đơn mua hàng' },
        columns: [
          { key: 'po', label: same('PO'), mono: true },
          { key: 'supplier', label: { en: 'Supplier', vi: 'Nhà cung cấp' } },
          { key: 'expected', label: { en: 'Expected', vi: 'Dự kiến' }, align: 'right', mono: true },
          { key: 'received', label: { en: 'Received', vi: 'Đã nhận' }, align: 'right', mono: true },
          { key: 'dock', label: { en: 'Dock', vi: 'Cửa' } },
          { key: 'eta', label: { en: 'ETA', vi: 'Giờ đến' }, mono: true },
          { key: 'status', label: { en: 'Status', vi: 'Trạng thái' }, status: true },
        ],
        rows: PURCHASE_ORDERS,
      },
      {
        id: 'receipts',
        label: { en: 'Receipts', vi: 'Phiếu nhập' },
        subtitle: { en: 'Posted and in-progress receipts · today', vi: 'Phiếu đã ghi nhận và đang xử lý · hôm nay' },
        columns: [
          { key: 'id', label: { en: 'Receipt', vi: 'Phiếu nhập' }, mono: true },
          { key: 'po', label: same('PO'), mono: true },
          { key: 'supplier', label: { en: 'Supplier', vi: 'Nhà cung cấp' } },
          { key: 'lines', label: { en: 'Lines', vi: 'Dòng' }, mono: true },
          { key: 'dock', label: { en: 'Dock', vi: 'Cửa' } },
          { key: 'time', label: { en: 'Time', vi: 'Giờ' }, mono: true },
          { key: 'status', label: { en: 'Status', vi: 'Trạng thái' }, status: true },
        ],
        rows: RECEIPTS,
      },
      {
        id: 'putaway',
        label: { en: 'Putaway tasks', vi: 'Nhiệm vụ cất kho' },
        subtitle: { en: 'Generated from received lines, assigned to operators', vi: 'Sinh từ dòng đã nhận, giao cho nhân viên vận hành' },
        columns: [
          { key: 'id', label: { en: 'Task', vi: 'Nhiệm vụ' }, mono: true },
          { key: 'sku', label: same('SKU'), mono: true },
          { key: 'fromDock', label: { en: 'From', vi: 'Từ' }, mono: true },
          { key: 'toBin', label: { en: 'To', vi: 'Đến' }, mono: true },
          { key: 'qty', label: { en: 'Quantity', vi: 'Số lượng' }, align: 'right', mono: true },
          { key: 'operator', label: { en: 'Operator', vi: 'Nhân viên' } },
          { key: 'status', label: { en: 'Status', vi: 'Trạng thái' }, status: true },
        ],
        rows: PUTAWAY_TASKS,
      },
    ],
  },

  outbound: {
    panelTitle: { en: 'Sales orders', vi: 'Đơn bán hàng' },
    panelSubtitle: { en: 'Allocation and dispatch · cut-off 17:00', vi: 'Phân bổ và xuất hàng · chốt 17:00' },
    detailedTabId: 'main',
    kpis: [
      { label: { en: 'Open orders', vi: 'Đơn đang mở' }, value: '52' },
      { label: { en: 'Allocated', vi: 'Đã phân bổ' }, value: '41' },
      { label: { en: 'Dispatched today', vi: 'Đã xuất hôm nay' }, value: '28' },
      { label: { en: 'Late', vi: 'Trễ' }, value: '3', trendStatus: 'out-of-stock' },
    ],
    tabs: [
      {
        id: 'main',
        label: { en: 'Sales orders', vi: 'Đơn bán hàng' },
        columns: [
          { key: 'so', label: same('SO'), mono: true },
          { key: 'customer', label: { en: 'Customer', vi: 'Khách hàng' } },
          { key: 'ordered', label: { en: 'Ordered', vi: 'Đã đặt' }, align: 'right', mono: true },
          { key: 'allocated', label: { en: 'Allocated', vi: 'Đã phân bổ' }, align: 'right', mono: true },
          { key: 'dock', label: { en: 'Dock', vi: 'Cửa' } },
          { key: 'cutoff', label: { en: 'Cut-off', vi: 'Giờ chốt' }, mono: true },
          { key: 'status', label: { en: 'Status', vi: 'Trạng thái' }, status: true },
        ],
        rows: SALES_ORDERS,
      },
      {
        id: 'allocations',
        label: { en: 'Allocations', vi: 'Phân bổ' },
        subtitle: { en: 'Claims on available stock per order line', vi: 'Giữ tồn khả dụng theo dòng đơn hàng' },
        columns: [
          { key: 'so', label: same('SO'), mono: true },
          { key: 'sku', label: same('SKU'), mono: true },
          { key: 'bin', label: { en: 'Bin', vi: 'Ô kệ' }, mono: true },
          { key: 'qty', label: { en: 'Quantity', vi: 'Số lượng' }, align: 'right', mono: true },
          { key: 'status', label: { en: 'Status', vi: 'Trạng thái' }, status: true },
        ],
        rows: ALLOCATIONS,
      },
      {
        id: 'shipments',
        label: { en: 'Shipments', vi: 'Lô xuất' },
        subtitle: { en: 'Dispatched directly from confirmed allocations', vi: 'Xuất trực tiếp từ phân bổ đã xác nhận' },
        columns: [
          { key: 'shipment', label: { en: 'Shipment', vi: 'Lô xuất' }, mono: true },
          { key: 'so', label: same('SO'), mono: true },
          { key: 'carrier', label: { en: 'Carrier', vi: 'Đơn vị vận chuyển' } },
          { key: 'dock', label: { en: 'Dock', vi: 'Cửa' } },
          { key: 'departure', label: { en: 'Departure', vi: 'Giờ khởi hành' }, mono: true },
          { key: 'status', label: { en: 'Status', vi: 'Trạng thái' }, status: true },
        ],
        rows: SHIPMENTS,
      },
    ],
  },

  returns: {
    panelTitle: { en: 'Return orders', vi: 'Đơn trả hàng' },
    panelSubtitle: { en: 'Inspection and disposition · WH-3 Utrecht', vi: 'Kiểm tra và xử lý · WH-3 Utrecht' },
    detailedTabId: 'main',
    kpis: [
      { label: { en: 'Open returns', vi: 'Đơn trả đang mở' }, value: '8' },
      { label: { en: 'Awaiting inspection', vi: 'Chờ kiểm tra' }, value: '3', trendStatus: 'low-stock' },
      { label: { en: 'Restocked', vi: 'Đã nhập lại' }, value: '14' },
      { label: { en: 'Scrapped', vi: 'Đã huỷ' }, value: '2', trendStatus: 'out-of-stock' },
    ],
    tabs: [
      {
        id: 'main',
        label: { en: 'Return orders', vi: 'Đơn trả hàng' },
        columns: [
          { key: 'rma', label: same('RMA'), mono: true },
          { key: 'partner', label: { en: 'Partner', vi: 'Đối tác' } },
          { key: 'sourceRef', label: { en: 'Source', vi: 'Nguồn gốc' }, mono: true },
          { key: 'qty', label: { en: 'Quantity', vi: 'Số lượng' }, align: 'right', mono: true },
          { key: 'status', label: { en: 'Status', vi: 'Trạng thái' }, status: true },
        ],
        rows: RETURN_ORDERS,
      },
      {
        id: 'inspections',
        label: { en: 'Inspections', vi: 'Kiểm tra' },
        subtitle: { en: 'Condition assessment before disposition', vi: 'Đánh giá tình trạng trước khi xử lý' },
        columns: [
          { key: 'id', label: { en: 'Inspection', vi: 'Phiếu kiểm tra' }, mono: true },
          { key: 'rma', label: same('RMA'), mono: true },
          { key: 'sku', label: same('SKU'), mono: true },
          { key: 'outcome', label: { en: 'Outcome', vi: 'Kết quả' }, localized: true },
          { key: 'inspector', label: { en: 'Inspector', vi: 'Người kiểm tra' } },
        ],
        rows: INSPECTIONS,
      },
      {
        id: 'dispositions',
        label: { en: 'Dispositions', vi: 'Xử lý' },
        subtitle: { en: 'Restock, quarantine, scrap or vendor return', vi: 'Nhập lại, cách ly, huỷ hoặc trả nhà cung cấp' },
        columns: [
          { key: 'id', label: { en: 'Disposition', vi: 'Quyết định' }, mono: true },
          { key: 'rma', label: same('RMA'), mono: true },
          { key: 'sku', label: same('SKU'), mono: true },
          { key: 'action', label: { en: 'Action', vi: 'Hành động' }, localized: true },
          { key: 'qty', label: { en: 'Quantity', vi: 'Số lượng' }, align: 'right', mono: true },
        ],
        rows: DISPOSITIONS,
      },
    ],
  },

  billing: {
    panelTitle: { en: 'Invoices and credit notes', vi: 'Hoá đơn và giấy báo có' },
    panelSubtitle: { en: 'Issued from operational snapshots', vi: 'Phát hành từ ảnh chụp nghiệp vụ' },
    kpis: [
      { label: { en: 'Invoiced this month', vi: 'Đã xuất hoá đơn tháng này' }, value: '€ 182,400' },
      { label: { en: 'Outstanding', vi: 'Chưa thu' }, value: '€ 63,110' },
      { label: { en: 'Overdue', vi: 'Quá hạn' }, value: '€ 7,320', trendStatus: 'out-of-stock' },
      { label: { en: 'Credit notes', vi: 'Giấy báo có' }, value: '3' },
    ],
    tabs: [
      {
        id: 'main',
        label: { en: 'Invoices and credit notes', vi: 'Hoá đơn và giấy báo có' },
        columns: [
          { key: 'inv', label: { en: 'Document', vi: 'Chứng từ' }, mono: true },
          { key: 'customer', label: { en: 'Customer', vi: 'Khách hàng' } },
          { key: 'issued', label: { en: 'Issued', vi: 'Ngày phát hành' }, mono: true },
          { key: 'due', label: { en: 'Due', vi: 'Hạn thanh toán' }, mono: true },
          { key: 'amount', label: { en: 'Amount', vi: 'Số tiền' }, align: 'right', mono: true },
          { key: 'state', label: { en: 'State', vi: 'Tình trạng' }, localized: true },
        ],
        rows: [
          { inv: 'INV-4471', customer: 'Meijer Retail Group', issued: '01/08', due: '31/08', amount: '€ 42,180', state: { en: 'Issued', vi: 'Đã phát hành' } },
          { inv: 'INV-4472', customer: 'Brico Bouwmarkt', issued: '02/08', due: '16/09', amount: '€ 18,940', state: { en: 'Issued', vi: 'Đã phát hành' } },
          { inv: 'INV-4455', customer: 'Hafen Bremen GmbH', issued: '12/07', due: '11/08', amount: '€ 7,320', state: { en: 'Overdue', vi: 'Quá hạn' } },
          { inv: 'CRN-0118', customer: 'Meijer Retail Group', issued: '04/08', due: '—', amount: '− € 1,260', state: { en: 'Credit note', vi: 'Giấy báo có' } },
        ],
      },
      {
        id: 'payments',
        label: { en: 'Payments', vi: 'Thanh toán' },
        subtitle: { en: 'Received against issued invoices', vi: 'Đã nhận theo hoá đơn phát hành' },
        columns: [
          { key: 'id', label: { en: 'Payment', vi: 'Phiếu thu' }, mono: true },
          { key: 'customer', label: { en: 'Customer', vi: 'Khách hàng' } },
          { key: 'invoice', label: { en: 'Invoice', vi: 'Hoá đơn' }, mono: true },
          { key: 'amount', label: { en: 'Amount', vi: 'Số tiền' }, align: 'right', mono: true },
          { key: 'method', label: { en: 'Method', vi: 'Hình thức' }, localized: true },
          { key: 'date', label: { en: 'Date', vi: 'Ngày' }, mono: true },
        ],
        rows: [
          { id: 'PAY-2214', customer: 'Meijer Retail Group', invoice: 'INV-4468', amount: '€ 38,400', method: { en: 'Bank transfer', vi: 'Chuyển khoản' }, date: '05/08' },
          { id: 'PAY-2215', customer: 'Brico Bouwmarkt', invoice: 'INV-4470', amount: '€ 12,880', method: { en: 'Bank transfer', vi: 'Chuyển khoản' }, date: '06/08' },
          { id: 'PAY-2216', customer: 'Hafen Bremen GmbH', invoice: 'INV-4455', amount: '€ 3,000', method: { en: 'Partial payment', vi: 'Thanh toán một phần' }, date: '07/08' },
        ],
      },
    ],
  },

  reporting: {
    panelTitle: { en: 'Read models', vi: 'Mô hình đọc' },
    panelSubtitle: { en: 'Rebuildable from source events · Office Console only', vi: 'Dựng lại được từ sự kiện gốc · Chỉ trên Office Console' },
    kpis: [
      { label: { en: 'Fulfillment rate', vi: 'Tỷ lệ hoàn thành' }, value: '98.2%', trend: { en: '+0.4%', vi: '+0.4%' }, trendStatus: 'in-stock', caption: { en: 'vs. last week', vi: 'so với tuần trước' } },
      { label: { en: 'On-time dispatch', vi: 'Xuất đúng hạn' }, value: '96.4%', trend: { en: '-1.1%', vi: '-1.1%' }, trendStatus: 'low-stock', caption: { en: 'vs. last week', vi: 'so với tuần trước' } },
      { label: { en: 'Inventory accuracy', vi: 'Độ chính xác tồn kho' }, value: '99.1%' },
      { label: { en: 'Stock turns', vi: 'Vòng quay tồn kho' }, value: '6.4' },
    ],
    tabs: [
      {
        id: 'main',
        label: { en: 'Read models', vi: 'Mô hình đọc' },
        columns: [
          { key: 'report', label: { en: 'Report', vi: 'Báo cáo' }, localized: true },
          { key: 'model', label: { en: 'Read model', vi: 'Mô hình đọc' }, mono: true },
          { key: 'refreshed', label: { en: 'Refreshed', vi: 'Cập nhật' }, mono: true },
          { key: 'schedule', label: { en: 'Schedule', vi: 'Lịch chạy' }, localized: true },
          { key: 'owner', label: { en: 'Owner', vi: 'Phụ trách' } },
        ],
        rows: [
          { report: { en: 'Inventory position', vi: 'Vị thế tồn kho' }, model: 'InventoryPositionReadModel', refreshed: '09:40', schedule: { en: 'Every 15 min', vi: 'Mỗi 15 phút' }, owner: 'M. de Vries' },
          { report: { en: 'Inbound status', vi: 'Trạng thái nhập kho' }, model: 'InboundStatusReadModel', refreshed: '09:35', schedule: { en: 'Hourly', vi: 'Mỗi giờ' }, owner: 'M. de Vries' },
          { report: { en: 'Outbound status', vi: 'Trạng thái xuất kho' }, model: 'OutboundStatusReadModel', refreshed: '09:35', schedule: { en: 'Hourly', vi: 'Mỗi giờ' }, owner: 'K. Bakker' },
          { report: { en: 'Fulfillment KPIs', vi: 'KPI giao hàng' }, model: 'FulfillmentKpiReadModel', refreshed: '06:00', schedule: { en: 'Daily', vi: 'Hàng ngày' }, owner: 'K. Bakker' },
        ],
      },
      {
        id: 'exports',
        label: { en: 'Scheduled exports', vi: 'Xuất theo lịch' },
        subtitle: { en: 'Recurring deliveries · Office Console only', vi: 'Gửi định kỳ · Chỉ trên Office Console' },
        columns: [
          { key: 'id', label: { en: 'Export', vi: 'Bản xuất' }, mono: true },
          { key: 'report', label: { en: 'Report', vi: 'Báo cáo' }, localized: true },
          { key: 'format', label: { en: 'Format', vi: 'Định dạng' }, mono: true },
          { key: 'schedule', label: { en: 'Schedule', vi: 'Lịch chạy' }, localized: true },
          { key: 'recipient', label: { en: 'Recipient', vi: 'Người nhận' } },
        ],
        rows: [
          { id: 'EXP-114', report: { en: 'Inventory position', vi: 'Vị thế tồn kho' }, format: 'CSV', schedule: { en: 'Daily 06:00', vi: 'Hàng ngày 06:00' }, recipient: 'planning@ikho.nl' },
          { id: 'EXP-118', report: { en: 'Fulfillment KPIs', vi: 'KPI giao hàng' }, format: 'XLSX', schedule: { en: 'Weekly, Monday', vi: 'Hàng tuần, thứ Hai' }, recipient: 'board@ikho.nl' },
          { id: 'EXP-121', report: { en: 'Outbound status', vi: 'Trạng thái xuất kho' }, format: 'CSV', schedule: { en: 'Hourly', vi: 'Mỗi giờ' }, recipient: 'ops@ikho.nl' },
        ],
      },
    ],
  },
};
