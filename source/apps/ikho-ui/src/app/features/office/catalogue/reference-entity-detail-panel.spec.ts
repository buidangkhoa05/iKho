import { TestBed } from '@angular/core/testing';
import { ReferenceEntityDetailPanel, ReferenceEntityLabels } from './reference-entity-detail-panel';

const TEST_LABELS: ReferenceEntityLabels = {
  eyebrow: 'Category detail',
  name: 'Name',
  save: 'Save',
  cancel: 'Cancel',
  edit: 'Edit name',
  active: 'Active',
  inactive: 'Inactive',
  activate: 'Activate',
  deactivate: 'Deactivate',
  close: 'Close',
  requiredError: 'Name is required.',
};

describe('ReferenceEntityDetailPanel', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [ReferenceEntityDetailPanel] }).compileComponents();
  });

  function create(entity = { code: 'RACK', name: 'Racking', isActive: true }) {
    const fixture = TestBed.createComponent(ReferenceEntityDetailPanel);
    fixture.componentRef.setInput('entity', entity);
    fixture.componentRef.setInput('labels', TEST_LABELS);
    fixture.detectChanges();
    return fixture;
  }

  it('renders the code, name, eyebrow, and Active status', () => {
    const fixture = create();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('RACK');
    expect(text).toContain('Racking');
    expect(text).toContain('Category detail');
    expect(text).toContain('Active');
  });

  it('renders Inactive status for an inactive entity', () => {
    const fixture = create({ code: 'EQIP', name: 'Equipment', isActive: false });
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Inactive');
  });

  it('closePanel emits when the close button is clicked', () => {
    const fixture = create();
    let emitted = false;
    fixture.componentInstance.closePanel.subscribe(() => (emitted = true));
    (fixture.nativeElement as HTMLElement).querySelector('button[aria-label]')?.dispatchEvent(new Event('click', { bubbles: true }));
    expect(emitted).toBe(true);
  });

  it('toggleStatus emits when the activate/deactivate button is clicked', () => {
    const fixture = create();
    let emitted = false;
    fixture.componentInstance.toggleStatus.subscribe(() => (emitted = true));
    const buttons = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button'));
    buttons.find((b) => b.textContent?.includes('Deactivate'))?.click();
    expect(emitted).toBe(true);
  });

  it('saveDetails emits the trimmed name on a valid edit, and rejects a blank name', () => {
    const fixture = create();
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
    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Name is required.');

    instance.editName.set('  Racking Systems  ');
    instance.submitDetails();
    expect(payload).toEqual({ name: 'Racking Systems' });
  });

  it('resets edit state when the entity input changes identity, including after a successful save', () => {
    const fixture = create();
    const instance = fixture.componentInstance as unknown as {
      startEdit: () => void;
      editName: { set: (v: string) => void; (): string };
      editing: () => boolean;
    };
    instance.startEdit();
    instance.editName.set('Something typed');
    expect(instance.editing()).toBe(true);

    fixture.componentRef.setInput('entity', { code: 'RACK', name: 'Racking Systems', isActive: true });
    fixture.detectChanges();

    expect(instance.editing()).toBe(false);
    expect(instance.editName()).toBe('');
  });

  it('setDetailsError surfaces a store-side outcome on the open edit form', () => {
    const fixture = create();
    const instance = fixture.componentInstance as unknown as { startEdit: () => void };
    instance.startEdit();
    fixture.componentInstance.setDetailsError("Code 'RACK' is already in use.");
    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain("Code 'RACK' is already in use.");
  });
});
