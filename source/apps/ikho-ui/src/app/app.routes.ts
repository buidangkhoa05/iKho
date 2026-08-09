import { Route } from '@angular/router';

export const appRoutes: Route[] = [
  { path: '', pathMatch: 'full', redirectTo: 'office/dashboard' },
  {
    path: 'office',
    loadComponent: () => import('./shared/layouts/office-shell/office-shell').then((m) => m.OfficeShell),
    loadChildren: () => import('./features/office/office.routes').then((m) => m.officeRoutes),
  },
  {
    path: 'operator',
    loadComponent: () => import('./shared/layouts/operator-shell/operator-shell').then((m) => m.OperatorShell),
    loadChildren: () => import('./features/operator/operator.routes').then((m) => m.operatorRoutes),
  },
  { path: '**', redirectTo: 'office/dashboard' },
];
