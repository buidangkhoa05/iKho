import { Route } from '@angular/router';

export const officeRoutes: Route[] = [
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
  {
    path: 'dashboard',
    loadComponent: () => import('./dashboard/office-dashboard').then((m) => m.OfficeDashboard),
  },
  {
    path: 'catalogue',
    loadComponent: () => import('./catalogue/office-catalogue').then((m) => m.OfficeCatalogue),
  },
  {
    path: 'inventory',
    loadComponent: () => import('./inventory/office-inventory').then((m) => m.OfficeInventory),
  },
  {
    path: 'inbound',
    loadComponent: () => import('./inbound/office-inbound').then((m) => m.OfficeInbound),
  },
  {
    path: 'outbound',
    loadComponent: () => import('./outbound/office-outbound').then((m) => m.OfficeOutbound),
  },
  {
    path: 'organization',
    loadComponent: () => import('./organization/office-organization').then((m) => m.OfficeOrganization),
  },
  {
    path: 'partners',
    loadComponent: () => import('./partners/office-partners').then((m) => m.OfficePartners),
  },
  {
    path: 'returns',
    loadComponent: () => import('./returns/office-returns').then((m) => m.OfficeReturns),
  },
  {
    path: 'billing',
    loadComponent: () => import('./billing/office-billing').then((m) => m.OfficeBilling),
  },
  {
    path: 'reporting',
    loadComponent: () => import('./reporting/office-reporting').then((m) => m.OfficeReporting),
  },
];
