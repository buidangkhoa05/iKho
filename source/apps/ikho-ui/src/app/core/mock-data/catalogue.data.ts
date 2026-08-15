export interface Category {
  code: string;
  name: string;
  isActive: boolean;
}

export interface Brand {
  code: string;
  name: string;
  isActive: boolean;
}

export interface UnitOfMeasure {
  code: string;
  name: string;
  isActive: boolean;
}

export interface Barcode {
  code: string;
}

export interface Product {
  sku: string;
  name: string;
  description: string;
  categoryCode?: string;
  brandCode?: string;
  defaultUomCode?: string;
  isLotControlled: boolean;
  isSerialControlled: boolean;
  isActive: boolean;
  createdOnUtc: string;
  barcodes: Barcode[];
}

export const CATEGORIES: Category[] = [
  { code: 'RACK', name: 'Racking', isActive: true },
  { code: 'CONS', name: 'Consumables', isActive: true },
  { code: 'PACK', name: 'Packaging', isActive: true },
  // Seeded inactive despite two active products below still referencing it — deactivating a
  // category doesn't retroactively invalidate existing product assignments, it only blocks
  // *new* ones (matches the "no cascade" behavior established in Organization).
  { code: 'EQIP', name: 'Equipment', isActive: false },
];

export const BRANDS: Brand[] = [
  { code: 'VDB', name: 'Vanderberg', isActive: true },
  { code: 'NLB', name: 'Nordic Labels', isActive: true },
  { code: 'EPL', name: 'EuroPallet', isActive: false },
  { code: 'KTX', name: 'Kartonex', isActive: true },
  { code: 'WRL', name: 'Wrapline', isActive: true },
  { code: 'SCT', name: 'ScanTech', isActive: true },
];

export const UNITS_OF_MEASURE: UnitOfMeasure[] = [
  { code: 'EA', name: 'Each', isActive: true },
  { code: 'ROL', name: 'Roll', isActive: true },
  { code: 'BOX', name: 'Box of 12', isActive: true },
  { code: 'PAL', name: 'Pallet of 480', isActive: false },
];

export const PRODUCTS: Product[] = [
  { sku: 'IKH-482910', name: 'Steel shelving bracket, 400mm', description: '', categoryCode: 'RACK', brandCode: 'VDB', defaultUomCode: 'EA', isLotControlled: true, isSerialControlled: false, isActive: true, createdOnUtc: '2024-01-15T09:00:00Z', barcodes: [{ code: '8712345482910' }] },
  { sku: 'IKH-330298', name: 'Barcode label roll, 100×50mm', description: '', categoryCode: 'CONS', brandCode: 'NLB', defaultUomCode: 'ROL', isLotControlled: true, isSerialControlled: false, isActive: true, createdOnUtc: '2024-01-20T09:00:00Z', barcodes: [{ code: '8712345330298' }] },
  { sku: 'IKH-770145', name: 'Euro pallet, heat-treated', description: '', categoryCode: 'PACK', brandCode: 'EPL', defaultUomCode: 'EA', isLotControlled: false, isSerialControlled: false, isActive: true, createdOnUtc: '2024-02-01T09:00:00Z', barcodes: [{ code: '8712345770145' }] },
  { sku: 'IKH-105522', name: 'Corrugated box, 305×229×229mm', description: '', categoryCode: 'PACK', brandCode: 'KTX', defaultUomCode: 'EA', isLotControlled: false, isSerialControlled: false, isActive: true, createdOnUtc: '2024-02-10T09:00:00Z', barcodes: [{ code: '8712345105522' }] },
  { sku: 'IKH-664120', name: 'Pallet wrap film, 500mm', description: '', categoryCode: 'CONS', brandCode: 'WRL', defaultUomCode: 'ROL', isLotControlled: true, isSerialControlled: false, isActive: true, createdOnUtc: '2024-03-05T09:00:00Z', barcodes: [{ code: '8712345664120' }] },
  { sku: 'IKH-201884', name: 'Hand pallet truck, 2.5t', description: '', categoryCode: 'EQIP', brandCode: 'VDB', defaultUomCode: 'EA', isLotControlled: false, isSerialControlled: true, isActive: true, createdOnUtc: '2024-03-18T09:00:00Z', barcodes: [{ code: '8712345201884' }] },
  { sku: 'IKH-559071', name: 'Void fill paper, 380mm', description: '', categoryCode: 'PACK', brandCode: 'KTX', defaultUomCode: 'EA', isLotControlled: false, isSerialControlled: false, isActive: true, createdOnUtc: '2024-04-02T09:00:00Z', barcodes: [{ code: '8712345559071' }] },
  { sku: 'IKH-318440', name: 'Shelf divider, 600mm', description: '', categoryCode: 'RACK', brandCode: 'VDB', defaultUomCode: 'EA', isLotControlled: true, isSerialControlled: false, isActive: true, createdOnUtc: '2024-04-20T09:00:00Z', barcodes: [{ code: '8712345318440' }] },
  { sku: 'IKH-902316', name: 'Handheld scanner, 2D', description: '', categoryCode: 'EQIP', brandCode: 'SCT', defaultUomCode: 'EA', isLotControlled: false, isSerialControlled: true, isActive: true, createdOnUtc: '2024-05-05T09:00:00Z', barcodes: [{ code: '8712345902316' }] },
  // Seeded inactive — gives setProductStatus's no-op-if-unchanged guard and the Products
  // table's status filtering something real to exercise.
  { sku: 'IKH-447203', name: 'Thermal ribbon, 110mm', description: '', categoryCode: 'CONS', brandCode: 'NLB', defaultUomCode: 'ROL', isLotControlled: true, isSerialControlled: false, isActive: false, createdOnUtc: '2024-05-20T09:00:00Z', barcodes: [{ code: '8712345447203' }] },
];
