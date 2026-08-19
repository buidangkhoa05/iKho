import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree, provideRouter } from '@angular/router';
import { signal } from '@angular/core';
import { authGuard, guestGuard } from './auth.guard';
import { AuthService } from './auth.service';

function configureWithSignedIn(isSignedIn: boolean): Router {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      { provide: AuthService, useValue: { isSignedIn: signal(isSignedIn) } as unknown as AuthService },
    ],
  });
  return TestBed.inject(Router);
}

describe('authGuard', () => {
  it('should allow activation when signed in', () => {
    configureWithSignedIn(true);
    const result = TestBed.runInInjectionContext(() =>
      authGuard({} as ActivatedRouteSnapshot, { url: '/office/dashboard' } as RouterStateSnapshot),
    );
    expect(result).toBe(true);
  });

  it('should redirect to /login with redirectUrl when signed out', () => {
    const router = configureWithSignedIn(false);
    const result = TestBed.runInInjectionContext(() =>
      authGuard({} as ActivatedRouteSnapshot, { url: '/office/dashboard' } as RouterStateSnapshot),
    );
    expect(router.serializeUrl(result as UrlTree)).toBe('/login?redirectUrl=%2Foffice%2Fdashboard');
  });
});

describe('guestGuard', () => {
  it('should allow activation when signed out', () => {
    configureWithSignedIn(false);
    const result = TestBed.runInInjectionContext(() =>
      guestGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot),
    );
    expect(result).toBe(true);
  });

  it('should redirect to /office/dashboard when already signed in', () => {
    const router = configureWithSignedIn(true);
    const result = TestBed.runInInjectionContext(() =>
      guestGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot),
    );
    expect(router.serializeUrl(result as UrlTree)).toBe('/office/dashboard');
  });
});
