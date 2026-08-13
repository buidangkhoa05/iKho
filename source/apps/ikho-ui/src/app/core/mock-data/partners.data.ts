export type PartnerType = 'supplier' | 'customer';

export interface PartnerAddress {
  id: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  isPrimary: boolean;
}

export interface PartnerContact {
  id: string;
  name: string;
  email: string;
  phone: string;
  isPrimary: boolean;
}

export interface Partner {
  code: string;
  type: PartnerType;
  name: string;
  taxId: string;
  isActive: boolean;
  createdOnUtc: string;
  addresses: PartnerAddress[];
  contacts: PartnerContact[];
}

export const PARTNERS: Partner[] = [
  {
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
  },
  {
    code: 'SUP-0188',
    type: 'supplier',
    name: 'Nordic Labels A/S',
    taxId: 'DK-29458812',
    isActive: true,
    createdOnUtc: '2024-05-02T09:00:00Z',
    addresses: [
      { id: 'ADR-1002', line1: 'Sonderborggade 9', line2: '', city: 'Aarhus', state: '', postalCode: '8000', country: 'Denmark', isPrimary: true },
    ],
    contacts: [
      { id: 'CNT-1002', name: 'L. Sørensen', email: 'ls@nordiclabels.dk', phone: '+45 86 12 44 00', isPrimary: true },
    ],
  },
  {
    code: 'SUP-0195',
    type: 'supplier',
    name: 'EuroPallet NV',
    taxId: 'BE-0456789123',
    isActive: false,
    createdOnUtc: '2024-06-18T09:00:00Z',
    addresses: [
      { id: 'ADR-1003', line1: 'Havenlaan 22', line2: '', city: 'Antwerp', state: '', postalCode: '2030', country: 'Belgium', isPrimary: true },
    ],
    contacts: [
      { id: 'CNT-1003', name: 'K. Peeters', email: 'k.peeters@europallet.be', phone: '+32 3 225 4090', isPrimary: true },
    ],
  },
  {
    code: 'SUP-0201',
    type: 'supplier',
    name: 'Wrapline BV',
    taxId: 'NL-822345678B02',
    isActive: true,
    createdOnUtc: '2024-07-09T09:00:00Z',
    addresses: [
      { id: 'ADR-1004', line1: 'Industrieweg 5', line2: '', city: 'Tilburg', state: 'Noord-Brabant', postalCode: '5061 KA', country: 'Netherlands', isPrimary: true },
    ],
    contacts: [
      { id: 'CNT-1004', name: 'R. de Groot', email: 'r.degroot@wrapline.nl', phone: '+31 13 549 2200', isPrimary: true },
    ],
  },
  {
    code: 'CUS-2210',
    type: 'customer',
    name: 'Meijer Retail Group',
    taxId: 'NL-807654321B03',
    isActive: true,
    createdOnUtc: '2024-02-14T09:00:00Z',
    addresses: [
      { id: 'ADR-1005', line1: 'Prinsengracht 88', line2: '', city: 'Amsterdam', state: 'Noord-Holland', postalCode: '1015 DZ', country: 'Netherlands', isPrimary: true },
    ],
    contacts: [
      { id: 'CNT-1005', name: 'S. Meijer', email: 's.meijer@meijerretail.nl', phone: '+31 20 555 1201', isPrimary: true },
    ],
  },
  {
    code: 'CUS-2274',
    type: 'customer',
    name: 'Brico Bouwmarkt',
    taxId: 'BE-0678912345',
    isActive: true,
    createdOnUtc: '2024-04-22T09:00:00Z',
    addresses: [
      { id: 'ADR-1006', line1: 'Kortrijksesteenweg 210', line2: '', city: 'Ghent', state: '', postalCode: '9000', country: 'Belgium', isPrimary: true },
    ],
    contacts: [
      { id: 'CNT-1006', name: 'P. Claes', email: 'p.claes@bricobouwmarkt.be', phone: '+32 9 220 1180', isPrimary: true },
    ],
  },
  {
    code: 'CUS-2318',
    type: 'customer',
    name: 'Hafen Bremen GmbH',
    taxId: 'DE-114532678',
    isActive: false,
    createdOnUtc: '2024-08-01T09:00:00Z',
    addresses: [
      { id: 'ADR-1007', line1: 'Am Hafen 3', line2: '', city: 'Bremen', state: '', postalCode: '28197', country: 'Germany', isPrimary: true },
    ],
    contacts: [
      { id: 'CNT-1007', name: 'M. Fischer', email: 'm.fischer@hafenbremen.de', phone: '+49 421 330 5500', isPrimary: true },
    ],
  },
];
