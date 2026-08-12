export interface FulfillmentKpiDay {
  [key: string]: unknown;
  date: string;
  receipts: number;
  shipments: number;
  allocations: number;
}

export const FULFILLMENT_KPIS: FulfillmentKpiDay[] = [
  { date: 'Aug 06', receipts: 24, shipments: 19, allocations: 21 },
  { date: 'Aug 07', receipts: 15, shipments: 27, allocations: 30 },
  { date: 'Aug 08', receipts: 21, shipments: 24, allocations: 23 },
  { date: 'Aug 09', receipts: 19, shipments: 20, allocations: 25 },
  { date: 'Aug 10', receipts: 26, shipments: 18, allocations: 19 },
  { date: 'Aug 11', receipts: 23, shipments: 25, allocations: 28 },
  { date: 'Aug 12', receipts: 20, shipments: 22, allocations: 24 },
];
