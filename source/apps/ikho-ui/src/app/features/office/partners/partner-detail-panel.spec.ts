import { TestBed } from '@angular/core/testing';
import { Partner } from '../../../core/mock-data/partners.data';
import { PartnerDetailPanel } from './partner-detail-panel';

const TEST_PARTNER: Partner = {
  code: 'SUP-0142',
  type: 'supplier',
  name: 'Vanderberg Steel',
  taxId: 'NL-810234567B01',
  isActive: true,
  createdOnUtc: '2024-03-11T09:00:00Z',
  addresses: [
    { id: 'ADR-1001', line1: 'Kanaalweg 14', line2: '', city: 'Eindhoven', state: 'Noord-Brabant', postalCode: '5613 BA', country: 'Netherlands', isPrimary: true },
  ],
  contacts: [
    { id: 'CNT-1001', name: 'J. Vanderberg', email: 'j.vanderberg@vbsteel.nl', phone: '+31 40 224 8810', isPrimary: true },
  ],
};

describe('PartnerDetailPanel', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PartnerDetailPanel],
    }).compileComponents();
  });

  it('renders the partner name, code, and Active status', () => {
    const fixture = TestBed.createComponent(PartnerDetailPanel);
    fixture.componentRef.setInput('partner', TEST_PARTNER);
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Vanderberg Steel');
    expect(text).toContain('SUP-0142');
    expect(text).toContain('Active');
  });

  it('toggleStatus emits when the activate/deactivate button is clicked', () => {
    const fixture = TestBed.createComponent(PartnerDetailPanel);
    fixture.componentRef.setInput('partner', TEST_PARTNER);
    fixture.detectChanges();

    let emitted = false;
    fixture.componentInstance.toggleStatus.subscribe(() => (emitted = true));

    const buttons = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button'));
    const deactivateButton = buttons.find((b) => b.textContent?.includes('Deactivate'));
    deactivateButton?.click();

    expect(emitted).toBe(true);
  });

  it('rejects a blank name on edit and does not emit saveDetails', () => {
    const fixture = TestBed.createComponent(PartnerDetailPanel);
    fixture.componentRef.setInput('partner', TEST_PARTNER);
    fixture.detectChanges();

    const instance = fixture.componentInstance as unknown as {
      startEdit: () => void;
      editName: { set: (v: string) => void };
      editTaxId: { set: (v: string) => void };
      submitDetails: () => void;
    };
    let emitted = false;
    fixture.componentInstance.saveDetails.subscribe(() => (emitted = true));

    instance.startEdit();
    instance.editName.set('');
    instance.editTaxId.set('NL-999');
    instance.submitDetails();

    expect(emitted).toBe(false);
  });

  it('saveDetails emits trimmed name and tax id on a valid edit', () => {
    const fixture = TestBed.createComponent(PartnerDetailPanel);
    fixture.componentRef.setInput('partner', TEST_PARTNER);
    fixture.detectChanges();

    const instance = fixture.componentInstance as unknown as {
      startEdit: () => void;
      editName: { set: (v: string) => void };
      editTaxId: { set: (v: string) => void };
      submitDetails: () => void;
    };
    let payload: { name: string; taxId: string } | undefined;
    fixture.componentInstance.saveDetails.subscribe((v) => (payload = v));

    instance.startEdit();
    instance.editName.set('  Vanderberg Steel BV  ');
    instance.editTaxId.set('  NL-810234567B01  ');
    instance.submitDetails();

    expect(payload).toEqual({ name: 'Vanderberg Steel BV', taxId: 'NL-810234567B01' });
  });

  it('rejects an address missing City and does not emit addAddress', () => {
    const fixture = TestBed.createComponent(PartnerDetailPanel);
    fixture.componentRef.setInput('partner', TEST_PARTNER);
    fixture.detectChanges();

    const instance = fixture.componentInstance as unknown as {
      showAddressForm: { set: (v: boolean) => void };
      addrLine1: { set: (v: string) => void };
      addrCountry: { set: (v: string) => void };
      submitAddress: () => void;
    };
    let emitted = false;
    fixture.componentInstance.addAddress.subscribe(() => (emitted = true));

    instance.showAddressForm.set(true);
    instance.addrLine1.set('Some street');
    instance.addrCountry.set('Netherlands');
    instance.submitAddress();

    expect(emitted).toBe(false);
  });

  it('addAddress emits a well-formed address on a valid submission', () => {
    const fixture = TestBed.createComponent(PartnerDetailPanel);
    fixture.componentRef.setInput('partner', TEST_PARTNER);
    fixture.detectChanges();

    const instance = fixture.componentInstance as unknown as {
      showAddressForm: { set: (v: boolean) => void };
      addrLine1: { set: (v: string) => void };
      addrCity: { set: (v: string) => void };
      addrCountry: { set: (v: string) => void };
      addrPrimary: { set: (v: boolean) => void };
      submitAddress: () => void;
    };
    let payload: unknown;
    fixture.componentInstance.addAddress.subscribe((v) => (payload = v));

    instance.showAddressForm.set(true);
    instance.addrLine1.set('Nieuwe Kade 8');
    instance.addrCity.set('Rotterdam');
    instance.addrCountry.set('Netherlands');
    instance.addrPrimary.set(true);
    instance.submitAddress();

    expect(payload).toEqual({
      line1: 'Nieuwe Kade 8',
      line2: '',
      city: 'Rotterdam',
      state: '',
      postalCode: '',
      country: 'Netherlands',
      isPrimary: true,
    });
  });

  it('addContact emits a well-formed contact on a valid submission, and rejects a missing phone', () => {
    const fixture = TestBed.createComponent(PartnerDetailPanel);
    fixture.componentRef.setInput('partner', TEST_PARTNER);
    fixture.detectChanges();

    const instance = fixture.componentInstance as unknown as {
      showContactForm: { set: (v: boolean) => void };
      contactName: { set: (v: string) => void };
      contactEmail: { set: (v: string) => void };
      contactPhone: { set: (v: string) => void };
      submitContact: () => void;
    };
    let payload: unknown;
    fixture.componentInstance.addContact.subscribe((v) => (payload = v));

    instance.showContactForm.set(true);
    instance.contactName.set('A. Jansen');
    instance.contactEmail.set('a.jansen@vbsteel.nl');
    instance.submitContact();
    expect(payload).toBeUndefined();

    instance.contactPhone.set('+31 40 224 8811');
    instance.submitContact();
    expect(payload).toEqual({ name: 'A. Jansen', email: 'a.jansen@vbsteel.nl', phone: '+31 40 224 8811', isPrimary: false });
  });

  it('close emits when the close button is clicked', () => {
    const fixture = TestBed.createComponent(PartnerDetailPanel);
    fixture.componentRef.setInput('partner', TEST_PARTNER);
    fixture.detectChanges();

    let emitted = false;
    fixture.componentInstance.closePanel.subscribe(() => (emitted = true));

    (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('[aria-label="Close"]')?.click();

    expect(emitted).toBe(true);
  });
});
