import { TestBed } from '@angular/core/testing';
import { Signup } from './signup';
import { AuthService } from '../../../core/auth/auth.service';

describe('Signup', () => {
  it('should mount and unmount the Clerk sign-up UI', () => {
    let mountedEl: HTMLElement | undefined;
    let unmountedEl: HTMLElement | undefined;

    TestBed.configureTestingModule({
      imports: [Signup],
      providers: [
        {
          provide: AuthService,
          useValue: {
            mountSignUp: (el: HTMLElement) => {
              mountedEl = el;
            },
            unmountSignUp: (el: HTMLElement) => {
              unmountedEl = el;
            },
          } as unknown as AuthService,
        },
      ],
    });

    const fixture = TestBed.createComponent(Signup);
    fixture.detectChanges();
    expect(mountedEl).toBeInstanceOf(HTMLElement);

    fixture.destroy();
    expect(unmountedEl).toBe(mountedEl);
  });
});
