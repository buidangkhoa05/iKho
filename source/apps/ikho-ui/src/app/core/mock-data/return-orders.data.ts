import { StockStatus } from '@ikho/shared-ui';
import { Localized } from '../i18n/localized.type';

export type ReturnStage = 'created' | 'received' | 'inspected' | 'dispositioned';
export type ReturnReasonCode = 'Damaged' | 'WrongItem' | 'Defective' | 'CustomerCancelled' | 'NoLongerNeeded';
export type InspectionResult = 'Good' | 'Damaged' | 'Defective';
export type DispositionOutcome = 'Restock' | 'Quarantine' | 'Scrap' | 'VendorReturn';

export const REASON_LABELS: Record<ReturnReasonCode, Localized<string>> = {
  Damaged: { en: 'Damaged', vi: 'Hư hỏng' },
  WrongItem: { en: 'Wrong item shipped', vi: 'Giao sai hàng' },
  Defective: { en: 'Defective', vi: 'Lỗi' },
  CustomerCancelled: { en: 'Customer cancelled', vi: 'Khách huỷ đơn' },
  NoLongerNeeded: { en: 'No longer needed', vi: 'Không còn cần' },
};

export const INSPECTION_RESULT_LABELS: Record<InspectionResult, Localized<string>> = {
  Good: { en: 'Good', vi: 'Tốt' },
  Damaged: { en: 'Damaged', vi: 'Hư hỏng' },
  Defective: { en: 'Defective', vi: 'Lỗi' },
};

export const DISPOSITION_OUTCOME_LABELS: Record<DispositionOutcome, Localized<string>> = {
  Restock: { en: 'Restock', vi: 'Nhập lại' },
  Quarantine: { en: 'Quarantine', vi: 'Cách ly' },
  Scrap: { en: 'Scrap', vi: 'Huỷ' },
  VendorReturn: { en: 'Vendor return', vi: 'Trả nhà cung cấp' },
};

export interface ReturnOrderLine {
  sku: string;
  productName: Localized<string>;
  qty: number;
  reasonCode: ReturnReasonCode;
}

export interface ReturnOrder {
  [key: string]: unknown;
  rma: string;
  type: 'customer' | 'supplier';
  partner: string;
  sourceRef: string;
  qty: number;
  stage: ReturnStage;
  status: StockStatus;
  label: Localized<string>;
  inspectionResult?: InspectionResult;
  dispositionOutcome?: DispositionOutcome;
  dispositionBin?: string;
  lines: ReturnOrderLine[];
}

export const RETURN_ORDERS: ReturnOrder[] = [
  {
    rma: 'RMA-0331', type: 'customer', partner: 'Meijer Retail Group', sourceRef: 'SO-88112', qty: 4,
    stage: 'dispositioned', status: 'out-of-stock', label: { en: 'Scrapped', vi: 'Đã huỷ' },
    inspectionResult: 'Damaged', dispositionOutcome: 'Scrap',
    lines: [
      { sku: 'IKH-105522', productName: { en: 'Corrugated box, 305×229×229mm', vi: 'Thùng carton, 305×229×229mm' }, qty: 4, reasonCode: 'Damaged' },
    ],
  },
  {
    rma: 'RMA-0334', type: 'customer', partner: 'Brico Bouwmarkt', sourceRef: 'SO-88140', qty: 12,
    stage: 'dispositioned', status: 'in-stock', label: { en: 'Restocked', vi: 'Đã nhập lại' },
    inspectionResult: 'Good', dispositionOutcome: 'Restock', dispositionBin: 'A-11-06',
    lines: [
      { sku: 'IKH-318440', productName: { en: 'Shelf divider, 600mm', vi: 'Vách ngăn kệ, 600mm' }, qty: 12, reasonCode: 'WrongItem' },
    ],
  },
  {
    rma: 'RMA-0337', type: 'customer', partner: 'Hafen Bremen GmbH', sourceRef: 'SO-88155', qty: 6,
    stage: 'received', status: 'low-stock', label: { en: 'Awaiting inspection', vi: 'Chờ kiểm tra' },
    lines: [
      { sku: 'IKH-482910', productName: { en: 'Steel shelving bracket, 400mm', vi: 'Giá đỡ kệ thép, 400mm' }, qty: 6, reasonCode: 'CustomerCancelled' },
    ],
  },
  {
    rma: 'RMA-0340', type: 'customer', partner: 'Meijer Retail Group', sourceRef: 'SO-88214', qty: 20,
    stage: 'inspected', status: 'outbound', label: { en: 'Inspected', vi: 'Đã kiểm tra' },
    inspectionResult: 'Damaged',
    lines: [
      { sku: 'IKH-559071', productName: { en: 'Void fill paper, 380mm', vi: 'Giấy chèn lót, 380mm' }, qty: 20, reasonCode: 'Defective' },
    ],
  },
  {
    rma: 'RMA-0343', type: 'supplier', partner: 'Wrapline BV', sourceRef: 'PO-10477', qty: 6,
    stage: 'created', status: 'returns', label: { en: 'Open', vi: 'Đang mở' },
    lines: [
      { sku: 'IKH-664120', productName: { en: 'Pallet wrap film, 500mm', vi: 'Màng quấn pallet, 500mm' }, qty: 6, reasonCode: 'Defective' },
    ],
  },
];
