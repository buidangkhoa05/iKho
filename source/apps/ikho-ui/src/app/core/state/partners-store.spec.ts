import { PartnersStore } from './partners-store';

describe('PartnersStore', () => {
  let store: PartnersStore;

  beforeEach(() => {
    store = new PartnersStore();
  });

  it('seeds partners from mock data with both suppliers and customers', () => {
    expect(store.partners().length).toBeGreaterThan(0);
    expect(store.partners().some((p) => p.type === 'supplier')).toBe(true);
    expect(store.partners().some((p) => p.type === 'customer')).toBe(true);
  });

  it('addPartner prepends a new active partner with empty addresses and contacts', () => {
    const before = store.partners().length;

    const outcome = store.addPartner({ code: 'SUP-9001', type: 'supplier', name: 'Test Supplier BV', taxId: 'NL-999999999B01' });

    expect(outcome).toBe('ok');
    expect(store.partners().length).toBe(before + 1);
    const created = store.partners()[0];
    expect(created.code).toBe('SUP-9001');
    expect(created.isActive).toBe(true);
    expect(created.addresses).toEqual([]);
    expect(created.contacts).toEqual([]);
  });

  it('addPartner rejects a blank code, name, or tax id', () => {
    const before = store.partners().length;

    const outcome = store.addPartner({ code: '', type: 'supplier', name: 'Test', taxId: 'NL-1' });

    expect(outcome).toBe('invalid');
    expect(store.partners().length).toBe(before);
  });

  it('addPartner rejects a duplicate code', () => {
    const before = store.partners().length;

    const outcome = store.addPartner({ code: 'SUP-0142', type: 'supplier', name: 'Another Vanderberg', taxId: 'NL-1' });

    expect(outcome).toBe('duplicate-code');
    expect(store.partners().length).toBe(before);
  });

  it('updatePartner updates name and tax id for an existing partner', () => {
    const outcome = store.updatePartner('SUP-0142', { name: 'Vanderberg Steel BV', taxId: 'NL-810234567B99' });

    expect(outcome).toBe('ok');
    const updated = store.partners().find((p) => p.code === 'SUP-0142')!;
    expect(updated.name).toBe('Vanderberg Steel BV');
    expect(updated.taxId).toBe('NL-810234567B99');
  });

  it('updatePartner fails for an unknown code', () => {
    const outcome = store.updatePartner('SUP-9999', { name: 'X', taxId: 'Y' });

    expect(outcome).toBe('not-found');
  });

  it('updatePartner rejects a blank name or tax id', () => {
    const outcome = store.updatePartner('SUP-0142', { name: '', taxId: 'NL-1' });

    expect(outcome).toBe('invalid');
    const unchanged = store.partners().find((p) => p.code === 'SUP-0142')!;
    expect(unchanged.name).toBe('Vanderberg Steel');
  });

  it('setStatus flips isActive for the matching partner only', () => {
    store.setStatus('SUP-0142', false);

    expect(store.partners().find((p) => p.code === 'SUP-0142')!.isActive).toBe(false);
    expect(store.partners().find((p) => p.code === 'SUP-0188')!.isActive).toBe(true);
  });

  it('addAddress appends a new address with a generated id to the matching partner only', () => {
    const before = store.partners().find((p) => p.code === 'SUP-0142')!.addresses.length;

    store.addAddress('SUP-0142', {
      line1: 'Nieuwe Kade 8', line2: '', city: 'Rotterdam', state: '', postalCode: '3011 AK', country: 'Netherlands', isPrimary: false,
    });

    const updated = store.partners().find((p) => p.code === 'SUP-0142')!;
    expect(updated.addresses.length).toBe(before + 1);
    expect(updated.addresses[updated.addresses.length - 1].city).toBe('Rotterdam');
    expect(updated.addresses[updated.addresses.length - 1].id).toBeTruthy();
    expect(store.partners().find((p) => p.code === 'SUP-0188')!.addresses.length).toBe(1);
  });

  it('addContact appends a new contact with a generated id to the matching partner only', () => {
    const before = store.partners().find((p) => p.code === 'SUP-0142')!.contacts.length;

    store.addContact('SUP-0142', { name: 'A. Jansen', email: 'a.jansen@vbsteel.nl', phone: '+31 40 224 8811', isPrimary: false });

    const updated = store.partners().find((p) => p.code === 'SUP-0142')!;
    expect(updated.contacts.length).toBe(before + 1);
    expect(updated.contacts[updated.contacts.length - 1].name).toBe('A. Jansen');
    expect(updated.contacts[updated.contacts.length - 1].id).toBeTruthy();
  });
});
