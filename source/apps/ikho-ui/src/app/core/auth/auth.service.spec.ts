import { TestBed } from '@angular/core/testing';
import type { Clerk } from '@clerk/clerk-js';
import { AuthService } from './auth.service';
import { CLERK_FACTORY } from './clerk-factory';

function createFakeClerk(overrides: Partial<Clerk> = {}): Clerk {
  return {
    load: async () => {},
    signOut: async () => {},
    addListener: () => () => {},
    mountSignIn: () => {},
    unmountSignIn: () => {},
    mountSignUp: () => {},
    unmountSignUp: () => {},
    user: null,
    session: null,
    ...overrides,
  } as unknown as Clerk;
}

function configureWithFakeClerk(clerk: Clerk): void {
  TestBed.configureTestingModule({
    providers: [{ provide: CLERK_FACTORY, useValue: () => clerk }],
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
    configureWithFakeClerk(
      createFakeClerk({
        mountSignIn: ((el: HTMLElement) => {
          mountedEl = el;
        }) as Clerk['mountSignIn'],
      }),
    );
    const service = TestBed.inject(AuthService);
    await service.initialize();
    const div = document.createElement('div');
    service.mountSignIn(div);
    expect(mountedEl).toBe(div);
  });
});
