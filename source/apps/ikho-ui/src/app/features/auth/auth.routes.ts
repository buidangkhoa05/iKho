import { Route } from '@angular/router';
import { guestGuard } from '../../core/auth/auth.guard';

export const authRoutes: Route[] = [
  {
    path: 'login',
    loadComponent: () => import('./login/login').then((m) => m.Login),
    canActivate: [guestGuard],
  },
  {
    path: 'signup',
    loadComponent: () => import('./signup/signup').then((m) => m.Signup),
    canActivate: [guestGuard],
  },
];
