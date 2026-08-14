import { TestBed } from '@angular/core/testing';
import { OfficeOrganization } from './office-organization';

describe('OfficeOrganization', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OfficeOrganization],
    }).compileComponents();
  });

  it('renders KPI tiles computed from the seeded warehouses', () => {
    const fixture = TestBed.createComponent(OfficeOrganization);
    fixture.detectChanges();

    const cards = (fixture.nativeElement as HTMLElement).querySelectorAll('lib-kpi-card');
    expect(cards.length).toBe(3);
    expect(cards[0].textContent).toContain('Warehouses');
    expect(cards[0].textContent).toContain('3');
    expect(cards[1].textContent).toContain('Active');
    expect(cards[1].textContent).toContain('2');
    expect(cards[2].textContent).toContain('Inactive');
    expect(cards[2].textContent).toContain('1');
  });

  it('renders all seeded warehouses in the table', () => {
    const fixture = TestBed.createComponent(OfficeOrganization);
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Rotterdam DC');
    expect(text).toContain('Antwerp Overflow');
    expect(text).toContain('Utrecht Returns Hub');
    expect(text).toContain('Rotterdam Logistics BV');
  });

  it('search narrows the table by code, name, or company', () => {
    const fixture = TestBed.createComponent(OfficeOrganization);
    fixture.detectChanges();

    const instance = fixture.componentInstance as unknown as { query: { set: (v: string) => void } };
    instance.query.set('Antwerp');
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Antwerp Overflow');
    expect(text).not.toContain('Rotterdam DC');
  });

  it('shows a bilingual empty label when search yields no results', () => {
    const fixture = TestBed.createComponent(OfficeOrganization);
    fixture.detectChanges();

    const instance = fixture.componentInstance as unknown as { query: { set: (v: string) => void } };
    instance.query.set('no such warehouse anywhere');
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).not.toContain('No results');
    expect(text).toContain('No warehouses match');
  });

  it("row click opens the detail panel with the warehouse's zones and docks", () => {
    const fixture = TestBed.createComponent(OfficeOrganization);
    fixture.detectChanges();

    const table = (fixture.nativeElement as HTMLElement).querySelector('lib-data-table')!;
    const firstRow = table.querySelector('tbody tr') as HTMLElement;
    firstRow.click();
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Warehouse detail');
  });

  it("activate/deactivate flips the selected warehouse's status", () => {
    const fixture = TestBed.createComponent(OfficeOrganization);
    fixture.detectChanges();

    const instance = fixture.componentInstance as unknown as {
      selectedRef: { set: (v: { companyCode: string; code: string }) => void };
      store: { warehouses: () => { code: string; isActive: boolean }[] };
    };
    instance.selectedRef.set({ companyCode: 'RTM-LOG', code: 'WH-1' });
    fixture.detectChanges();

    const buttons = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button'));
    const deactivateButton = buttons.find((b) => b.textContent?.includes('Deactivate'));
    deactivateButton?.click();
    fixture.detectChanges();

    expect(instance.store.warehouses().find((w) => w.code === 'WH-1')!.isActive).toBe(false);
  });

  it('adding a zone appends it to the warehouse and clears the form for the next add', () => {
    const fixture = TestBed.createComponent(OfficeOrganization);
    fixture.detectChanges();

    const table = (fixture.nativeElement as HTMLElement).querySelector('lib-data-table')!;
    (table.querySelector('tbody tr') as HTMLElement).click();
    fixture.detectChanges();

    let addZoneButton = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Add zone'),
    );
    addZoneButton?.click();
    fixture.detectChanges();

    const inputs = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('input'));
    const codeInput = inputs.find((i) => i.closest('label')?.textContent?.includes('Code')) as HTMLInputElement;
    const nameInput = inputs.find((i) => i.closest('label')?.textContent?.includes('Name')) as HTMLInputElement;
    codeInput.value = 'Z-C';
    codeInput.dispatchEvent(new Event('input'));
    nameInput.value = 'Returns processing';
    nameInput.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    const saveZoneButton = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Save zone'),
    );
    saveZoneButton?.click();
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Returns processing');

    addZoneButton = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Add zone'),
    );
    addZoneButton?.click();
    fixture.detectChanges();

    const reopenedInputs = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('input'));
    const reopenedCode = reopenedInputs.find((i) => i.closest('label')?.textContent?.includes('Code')) as HTMLInputElement;
    expect(reopenedCode.value).toBe('');
  });

  it('adding a dock appends it to the warehouse and clears the form for the next add', () => {
    const fixture = TestBed.createComponent(OfficeOrganization);
    fixture.detectChanges();

    const table = (fixture.nativeElement as HTMLElement).querySelector('lib-data-table')!;
    (table.querySelector('tbody tr') as HTMLElement).click();
    fixture.detectChanges();

    let addDockButton = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Add dock'),
    );
    addDockButton?.click();
    fixture.detectChanges();

    const inputs = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('input'));
    const codeInput = inputs.find((i) => i.closest('label')?.textContent?.includes('Code')) as HTMLInputElement;
    const nameInput = inputs.find((i) => i.closest('label')?.textContent?.includes('Name')) as HTMLInputElement;
    codeInput.value = 'D-3';
    codeInput.dispatchEvent(new Event('input'));
    nameInput.value = 'Cross-dock lane';
    nameInput.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    const saveDockButton = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Save dock'),
    );
    saveDockButton?.click();
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Cross-dock lane');

    addDockButton = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Add dock'),
    );
    addDockButton?.click();
    fixture.detectChanges();

    const reopenedInputs = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('input'));
    const reopenedCode = reopenedInputs.find((i) => i.closest('label')?.textContent?.includes('Code')) as HTMLInputElement;
    expect(reopenedCode.value).toBe('');
  });

  it('surfaces a duplicate zone code outcome from the store as an error on the open zone form', () => {
    const fixture = TestBed.createComponent(OfficeOrganization);
    fixture.detectChanges();

    const table = (fixture.nativeElement as HTMLElement).querySelector('lib-data-table')!;
    (table.querySelector('tbody tr') as HTMLElement).click();
    fixture.detectChanges();

    const addZoneButton = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Add zone'),
    );
    addZoneButton?.click();
    fixture.detectChanges();

    const inputs = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('input'));
    const codeInput = inputs.find((i) => i.closest('label')?.textContent?.includes('Code')) as HTMLInputElement;
    const nameInput = inputs.find((i) => i.closest('label')?.textContent?.includes('Name')) as HTMLInputElement;
    codeInput.value = 'Z-A'; // WH-1 already has a Z-A zone
    codeInput.dispatchEvent(new Event('input'));
    nameInput.value = 'Duplicate zone';
    nameInput.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    const saveZoneButton = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Save zone'),
    );
    saveZoneButton?.click();
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain("Zone code 'Z-A' is already in use in this warehouse.");
  });

  it('cancelling the add-zone form clears its fields and error for the next open', () => {
    const fixture = TestBed.createComponent(OfficeOrganization);
    fixture.detectChanges();

    const table = (fixture.nativeElement as HTMLElement).querySelector('lib-data-table')!;
    (table.querySelector('tbody tr') as HTMLElement).click();
    fixture.detectChanges();

    let addZoneButton = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Add zone'),
    );
    addZoneButton?.click();
    fixture.detectChanges();

    let inputs = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('input'));
    let codeInput = inputs.find((i) => i.closest('label')?.textContent?.includes('Code')) as HTMLInputElement;
    codeInput.value = 'Z-A';
    codeInput.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    const saveZoneButton = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Save zone'),
    );
    saveZoneButton?.click(); // triggers the duplicate-code error
    fixture.detectChanges();

    const cancelButton = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button')).find(
      (b) => b.textContent?.trim() === 'Cancel',
    );
    cancelButton?.click();
    fixture.detectChanges();

    let text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).not.toContain('already in use');

    addZoneButton = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Add zone'),
    );
    addZoneButton?.click();
    fixture.detectChanges();

    inputs = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('input'));
    codeInput = inputs.find((i) => i.closest('label')?.textContent?.includes('Code')) as HTMLInputElement;
    expect(codeInput.value).toBe('');
    text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).not.toContain('already in use');
  });

  it('distinguishes two warehouses that share a code across different companies', () => {
    const fixture = TestBed.createComponent(OfficeOrganization);
    const instance = fixture.componentInstance as unknown as {
      store: {
        addCompany: (i: { code: string; name: string }) => string;
        addWarehouse: (i: { code: string; companyCode: string; name: string }) => string;
      };
    };
    instance.store.addCompany({ code: 'ANT-LOG', name: 'Antwerp Freight NV' });
    instance.store.addWarehouse({ code: 'WH-1', companyCode: 'ANT-LOG', name: 'Antwerp WH-1' });
    fixture.detectChanges();

    const findRow = (text: string): HTMLElement =>
      Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('lib-data-table tbody tr')).find((r) =>
        r.textContent?.includes(text),
      ) as HTMLElement;

    findRow('Antwerp WH-1').click();
    fixture.detectChanges();

    let panelText = (fixture.nativeElement as HTMLElement).querySelector('app-warehouse-detail-panel')?.textContent ?? '';
    expect(panelText).toContain('Antwerp WH-1');
    expect(panelText).toContain('Antwerp Freight NV');
    expect(panelText).not.toContain('Rotterdam Logistics BV');

    const buttons = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button'));
    const deactivateButton = buttons.find((b) => b.textContent?.includes('Deactivate'));
    deactivateButton?.click();
    fixture.detectChanges();

    findRow('Rotterdam DC').click();
    fixture.detectChanges();

    panelText = (fixture.nativeElement as HTMLElement).querySelector('app-warehouse-detail-panel')?.textContent ?? '';
    expect(panelText).toContain('Active');
    expect(panelText).not.toContain('Inactive');
  });

  it('creates a warehouse under an existing company', () => {
    const fixture = TestBed.createComponent(OfficeOrganization);
    fixture.detectChanges();

    const instance = fixture.componentInstance as unknown as {
      showCreateForm: { set: (v: boolean) => void };
      formCode: { set: (v: string) => void };
      formName: { set: (v: string) => void };
      formCompanyCode: { set: (v: string) => void };
      formError: () => string | null;
      submitCreate: () => void;
    };

    instance.showCreateForm.set(true);
    instance.formCode.set('WH-1'); // duplicate within RTM-LOG
    instance.formName.set('New WH');
    instance.formCompanyCode.set('RTM-LOG');
    instance.submitCreate();
    fixture.detectChanges();

    expect(instance.formError()).toContain('WH-1');

    instance.formCode.set('WH-9');
    instance.submitCreate();
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('New WH');
  });

  it('cancelling the create-warehouse form clears its fields and error for the next open', () => {
    const fixture = TestBed.createComponent(OfficeOrganization);
    fixture.detectChanges();

    const instance = fixture.componentInstance as unknown as {
      showCreateForm: { set: (v: boolean) => void };
      formCode: { set: (v: string) => void; (): string };
      formName: { set: (v: string) => void };
      formCompanyCode: { set: (v: string) => void };
      formError: () => string | null;
      submitCreate: () => void;
      cancelCreate: () => void;
    };

    instance.showCreateForm.set(true);
    instance.formCode.set('WH-1'); // duplicate within RTM-LOG
    instance.formName.set('New WH');
    instance.formCompanyCode.set('RTM-LOG');
    instance.submitCreate();
    expect(instance.formError()).not.toBeNull();

    instance.cancelCreate();

    expect(instance.formCode()).toBe('');
    expect(instance.formError()).toBeNull();
  });

  it('creates a warehouse under a newly created inline company', () => {
    const fixture = TestBed.createComponent(OfficeOrganization);
    fixture.detectChanges();

    const instance = fixture.componentInstance as unknown as {
      showCreateForm: { set: (v: boolean) => void };
      formCode: { set: (v: string) => void };
      formName: { set: (v: string) => void };
      showNewCompanyForm: { set: (v: boolean) => void };
      newCompanyCode: { set: (v: string) => void };
      newCompanyName: { set: (v: string) => void };
      formError: () => string | null;
      submitCreate: () => void;
    };

    instance.showCreateForm.set(true);
    instance.formCode.set('WH-9');
    instance.formName.set('Ghent Satellite');
    instance.showNewCompanyForm.set(true);
    instance.newCompanyCode.set('GHT-LOG');
    instance.newCompanyName.set('Ghent Logistics NV');
    instance.submitCreate();
    fixture.detectChanges();

    expect(instance.formError()).toBeNull();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Ghent Satellite');
    expect(text).toContain('Ghent Logistics NV');
  });

  it('does not create the inline company when the warehouse code is blank', () => {
    const fixture = TestBed.createComponent(OfficeOrganization);
    fixture.detectChanges();

    const instance = fixture.componentInstance as unknown as {
      showCreateForm: { set: (v: boolean) => void };
      formCode: { set: (v: string) => void };
      formName: { set: (v: string) => void };
      showNewCompanyForm: { set: (v: boolean) => void };
      newCompanyCode: { set: (v: string) => void };
      newCompanyName: { set: (v: string) => void };
      formError: () => string | null;
      submitCreate: () => void;
      store: { companies: () => { code: string }[] };
    };

    const companiesBefore = instance.store.companies().length;

    instance.showCreateForm.set(true);
    instance.formCode.set(''); // blank warehouse code
    instance.formName.set('Ghent Satellite');
    instance.showNewCompanyForm.set(true);
    instance.newCompanyCode.set('GHT-LOG');
    instance.newCompanyName.set('Ghent Logistics NV');
    instance.submitCreate();
    fixture.detectChanges();

    expect(instance.formError()).not.toBeNull();
    expect(instance.store.companies().length).toBe(companiesBefore);

    // Retrying with the same company code after fixing the warehouse code must not
    // hit 'duplicate-code' for a company that was never actually created.
    instance.formCode.set('WH-9');
    instance.submitCreate();
    fixture.detectChanges();

    expect(instance.formError()).toBeNull();
    expect(instance.store.companies().length).toBe(companiesBefore + 1);
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Ghent Satellite');
  });
});
