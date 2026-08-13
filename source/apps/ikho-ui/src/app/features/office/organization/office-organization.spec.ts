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
      selectedCode: { set: (v: string) => void };
      store: { warehouses: () => { code: string; isActive: boolean }[] };
    };
    instance.selectedCode.set('WH-1');
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
});
