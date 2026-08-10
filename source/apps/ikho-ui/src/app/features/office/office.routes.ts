import { Route } from '@angular/router';

const genericScreen = (screenId: string): Route => ({
  path: screenId,
  loadComponent: () =>
    import('./generic-screen/office-generic-screen').then((m) => m.OfficeGenericScreen),
  data: { screenId },
});

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
  genericScreen('organization'),
  genericScreen('partners'),
  genericScreen('returns'),
  genericScreen('billing'),
  genericScreen('reporting'),
];
