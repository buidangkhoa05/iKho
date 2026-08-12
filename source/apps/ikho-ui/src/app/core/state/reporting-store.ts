import { Injectable, signal } from '@angular/core';
import { FulfillmentKpiDay, FULFILLMENT_KPIS } from '../mock-data/fulfillment-kpis.data';
import { InboundStatusRow, INBOUND_STATUSES } from '../mock-data/inbound-status.data';
import { InventoryPosition, INVENTORY_POSITIONS } from '../mock-data/inventory-positions.data';
import { OutboundStatusRow, OUTBOUND_STATUSES } from '../mock-data/outbound-status.data';

@Injectable({ providedIn: 'root' })
export class ReportingStore {
  readonly fulfillmentKpis = signal<FulfillmentKpiDay[]>([...FULFILLMENT_KPIS]);
  readonly inventoryPositions = signal<InventoryPosition[]>([...INVENTORY_POSITIONS]);
  readonly inboundStatuses = signal<InboundStatusRow[]>([...INBOUND_STATUSES]);
  readonly outboundStatuses = signal<OutboundStatusRow[]>([...OUTBOUND_STATUSES]);
}
