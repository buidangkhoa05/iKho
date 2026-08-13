import { Injectable, signal } from '@angular/core';
import { Company, Dock, Warehouse, Zone, COMPANIES, WAREHOUSES } from '../mock-data/organization.data';

export type AddCompanyOutcome = 'ok' | 'duplicate-code' | 'invalid';
export type AddWarehouseOutcome = 'ok' | 'duplicate-code' | 'invalid' | 'company-not-found';
export type UpdateWarehouseOutcome = 'ok' | 'not-found' | 'invalid';
export type AddZoneOutcome = 'ok' | 'duplicate-code' | 'invalid' | 'not-found';
export type AddDockOutcome = 'ok' | 'duplicate-code' | 'invalid' | 'not-found';

export interface AddCompanyInput {
  code: string;
  name: string;
}

export interface AddWarehouseInput {
  code: string;
  companyCode: string;
  name: string;
}

export interface UpdateWarehouseInput {
  name: string;
}

export interface AddZoneInput {
  code: string;
  name: string;
}

export interface AddDockInput {
  code: string;
  name: string;
}

@Injectable({ providedIn: 'root' })
export class OrganizationStore {
  readonly companies = signal<Company[]>([...COMPANIES]);
  readonly warehouses = signal<Warehouse[]>([...WAREHOUSES]);

  addCompany(input: AddCompanyInput): AddCompanyOutcome {
    const code = input.code.trim();
    const name = input.name.trim();
    if (!code || !name) return 'invalid';
    if (this.companies().some((c) => c.code === code)) return 'duplicate-code';

    const company: Company = { code, name, isActive: true, createdOnUtc: new Date().toISOString() };
    this.companies.update((list) => [company, ...list]);
    return 'ok';
  }

  addWarehouse(input: AddWarehouseInput): AddWarehouseOutcome {
    const code = input.code.trim();
    const companyCode = input.companyCode.trim();
    const name = input.name.trim();
    if (!code || !companyCode || !name) return 'invalid';
    if (!this.companies().some((c) => c.code === companyCode)) return 'company-not-found';
    if (this.warehouses().some((w) => w.code === code && w.companyCode === companyCode)) return 'duplicate-code';

    const warehouse: Warehouse = {
      code,
      companyCode,
      name,
      isActive: true,
      createdOnUtc: new Date().toISOString(),
      zones: [],
      docks: [],
    };
    this.warehouses.update((list) => [warehouse, ...list]);
    return 'ok';
  }

  updateWarehouse(code: string, input: UpdateWarehouseInput): UpdateWarehouseOutcome {
    const name = input.name.trim();
    if (!name) return 'invalid';
    if (!this.warehouses().some((w) => w.code === code)) return 'not-found';

    this.warehouses.update((list) => list.map((w) => (w.code === code ? { ...w, name } : w)));
    return 'ok';
  }

  setWarehouseStatus(code: string, isActive: boolean): void {
    this.warehouses.update((list) => list.map((w) => (w.code === code ? { ...w, isActive } : w)));
  }

  addZone(warehouseCode: string, input: AddZoneInput): AddZoneOutcome {
    const code = input.code.trim();
    const name = input.name.trim();
    if (!code || !name) return 'invalid';
    const warehouse = this.warehouses().find((w) => w.code === warehouseCode);
    if (!warehouse) return 'not-found';
    if (warehouse.zones.some((z) => z.code === code)) return 'duplicate-code';

    const zone: Zone = { code, name, isActive: true };
    this.warehouses.update((list) =>
      list.map((w) => (w.code === warehouseCode ? { ...w, zones: [...w.zones, zone] } : w)),
    );
    return 'ok';
  }

  setZoneStatus(warehouseCode: string, zoneCode: string, isActive: boolean): void {
    this.warehouses.update((list) =>
      list.map((w) =>
        w.code === warehouseCode
          ? { ...w, zones: w.zones.map((z) => (z.code === zoneCode ? { ...z, isActive } : z)) }
          : w,
      ),
    );
  }

  addDock(warehouseCode: string, input: AddDockInput): AddDockOutcome {
    const code = input.code.trim();
    const name = input.name.trim();
    if (!code || !name) return 'invalid';
    const warehouse = this.warehouses().find((w) => w.code === warehouseCode);
    if (!warehouse) return 'not-found';
    if (warehouse.docks.some((d) => d.code === code)) return 'duplicate-code';

    const dock: Dock = { code, name, isActive: true };
    this.warehouses.update((list) =>
      list.map((w) => (w.code === warehouseCode ? { ...w, docks: [...w.docks, dock] } : w)),
    );
    return 'ok';
  }

  setDockStatus(warehouseCode: string, dockCode: string, isActive: boolean): void {
    this.warehouses.update((list) =>
      list.map((w) =>
        w.code === warehouseCode
          ? { ...w, docks: w.docks.map((d) => (d.code === dockCode ? { ...d, isActive } : d)) }
          : w,
      ),
    );
  }
}
