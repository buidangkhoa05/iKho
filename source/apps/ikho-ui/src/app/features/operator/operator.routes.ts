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
  {
    path: 'inbound',
    loadComponent: () => import('./inbound/operator-inbound-entry').then((m) => m.OperatorInboundEntry),
  },
  {
    path: 'inbound/receive/:poId',
    loadComponent: () => import('./inbound/operator-inbound-receive').then((m) => m.OperatorInboundReceive),
  },
  {
    path: 'inbound/putaway/:taskId',
    loadComponent: () => import('./inbound/operator-inbound-putaway').then((m) => m.OperatorInboundPutaway),
  },
  outlinedScreen('outbound'),
  outlinedScreen('inventory'),
  outlinedScreen('returns'),
];
