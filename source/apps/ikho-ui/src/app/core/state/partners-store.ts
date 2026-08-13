import { Injectable, signal } from '@angular/core';
import { Partner, PartnerAddress, PartnerContact, PartnerType, PARTNERS } from '../mock-data/partners.data';

export type AddPartnerOutcome = 'ok' | 'duplicate-code' | 'invalid';
export type UpdatePartnerOutcome = 'ok' | 'not-found' | 'invalid';

export interface AddPartnerInput {
  code: string;
  type: PartnerType;
  name: string;
  taxId: string;
}

export interface UpdatePartnerInput {
  name: string;
  taxId: string;
}

export type NewPartnerAddress = Omit<PartnerAddress, 'id'>;
export type NewPartnerContact = Omit<PartnerContact, 'id'>;

let addressSeq = 2001;
let contactSeq = 2001;

@Injectable({ providedIn: 'root' })
export class PartnersStore {
  readonly partners = signal<Partner[]>([...PARTNERS]);

  addPartner(input: AddPartnerInput): AddPartnerOutcome {
    const code = input.code.trim();
    const name = input.name.trim();
    const taxId = input.taxId.trim();
    if (!code || !name || !taxId) return 'invalid';
    if (this.partners().some((p) => p.code === code)) return 'duplicate-code';

    const partner: Partner = {
      code,
      type: input.type,
      name,
      taxId,
      isActive: true,
      createdOnUtc: new Date().toISOString(),
      addresses: [],
      contacts: [],
    };
    this.partners.update((list) => [partner, ...list]);
    return 'ok';
  }

  updatePartner(code: string, input: UpdatePartnerInput): UpdatePartnerOutcome {
    const name = input.name.trim();
    const taxId = input.taxId.trim();
    if (!name || !taxId) return 'invalid';
    if (!this.partners().some((p) => p.code === code)) return 'not-found';

    this.partners.update((list) => list.map((p) => (p.code === code ? { ...p, name, taxId } : p)));
    return 'ok';
  }

  setStatus(code: string, isActive: boolean): void {
    this.partners.update((list) => list.map((p) => (p.code === code ? { ...p, isActive } : p)));
  }

  addAddress(code: string, address: NewPartnerAddress): void {
    const newAddress: PartnerAddress = { ...address, id: `ADR-${addressSeq++}` };
    this.partners.update((list) =>
      list.map((p) => (p.code === code ? { ...p, addresses: [...p.addresses, newAddress] } : p)),
    );
  }

  addContact(code: string, contact: NewPartnerContact): void {
    const newContact: PartnerContact = { ...contact, id: `CNT-${contactSeq++}` };
    this.partners.update((list) =>
      list.map((p) => (p.code === code ? { ...p, contacts: [...p.contacts, newContact] } : p)),
    );
  }
}
