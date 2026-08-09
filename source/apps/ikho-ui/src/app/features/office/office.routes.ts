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
  genericScreen('organization'),
  genericScreen('partners'),
  genericScreen('inbound'),
  genericScreen('outbound'),
  genericScreen('returns'),
  genericScreen('billing'),
  genericScreen('reporting'),
];
