export interface Company {
  code: string;
  name: string;
  isActive: boolean;
  createdOnUtc: string;
}

export interface Zone {
  code: string;
  name: string;
  isActive: boolean;
}

export interface Dock {
  code: string;
  name: string;
  isActive: boolean;
}

export interface Warehouse {
  code: string;
  companyCode: string;
  name: string;
  isActive: boolean;
  createdOnUtc: string;
  zones: Zone[];
  docks: Dock[];
}

export const COMPANIES: Company[] = [
  { code: 'RTM-LOG', name: 'Rotterdam Logistics BV', isActive: true, createdOnUtc: '2023-11-01T09:00:00Z' },
];

export const WAREHOUSES: Warehouse[] = [
  {
    code: 'WH-1',
    companyCode: 'RTM-LOG',
    name: 'Rotterdam DC',
    isActive: true,
    createdOnUtc: '2023-11-05T09:00:00Z',
    zones: [
      { code: 'Z-A', name: 'Bulk storage', isActive: true },
      { code: 'Z-B', name: 'Pick face', isActive: true },
    ],
    docks: [
      { code: 'D-1', name: 'Inbound door 1', isActive: true },
      { code: 'D-2', name: 'Outbound door 1', isActive: true },
    ],
  },
  {
    code: 'WH-2',
    companyCode: 'RTM-LOG',
    name: 'Antwerp Overflow',
    isActive: true,
    createdOnUtc: '2024-01-14T09:00:00Z',
    zones: [
      { code: 'Z-A', name: 'Bulk storage', isActive: true },
    ],
    docks: [
      { code: 'D-1', name: 'Inbound door 1', isActive: true },
    ],
  },
  {
    code: 'WH-3',
    companyCode: 'RTM-LOG',
    name: 'Utrecht Returns Hub',
    isActive: false,
    createdOnUtc: '2024-06-20T09:00:00Z',
    zones: [
      { code: 'Z-A', name: 'Quarantine', isActive: true },
    ],
    docks: [
      { code: 'D-1', name: 'Inbound door 1', isActive: false },
    ],
  },
];
