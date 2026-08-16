export interface Lot {
  lotNumber: string;
  expirationDateUtc?: string;
}

export interface SerialNumber {
  serialValue: string;
  status: 'in-stock' | 'reserved' | 'shipped' | 'damaged';
}

export type MovementType = 'receipt' | 'adjustment' | 'reservation' | 'release' | 'shipment' | 'quarantine-receipt';

export interface StockLedgerEntry {
  id: string;
  stockItemId: string;
  movementType: MovementType;
  quantityDelta: number;
  reasonCode?: string;
  referenceType?: string;
  referenceId?: string;
  occurredOnUtc: string;
}

export interface StockItem {
  id: string;
  sku: string;
  warehouseCode: string;
  bin: string;
  lot?: Lot;
  serial?: SerialNumber;
  onHand: number;
  reserved: number;
  damaged: number;
  quarantine: number;
  status: 'in-stock' | 'low-stock' | 'out-of-stock';
  createdOnUtc: string;
  updatedOnUtc: string;
}

export type ReservationStatus = 'active' | 'released' | 'fulfilled';

export interface StockReservation {
  id: string;
  stockItemId: string;
  sku: string;
  warehouseCode: string;
  quantity: number;
  status: ReservationStatus;
  referenceType?: string;
  referenceId?: string;
  createdOnUtc: string;
  releasedOnUtc?: string;
}

// Reshaped from INVENTORY_POSITIONS (left untouched — still used by reporting-store.ts) for
// continuity, remapped to real OrganizationStore warehouse codes and bins carried over from
// PUTAWAY_TASKS where the sku matches. Two extra rows (IKH-201884, serial-controlled) are added
// to exercise per-unit serial tracking, matching Catalogue's seeded isSerialControlled products.
export const STOCK_ITEMS: StockItem[] = [
  {
    id: 'SI-1', sku: 'IKH-482910', warehouseCode: 'WH-1', bin: 'A-12-04',
    onHand: 240, reserved: 40, damaged: 0, quarantine: 0, status: 'in-stock',
    createdOnUtc: '2024-02-10T09:00:00Z', updatedOnUtc: '2024-02-10T09:00:00Z',
  },
  {
    id: 'SI-2', sku: 'IKH-330298', warehouseCode: 'WH-1', bin: 'A-04-09',
    lot: { lotNumber: 'LOT-2026-0392', expirationDateUtc: '2027-03-02T00:00:00Z' },
    onHand: 60, reserved: 12, damaged: 0, quarantine: 0, status: 'low-stock',
    createdOnUtc: '2024-02-15T09:00:00Z', updatedOnUtc: '2024-02-15T09:00:00Z',
  },
  {
    // Seeded out-of-stock — gives the status badge and adjustStock's would-go-negative guard
    // something real to exercise. Its ledger (below) records the receipt-then-shrinkage history
    // that explains why it's at zero.
    id: 'SI-3', sku: 'IKH-770145', warehouseCode: 'WH-1', bin: 'B-02-01',
    onHand: 0, reserved: 0, damaged: 0, quarantine: 0, status: 'out-of-stock',
    createdOnUtc: '2024-03-01T09:00:00Z', updatedOnUtc: '2024-07-10T09:00:00Z',
  },
  {
    id: 'SI-4', sku: 'IKH-105522', warehouseCode: 'WH-3', bin: 'C-01-02',
    onHand: 1840, reserved: 300, damaged: 4, quarantine: 20, status: 'in-stock',
    createdOnUtc: '2024-03-10T09:00:00Z', updatedOnUtc: '2024-03-10T09:00:00Z',
  },
  {
    id: 'SI-5', sku: 'IKH-664120', warehouseCode: 'WH-1', bin: 'A-04-02',
    lot: { lotNumber: 'LOT-2026-0401', expirationDateUtc: '2026-12-01T00:00:00Z' },
    onHand: 18, reserved: 6, damaged: 0, quarantine: 6, status: 'low-stock',
    createdOnUtc: '2024-03-20T09:00:00Z', updatedOnUtc: '2024-03-20T09:00:00Z',
  },
  {
    id: 'SI-6', sku: 'IKH-318440', warehouseCode: 'WH-3', bin: 'A-11-06',
    lot: { lotNumber: 'LOT-2026-0410', expirationDateUtc: '2027-01-15T00:00:00Z' },
    onHand: 34, reserved: 10, damaged: 0, quarantine: 0, status: 'low-stock',
    createdOnUtc: '2024-04-05T09:00:00Z', updatedOnUtc: '2024-04-05T09:00:00Z',
  },
  {
    // One stock item per serial unit, matching the backend's own modeling.
    id: 'SI-7', sku: 'IKH-201884', warehouseCode: 'WH-1', bin: 'D-01-01',
    serial: { serialValue: 'SN-VDB-0001', status: 'in-stock' },
    onHand: 1, reserved: 0, damaged: 0, quarantine: 0, status: 'in-stock',
    createdOnUtc: '2024-05-01T09:00:00Z', updatedOnUtc: '2024-05-01T09:00:00Z',
  },
  {
    // Backs the seeded active StockReservation (RES-1) below.
    id: 'SI-8', sku: 'IKH-201884', warehouseCode: 'WH-1', bin: 'D-01-01',
    serial: { serialValue: 'SN-VDB-0002', status: 'reserved' },
    onHand: 1, reserved: 1, damaged: 0, quarantine: 0, status: 'in-stock',
    createdOnUtc: '2024-05-01T09:00:00Z', updatedOnUtc: '2024-08-01T09:00:00Z',
  },
];

export const STOCK_LEDGER: StockLedgerEntry[] = [
  { id: 'LED-1', stockItemId: 'SI-1', movementType: 'receipt', quantityDelta: 240, occurredOnUtc: '2024-02-10T09:00:00Z' },
  { id: 'LED-2', stockItemId: 'SI-2', movementType: 'receipt', quantityDelta: 60, occurredOnUtc: '2024-02-15T09:00:00Z' },
  { id: 'LED-3', stockItemId: 'SI-3', movementType: 'receipt', quantityDelta: 50, occurredOnUtc: '2024-03-01T09:00:00Z' },
  { id: 'LED-4', stockItemId: 'SI-4', movementType: 'receipt', quantityDelta: 1840, occurredOnUtc: '2024-03-10T09:00:00Z' },
  { id: 'LED-5', stockItemId: 'SI-5', movementType: 'receipt', quantityDelta: 18, occurredOnUtc: '2024-03-20T09:00:00Z' },
  { id: 'LED-6', stockItemId: 'SI-6', movementType: 'receipt', quantityDelta: 34, occurredOnUtc: '2024-04-05T09:00:00Z' },
  { id: 'LED-7', stockItemId: 'SI-7', movementType: 'receipt', quantityDelta: 1, occurredOnUtc: '2024-05-01T09:00:00Z' },
  { id: 'LED-8', stockItemId: 'SI-8', movementType: 'receipt', quantityDelta: 1, occurredOnUtc: '2024-05-01T09:00:00Z' },
  { id: 'LED-9', stockItemId: 'SI-3', movementType: 'adjustment', quantityDelta: -50, reasonCode: 'SHRINKAGE', occurredOnUtc: '2024-07-10T09:00:00Z' },
];

export const STOCK_RESERVATIONS: StockReservation[] = [
  {
    id: 'RES-1', stockItemId: 'SI-8', sku: 'IKH-201884', warehouseCode: 'WH-1', quantity: 1, status: 'active',
    referenceType: 'SalesOrder', referenceId: 'SO-3301', createdOnUtc: '2024-08-01T09:00:00Z',
  },
  {
    id: 'RES-2', stockItemId: 'SI-2', sku: 'IKH-330298', warehouseCode: 'WH-1', quantity: 5, status: 'released',
    referenceType: 'SalesOrder', referenceId: 'SO-3288', createdOnUtc: '2024-07-20T09:00:00Z', releasedOnUtc: '2024-07-25T09:00:00Z',
  },
];
