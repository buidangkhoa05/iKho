import { TestBed } from '@angular/core/testing';
import type { Clerk } from '@clerk/clerk-js';
import { AuthService } from './auth.service';
import { CLERK_FACTORY } from './clerk-factory';

function createFakeClerk(overrides: Partial<Clerk> = {}): Clerk {
  return {
    load: async () => undefined,
    signOut: async () => undefined,
    addListener: () => () => undefined,
    mountSignIn: () => undefined,
    unmountSignIn: () => undefined,
    mountSignUp: () => undefined,
    unmountSignUp: () => undefined,
    user: null,
    session: null,
    ...overrides,
  } as unknown as Clerk;
}

function configureWithFakeClerk(clerk: Clerk): void {
  TestBed.configureTestingModule({
    providers: [{ provide: CLERK_FACTORY, useValue: () => Promise.resolve(clerk) }],
  });
}

describe('AuthService', () => {
  it('should start unloaded and signed out before initialize()', () => {
    configureWithFakeClerk(createFakeClerk());
    const service = TestBed.inject(AuthService);
    expect(service.isLoaded()).toBe(false);
    expect(service.isSignedIn()).toBe(false);
  });

  it('should be loaded and signed out after initialize() with no signed-in user', async () => {
    configureWithFakeClerk(createFakeClerk());
    const service = TestBed.inject(AuthService);
    await service.initialize();
    expect(service.isLoaded()).toBe(true);
    expect(service.isSignedIn()).toBe(false);
    expect(service.currentUser()).toBeUndefined();
  });

  it('should expose the signed-in user after initialize() when Clerk reports one', async () => {
    const fakeUser = {
      fullName: 'Jane Doe',
      primaryEmailAddress: { emailAddress: 'jane@example.com' },
      imageUrl: 'https://example.com/jane.png',
    } as unknown as Clerk['user'];
    configureWithFakeClerk(createFakeClerk({ user: fakeUser }));
    const service = TestBed.inject(AuthService);
    await service.initialize();
    expect(service.isSignedIn()).toBe(true);
    expect(service.currentUser()).toEqual({
      name: 'Jane Doe',
      email: 'jane@example.com',
      imageUrl: 'https://example.com/jane.png',
    });
  });

  it('should return null from getToken when there is no session', async () => {
    configureWithFakeClerk(createFakeClerk());
    const service = TestBed.inject(AuthService);
    await service.initialize();
    await expect(service.getToken()).resolves.toBeNull();
  });

  it('should return the session token from getToken when signed in', async () => {
    const fakeSession = { getToken: async () => 'fake-jwt' } as unknown as Clerk['session'];
    configureWithFakeClerk(createFakeClerk({ session: fakeSession }));
    const service = TestBed.inject(AuthService);
    await service.initialize();
    await expect(service.getToken()).resolves.toBe('fake-jwt');
  });

  it('should call clerk.signOut on signOut()', async () => {
    let signOutCalled = false;
    configureWithFakeClerk(
      createFakeClerk({
        signOut: async () => {
          signOutCalled = true;
        },
      }),
    );
    const service = TestBed.inject(AuthService);
    await service.initialize();
    await service.signOut();
    expect(signOutCalled).toBe(true);
  });

  it('should call clerk.mountSignIn with the given element', async () => {
    let mountedEl: HTMLElement | undefined;
    let mountedProps: unknown;
    configureWithFakeClerk(
      createFakeClerk({
        mountSignIn: ((el: HTMLElement, props?: unknown) => {
          mountedEl = el;
          mountedProps = props;
        }) as Clerk['mountSignIn'],
      }),
    );
    const service = TestBed.inject(AuthService);
    await service.initialize();
    const div = document.createElement('div');
    service.mountSignIn(div);
    expect(mountedEl).toBe(div);
    expect(mountedProps).toBeUndefined();
  });

  it('should call clerk.mountSignIn with forceRedirectUrl when a redirect URL is given', async () => {
    let mountedProps: unknown;
    configureWithFakeClerk(
      createFakeClerk({
        mountSignIn: ((_el: HTMLElement, props?: unknown) => {
          mountedProps = props;
        }) as Clerk['mountSignIn'],
      }),
    );
    const service = TestBed.inject(AuthService);
    await service.initialize();
    const div = document.createElement('div');
    service.mountSignIn(div, '/office/dashboard');
    expect(mountedProps).toEqual({ forceRedirectUrl: '/office/dashboard' });
  });

  it('should resolve, mark loaded, and stay signed out when Clerk fails to initialize', async () => {
    TestBed.configureTestingModule({
      providers: [{ provide: CLERK_FACTORY, useValue: () => Promise.reject(new Error('boom')) }],
    });
    const service = TestBed.inject(AuthService);
    await expect(service.initialize()).resolves.toBeUndefined();
    expect(service.isLoaded()).toBe(true);
    expect(service.isSignedIn()).toBe(false);
  });
});
