import { Localized } from '../i18n/localized.type';

export interface Category {
  [key: string]: unknown;
  name: Localized<string>;
  skus: string;
  onHand: string;
  below: string;
}

export const CATEGORIES: Category[] = [
  { name: { en: 'Packaging', vi: 'Bao bì' }, skus: '612', onHand: '84,320', below: '4' },
  { name: { en: 'Consumables', vi: 'Vật tư tiêu hao' }, skus: '488', onHand: '31,940', below: '9' },
  { name: { en: 'Racking', vi: 'Kệ hàng' }, skus: '402', onHand: '52,180', below: '3' },
  { name: { en: 'Equipment', vi: 'Thiết bị' }, skus: '340', onHand: '15,780', below: '1' },
];
