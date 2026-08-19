import { TestBed } from '@angular/core/testing';
import { Login } from './login';
import { AuthService } from '../../../core/auth/auth.service';

describe('Login', () => {
  it('should mount and unmount the Clerk sign-in UI', () => {
    let mountedEl: HTMLElement | undefined;
    let unmountedEl: HTMLElement | undefined;

    TestBed.configureTestingModule({
      imports: [Login],
      providers: [
        {
          provide: AuthService,
          useValue: {
            mountSignIn: (el: HTMLElement) => {
              mountedEl = el;
            },
            unmountSignIn: (el: HTMLElement) => {
              unmountedEl = el;
            },
          } as unknown as AuthService,
        },
      ],
    });

    const fixture = TestBed.createComponent(Login);
    fixture.detectChanges();
    expect(mountedEl).toBeInstanceOf(HTMLElement);

    fixture.destroy();
    expect(unmountedEl).toBe(mountedEl);
  });
});
