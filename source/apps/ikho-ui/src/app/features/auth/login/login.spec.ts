import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { Login } from './login';
import { AuthService } from '../../../core/auth/auth.service';

describe('Login', () => {
  it('should mount and unmount the Clerk sign-in UI', () => {
    let mountedEl: HTMLElement | undefined;
    let mountedRedirectUrl: string | undefined;
    let unmountedEl: HTMLElement | undefined;

    TestBed.configureTestingModule({
      imports: [Login],
      providers: [
        {
          provide: AuthService,
          useValue: {
            mountSignIn: (el: HTMLElement, redirectUrl?: string) => {
              mountedEl = el;
              mountedRedirectUrl = redirectUrl;
            },
            unmountSignIn: (el: HTMLElement) => {
              unmountedEl = el;
            },
          } as unknown as AuthService,
        },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { queryParamMap: convertToParamMap({}) } },
        },
      ],
    });

    const fixture = TestBed.createComponent(Login);
    fixture.detectChanges();
    expect(mountedEl).toBeInstanceOf(HTMLElement);
    expect(mountedRedirectUrl).toBeUndefined();

    fixture.destroy();
    expect(unmountedEl).toBe(mountedEl);
  });

  it('should pass the redirectUrl query param through to mountSignIn', () => {
    let mountedEl: HTMLElement | undefined;
    let mountedRedirectUrl: string | undefined;

    TestBed.configureTestingModule({
      imports: [Login],
      providers: [
        {
          provide: AuthService,
          useValue: {
            mountSignIn: (el: HTMLElement, redirectUrl?: string) => {
              mountedEl = el;
              mountedRedirectUrl = redirectUrl;
            },
            unmountSignIn: () => undefined,
          } as unknown as AuthService,
        },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { queryParamMap: convertToParamMap({ redirectUrl: '/office/dashboard' }) } },
        },
      ],
    });

    const fixture = TestBed.createComponent(Login);
    fixture.detectChanges();
    expect(mountedEl).toBeInstanceOf(HTMLElement);
    expect(mountedRedirectUrl).toBe('/office/dashboard');
  });
});
