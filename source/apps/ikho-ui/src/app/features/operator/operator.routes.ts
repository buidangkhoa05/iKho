import { Route } from '@angular/router';

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
  {
    path: 'outbound',
    loadComponent: () => import('./outbound/operator-outbound-entry').then((m) => m.OperatorOutboundEntry),
  },
  {
    path: 'outbound/dispatch/:soId',
    loadComponent: () => import('./outbound/operator-outbound-dispatch').then((m) => m.OperatorOutboundDispatch),
  },
  {
    path: 'inventory',
    loadComponent: () => import('./inventory/operator-inventory').then((m) => m.OperatorInventory),
  },
  {
    path: 'returns',
    loadComponent: () => import('./returns/operator-returns-entry').then((m) => m.OperatorReturnsEntry),
  },
  {
    path: 'returns/receive/:rma',
    loadComponent: () => import('./returns/operator-returns-receive').then((m) => m.OperatorReturnsReceive),
  },
  {
    path: 'returns/inspect/:rma',
    loadComponent: () => import('./returns/operator-returns-inspect').then((m) => m.OperatorReturnsInspect),
  },
  {
    path: 'returns/disposition/:rma',
    loadComponent: () => import('./returns/operator-returns-disposition').then((m) => m.OperatorReturnsDisposition),
  },
];
