export interface OutboundStatusRow {
  [key: string]: unknown;
  so: string;
  warehouse: string;
  allocationsConfirmed: number;
  shipmentsDispatched: number;
  lastShipmentOn: string;
}

export const OUTBOUND_STATUSES: OutboundStatusRow[] = [
  { so: 'SO-91002', warehouse: 'WH-1 Rotterdam', allocationsConfirmed: 3, shipmentsDispatched: 3, lastShipmentOn: 'Aug 12, 10:20' },
  { so: 'SO-91009', warehouse: 'WH-1 Rotterdam', allocationsConfirmed: 2, shipmentsDispatched: 1, lastShipmentOn: 'Aug 11, 16:05' },
  { so: 'SO-91014', warehouse: 'WH-3 Utrecht', allocationsConfirmed: 1, shipmentsDispatched: 0, lastShipmentOn: '—' },
];
