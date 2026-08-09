import { Localized } from './localized.type';

export const UI_STRINGS = {
  roleHint: { en: 'One web app · features shown by role', vi: 'Một ứng dụng web · chức năng hiển thị theo vai trò' },
  roleAdmin: { en: 'Admin', vi: 'Quản trị' },
  roleOperator: { en: 'Operator', vi: 'Vận hành' },
  company: { en: 'Rotterdam Logistics BV', vi: 'Rotterdam Logistics BV' },
  adminUser: { en: 'M. de Vries', vi: 'M. de Vries' },
  searchOffice: { en: 'Search SKUs, orders, partners', vi: 'Tìm SKU, đơn hàng, đối tác' },
  searchOperator: { en: 'Scan or search SKU, name, bin', vi: 'Quét hoặc tìm SKU, tên, vị trí' },
  signOut: { en: 'Sign out', vi: 'Đăng xuất' },
  taskQueue: { en: 'Task queue', vi: 'Hàng đợi nhiệm vụ' },
  onHand: { en: 'on hand', vi: 'tồn kho' },
  noResults: { en: 'No SKUs match', vi: 'Không có SKU phù hợp' },
  results: { en: 'results', vi: 'kết quả' },
  all: { en: 'All', vi: 'Tất cả' },
  inStock: { en: 'In Stock', vi: 'Còn hàng' },
  lowStock: { en: 'Low Stock', vi: 'Sắp hết' },
  outOfStock: { en: 'Out of Stock', vi: 'Hết hàng' },
  close: { en: 'Close', vi: 'Đóng' },
} satisfies Record<string, Localized<string>>;
