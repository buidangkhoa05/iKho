export interface InboundStatusRow {
  [key: string]: unknown;
  po: string;
  warehouse: string;
  receiptsCompleted: number;
  putawayCompleted: number;
  lastReceiptOn: string;
}

export const INBOUND_STATUSES: InboundStatusRow[] = [
  { po: 'PO-20144', warehouse: 'WH-1 Rotterdam', receiptsCompleted: 4, putawayCompleted: 4, lastReceiptOn: 'Aug 12, 09:15' },
  { po: 'PO-20151', warehouse: 'WH-1 Rotterdam', receiptsCompleted: 2, putawayCompleted: 1, lastReceiptOn: 'Aug 11, 14:40' },
  { po: 'PO-20158', warehouse: 'WH-3 Utrecht', receiptsCompleted: 1, putawayCompleted: 0, lastReceiptOn: 'Aug 12, 08:05' },
];
