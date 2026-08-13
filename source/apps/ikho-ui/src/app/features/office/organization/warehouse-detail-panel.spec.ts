import { TestBed } from '@angular/core/testing';
import { Warehouse } from '../../../core/mock-data/organization.data';
import { WarehouseDetailPanel } from './warehouse-detail-panel';

const TEST_WAREHOUSE: Warehouse = {
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
  ],
};

describe('WarehouseDetailPanel', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WarehouseDetailPanel],
    }).compileComponents();
  });

  it('renders the warehouse name, code, company, and Active status', () => {
    const fixture = TestBed.createComponent(WarehouseDetailPanel);
    fixture.componentRef.setInput('warehouse', TEST_WAREHOUSE);
    fixture.componentRef.setInput('companyName', 'Rotterdam Logistics BV');
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Rotterdam DC');
    expect(text).toContain('WH-1');
    expect(text).toContain('Rotterdam Logistics BV');
    expect(text).toContain('Active');
  });

  it('renders zones and docks with their names', () => {
    const fixture = TestBed.createComponent(WarehouseDetailPanel);
    fixture.componentRef.setInput('warehouse', TEST_WAREHOUSE);
    fixture.componentRef.setInput('companyName', 'Rotterdam Logistics BV');
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Bulk storage');
    expect(text).toContain('Pick face');
    expect(text).toContain('Inbound door 1');
  });

  it('toggleStatus emits when the activate/deactivate button is clicked', () => {
    const fixture = TestBed.createComponent(WarehouseDetailPanel);
    fixture.componentRef.setInput('warehouse', TEST_WAREHOUSE);
    fixture.componentRef.setInput('companyName', 'Rotterdam Logistics BV');
    fixture.detectChanges();

    let emitted = false;
    fixture.componentInstance.toggleStatus.subscribe(() => (emitted = true));

    const buttons = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button'));
    const deactivateButton = buttons.find((b) => b.textContent?.includes('Deactivate'));
    deactivateButton?.click();

    expect(emitted).toBe(true);
  });

  it('saveDetails emits the trimmed name on a valid edit, and rejects a blank name', () => {
    const fixture = TestBed.createComponent(WarehouseDetailPanel);
    fixture.componentRef.setInput('warehouse', TEST_WAREHOUSE);
    fixture.componentRef.setInput('companyName', 'Rotterdam Logistics BV');
    fixture.detectChanges();

    const instance = fixture.componentInstance as unknown as {
      startEdit: () => void;
      editName: { set: (v: string) => void };
      submitDetails: () => void;
    };
    let payload: { name: string } | undefined;
    fixture.componentInstance.saveDetails.subscribe((v) => (payload = v));

    instance.startEdit();
    instance.editName.set('');
    instance.submitDetails();
    expect(payload).toBeUndefined();

    instance.editName.set('  Rotterdam DC (Renovated)  ');
    instance.submitDetails();
    expect(payload).toEqual({ name: 'Rotterdam DC (Renovated)' });
  });

  it('rejects an add-zone submission missing code or name, and emits a well-formed zone on success', () => {
    const fixture = TestBed.createComponent(WarehouseDetailPanel);
    fixture.componentRef.setInput('warehouse', TEST_WAREHOUSE);
    fixture.componentRef.setInput('companyName', 'Rotterdam Logistics BV');
    fixture.detectChanges();

    const instance = fixture.componentInstance as unknown as {
      showZoneForm: { set: (v: boolean) => void };
      zoneCode: { set: (v: string) => void };
      zoneName: { set: (v: string) => void };
      submitZone: () => void;
    };
    let payload: unknown;
    fixture.componentInstance.addZone.subscribe((v) => (payload = v));

    instance.showZoneForm.set(true);
    instance.zoneCode.set('Z-C');
    instance.submitZone();
    expect(payload).toBeUndefined();

    instance.zoneName.set('Returns processing');
    instance.submitZone();
    expect(payload).toEqual({ code: 'Z-C', name: 'Returns processing' });
  });

  it('toggleZoneStatus emits the zone code and inverted status when a zone row toggle is clicked', () => {
    const fixture = TestBed.createComponent(WarehouseDetailPanel);
    fixture.componentRef.setInput('warehouse', TEST_WAREHOUSE);
    fixture.componentRef.setInput('companyName', 'Rotterdam Logistics BV');
    fixture.detectChanges();

    let payload: { zoneCode: string; isActive: boolean } | undefined;
    fixture.componentInstance.toggleZoneStatus.subscribe((v) => (payload = v));

    const buttons = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button'));
    const zoneToggle = buttons.find((b) => b.getAttribute('data-zone-toggle') === 'Z-A');
    zoneToggle?.click();

    expect(payload).toEqual({ zoneCode: 'Z-A', isActive: false });
  });

  it('rejects an add-dock submission missing code or name, and emits a well-formed dock on success', () => {
    const fixture = TestBed.createComponent(WarehouseDetailPanel);
    fixture.componentRef.setInput('warehouse', TEST_WAREHOUSE);
    fixture.componentRef.setInput('companyName', 'Rotterdam Logistics BV');
    fixture.detectChanges();

    const instance = fixture.componentInstance as unknown as {
      showDockForm: { set: (v: boolean) => void };
      dockCode: { set: (v: string) => void };
      dockName: { set: (v: string) => void };
      submitDock: () => void;
    };
    let payload: unknown;
    fixture.componentInstance.addDock.subscribe((v) => (payload = v));

    instance.showDockForm.set(true);
    instance.dockCode.set('D-2');
    instance.submitDock();
    expect(payload).toBeUndefined();

    instance.dockName.set('Outbound door 2');
    instance.submitDock();
    expect(payload).toEqual({ code: 'D-2', name: 'Outbound door 2' });
  });

  it('closePanel emits when the close button is clicked', () => {
    const fixture = TestBed.createComponent(WarehouseDetailPanel);
    fixture.componentRef.setInput('warehouse', TEST_WAREHOUSE);
    fixture.componentRef.setInput('companyName', 'Rotterdam Logistics BV');
    fixture.detectChanges();

    let emitted = false;
    fixture.componentInstance.closePanel.subscribe(() => (emitted = true));

    (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('[aria-label="Close"]')?.click();

    expect(emitted).toBe(true);
  });
});
