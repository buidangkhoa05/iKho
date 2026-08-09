import { Route } from '@angular/router';

const outlinedScreen = (screenId: string): Route => ({
  path: screenId,
  loadComponent: () =>
    import('./outlined-screen/operator-outlined-screen-route').then((m) => m.OperatorOutlinedScreenRoute),
  data: { screenId },
});

export const operatorRoutes: Route[] = [
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
  {
    path: 'dashboard',
    loadComponent: () => import('./dashboard/operator-dashboard').then((m) => m.OperatorDashboard),
  },
  {
    path: 'catalogue',
    loadComponent: () => import('./catalogue/operator-catalogue').then((m) => m.OperatorCatalogue),
  },
  outlinedScreen('inbound'),
  outlinedScreen('outbound'),
  outlinedScreen('inventory'),
  outlinedScreen('returns'),
];
