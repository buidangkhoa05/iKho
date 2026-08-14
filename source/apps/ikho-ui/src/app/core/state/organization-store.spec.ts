import { OrganizationStore } from './organization-store';

describe('OrganizationStore', () => {
  let store: OrganizationStore;

  beforeEach(() => {
    store = new OrganizationStore();
  });

  it('seeds companies and warehouses from mock data', () => {
    expect(store.companies().length).toBeGreaterThan(0);
    expect(store.warehouses().length).toBe(3);
  });

  it('addCompany prepends a new active company', () => {
    const before = store.companies().length;

    const outcome = store.addCompany({ code: 'ANT-LOG', name: 'Antwerp Freight NV' });

    expect(outcome).toBe('ok');
    expect(store.companies().length).toBe(before + 1);
    const created = store.companies()[0];
    expect(created.code).toBe('ANT-LOG');
    expect(created.isActive).toBe(true);
  });

  it('addCompany rejects a blank code or name', () => {
    const before = store.companies().length;

    const outcome = store.addCompany({ code: '', name: 'Test' });

    expect(outcome).toBe('invalid');
    expect(store.companies().length).toBe(before);
  });

  it('addCompany rejects a duplicate code', () => {
    const before = store.companies().length;

    const outcome = store.addCompany({ code: 'RTM-LOG', name: 'Another Co' });

    expect(outcome).toBe('duplicate-code');
    expect(store.companies().length).toBe(before);
  });

  it('addWarehouse prepends a new active warehouse with empty zones and docks', () => {
    const before = store.warehouses().length;

    const outcome = store.addWarehouse({ code: 'WH-9', companyCode: 'RTM-LOG', name: 'Test Warehouse' });

    expect(outcome).toBe('ok');
    expect(store.warehouses().length).toBe(before + 1);
    const created = store.warehouses()[0];
    expect(created.code).toBe('WH-9');
    expect(created.isActive).toBe(true);
    expect(created.zones).toEqual([]);
    expect(created.docks).toEqual([]);
  });

  it('addWarehouse rejects a blank code, companyCode, or name', () => {
    const outcome = store.addWarehouse({ code: '', companyCode: 'RTM-LOG', name: 'Test' });

    expect(outcome).toBe('invalid');
  });

  it('addWarehouse rejects an unknown companyCode', () => {
    const outcome = store.addWarehouse({ code: 'WH-9', companyCode: 'NO-SUCH-CO', name: 'Test' });

    expect(outcome).toBe('company-not-found');
  });

  it('addWarehouse rejects a duplicate code within the same company', () => {
    const before = store.warehouses().length;

    const outcome = store.addWarehouse({ code: 'WH-1', companyCode: 'RTM-LOG', name: 'Duplicate' });

    expect(outcome).toBe('duplicate-code');
    expect(store.warehouses().length).toBe(before);
  });

  it('addWarehouse allows the same code under a different company', () => {
    store.addCompany({ code: 'ANT-LOG', name: 'Antwerp Freight NV' });

    const outcome = store.addWarehouse({ code: 'WH-1', companyCode: 'ANT-LOG', name: 'Antwerp WH-1' });

    expect(outcome).toBe('ok');
  });

  it('updateWarehouse updates the name of an existing warehouse', () => {
    const outcome = store.updateWarehouse({ companyCode: 'RTM-LOG', code: 'WH-1' }, { name: 'Rotterdam DC (Renovated)' });

    expect(outcome).toBe('ok');
    const updated = store.warehouses().find((w) => w.code === 'WH-1')!;
    expect(updated.name).toBe('Rotterdam DC (Renovated)');
  });

  it('updateWarehouse fails for an unknown code', () => {
    const outcome = store.updateWarehouse({ companyCode: 'RTM-LOG', code: 'WH-999' }, { name: 'X' });

    expect(outcome).toBe('not-found');
  });

  it('updateWarehouse fails when the code exists but under a different company', () => {
    store.addCompany({ code: 'ANT-LOG', name: 'Antwerp Freight NV' });
    store.addWarehouse({ code: 'WH-1', companyCode: 'ANT-LOG', name: 'Antwerp WH-1' });

    const outcome = store.updateWarehouse({ companyCode: 'NO-SUCH-CO', code: 'WH-1' }, { name: 'X' });

    expect(outcome).toBe('not-found');
  });

  it('updateWarehouse rejects a blank name', () => {
    const outcome = store.updateWarehouse({ companyCode: 'RTM-LOG', code: 'WH-1' }, { name: '' });

    expect(outcome).toBe('invalid');
    const unchanged = store.warehouses().find((w) => w.code === 'WH-1')!;
    expect(unchanged.name).toBe('Rotterdam DC');
  });

  it('setWarehouseStatus flips isActive for the matching warehouse only', () => {
    store.setWarehouseStatus({ companyCode: 'RTM-LOG', code: 'WH-1' }, false);

    expect(store.warehouses().find((w) => w.code === 'WH-1')!.isActive).toBe(false);
    expect(store.warehouses().find((w) => w.code === 'WH-2')!.isActive).toBe(true);
  });

  it('setWarehouseStatus is a no-op for an unknown warehouse', () => {
    const before = store.warehouses();

    store.setWarehouseStatus({ companyCode: 'RTM-LOG', code: 'WH-999' }, false);

    expect(store.warehouses()).toEqual(before);
  });

  it('addZone appends a new active zone to the matching warehouse only', () => {
    const before = store.warehouses().find((w) => w.code === 'WH-1')!.zones.length;

    const outcome = store.addZone({ companyCode: 'RTM-LOG', code: 'WH-1' }, { code: 'Z-C', name: 'Returns processing' });

    expect(outcome).toBe('ok');
    const updated = store.warehouses().find((w) => w.code === 'WH-1')!;
    expect(updated.zones.length).toBe(before + 1);
    expect(updated.zones[updated.zones.length - 1]).toEqual({ code: 'Z-C', name: 'Returns processing', isActive: true });
    expect(store.warehouses().find((w) => w.code === 'WH-2')!.zones.length).toBe(1);
  });

  it('addZone rejects a blank code or name', () => {
    const outcome = store.addZone({ companyCode: 'RTM-LOG', code: 'WH-1' }, { code: '', name: 'Test' });

    expect(outcome).toBe('invalid');
  });

  it('addZone rejects an unknown warehouseCode', () => {
    const outcome = store.addZone({ companyCode: 'RTM-LOG', code: 'WH-999' }, { code: 'Z-X', name: 'Test' });

    expect(outcome).toBe('not-found');
  });

  it('addZone rejects a duplicate code within the same warehouse', () => {
    const before = store.warehouses().find((w) => w.code === 'WH-1')!.zones.length;

    const outcome = store.addZone({ companyCode: 'RTM-LOG', code: 'WH-1' }, { code: 'Z-A', name: 'Duplicate' });

    expect(outcome).toBe('duplicate-code');
    expect(store.warehouses().find((w) => w.code === 'WH-1')!.zones.length).toBe(before);
  });

  it('addZone allows the same code under a different warehouse', () => {
    const outcome = store.addZone({ companyCode: 'RTM-LOG', code: 'WH-2' }, { code: 'Z-B', name: 'Second zone' });

    expect(outcome).toBe('ok');
  });

  it('setZoneStatus flips isActive for the matching zone in the matching warehouse only', () => {
    store.setZoneStatus({ companyCode: 'RTM-LOG', code: 'WH-1' }, 'Z-A', false);

    const wh1 = store.warehouses().find((w) => w.code === 'WH-1')!;
    expect(wh1.zones.find((z) => z.code === 'Z-A')!.isActive).toBe(false);
    expect(wh1.zones.find((z) => z.code === 'Z-B')!.isActive).toBe(true);
    expect(store.warehouses().find((w) => w.code === 'WH-2')!.zones.find((z) => z.code === 'Z-A')!.isActive).toBe(true);
  });

  it('setZoneStatus is a no-op for an unknown warehouse or zone code', () => {
    const before = store.warehouses();

    store.setZoneStatus({ companyCode: 'RTM-LOG', code: 'WH-999' }, 'Z-A', false);
    store.setZoneStatus({ companyCode: 'RTM-LOG', code: 'WH-1' }, 'Z-ZZZ', false);

    expect(store.warehouses()).toEqual(before);
  });

  it('addDock appends a new active dock to the matching warehouse only', () => {
    const before = store.warehouses().find((w) => w.code === 'WH-1')!.docks.length;

    const outcome = store.addDock({ companyCode: 'RTM-LOG', code: 'WH-1' }, { code: 'D-3', name: 'Cross-dock lane' });

    expect(outcome).toBe('ok');
    const updated = store.warehouses().find((w) => w.code === 'WH-1')!;
    expect(updated.docks.length).toBe(before + 1);
    expect(updated.docks[updated.docks.length - 1]).toEqual({ code: 'D-3', name: 'Cross-dock lane', isActive: true });
  });

  it('addDock rejects a duplicate code within the same warehouse', () => {
    const outcome = store.addDock({ companyCode: 'RTM-LOG', code: 'WH-1' }, { code: 'D-1', name: 'Duplicate' });

    expect(outcome).toBe('duplicate-code');
  });

  it('addDock rejects a blank code or name', () => {
    const outcome = store.addDock({ companyCode: 'RTM-LOG', code: 'WH-1' }, { code: '', name: 'Test' });

    expect(outcome).toBe('invalid');
  });

  it('addDock rejects an unknown warehouseCode', () => {
    const outcome = store.addDock({ companyCode: 'RTM-LOG', code: 'WH-999' }, { code: 'D-X', name: 'Test' });

    expect(outcome).toBe('not-found');
  });

  it('setDockStatus flips isActive for the matching dock in the matching warehouse only', () => {
    store.setDockStatus({ companyCode: 'RTM-LOG', code: 'WH-1' }, 'D-1', false);

    const wh1 = store.warehouses().find((w) => w.code === 'WH-1')!;
    expect(wh1.docks.find((d) => d.code === 'D-1')!.isActive).toBe(false);
    expect(wh1.docks.find((d) => d.code === 'D-2')!.isActive).toBe(true);
  });

  it('setDockStatus is a no-op for an unknown warehouse or dock code', () => {
    const before = store.warehouses();

    store.setDockStatus({ companyCode: 'RTM-LOG', code: 'WH-999' }, 'D-1', false);
    store.setDockStatus({ companyCode: 'RTM-LOG', code: 'WH-1' }, 'D-ZZZ', false);

    expect(store.warehouses()).toEqual(before);
  });

  describe('cross-company warehouse identity (same code, different company)', () => {
    beforeEach(() => {
      store.addCompany({ code: 'ANT-LOG', name: 'Antwerp Freight NV' });
      store.addWarehouse({ code: 'WH-1', companyCode: 'ANT-LOG', name: 'Antwerp WH-1' });
    });

    it('setWarehouseStatus only flips the warehouse in the targeted company', () => {
      store.setWarehouseStatus({ companyCode: 'ANT-LOG', code: 'WH-1' }, false);

      expect(store.warehouses().find((w) => w.code === 'WH-1' && w.companyCode === 'ANT-LOG')!.isActive).toBe(false);
      expect(store.warehouses().find((w) => w.code === 'WH-1' && w.companyCode === 'RTM-LOG')!.isActive).toBe(true);
    });

    it('updateWarehouse only renames the warehouse in the targeted company', () => {
      const outcome = store.updateWarehouse({ companyCode: 'ANT-LOG', code: 'WH-1' }, { name: 'Antwerp WH-1 (Renamed)' });

      expect(outcome).toBe('ok');
      expect(store.warehouses().find((w) => w.code === 'WH-1' && w.companyCode === 'ANT-LOG')!.name).toBe('Antwerp WH-1 (Renamed)');
      expect(store.warehouses().find((w) => w.code === 'WH-1' && w.companyCode === 'RTM-LOG')!.name).toBe('Rotterdam DC');
    });

    it('addZone only appends the zone to the warehouse in the targeted company', () => {
      const outcome = store.addZone({ companyCode: 'ANT-LOG', code: 'WH-1' }, { code: 'Z-C', name: 'Antwerp zone' });

      expect(outcome).toBe('ok');
      expect(store.warehouses().find((w) => w.code === 'WH-1' && w.companyCode === 'ANT-LOG')!.zones).toEqual([
        { code: 'Z-C', name: 'Antwerp zone', isActive: true },
      ]);
      expect(store.warehouses().find((w) => w.code === 'WH-1' && w.companyCode === 'RTM-LOG')!.zones.length).toBe(2);
    });
  });
});
