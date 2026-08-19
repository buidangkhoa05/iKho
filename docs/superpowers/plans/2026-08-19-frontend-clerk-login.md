# Frontend Clerk Login Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give `ikho-ui` real login/signup via Clerk (Google OAuth surfaced through Clerk's own prebuilt UI), backed by the already-built `Ikho.Identity` service — an `AuthService` facade, guarded `/login`/`/signup` routes, an auth-aware HTTP interceptor, and client-side rendering for the now-protected `/office` and `/operator` route trees.

**Architecture:** `@clerk/clerk-js` (Clerk's framework-agnostic core SDK — no official Angular package exists) is wrapped entirely behind a new `AuthService`, following the exact signal + `isPlatformBrowser`-guard pattern already used by `RoleService`/`LangService`/`ThemeService` in this codebase. A `CLERK_FACTORY` injection token seams the real SDK out for tests. `provideAppInitializer` awaits `AuthService.initialize()` before the app's first navigation, so route guards never race Clerk's async load. Two functional guards (`authGuard`, `guestGuard`) and one functional HTTP interceptor read `AuthService`'s signals — nothing else in the app ever imports `@clerk/clerk-js` directly.

**Tech Stack:** Angular (standalone components, signals, functional guards/interceptors — installed version is 22.x per `package.json`, though CLAUDE.md references 19; all APIs used here are stable across that range), `@clerk/clerk-js`, vitest-angular.

## Global Constraints

- Frontend only (`source/apps/ikho-ui`) — no backend/`Ikho.Identity`/gateway changes. Both already exist per `docs/superpowers/specs/2026-08-16-identity-service-design.md`.
- No real Clerk key values are available yet — environment files ship with an empty-string `clerkPublishableKey` placeholder. This is intentional, not a plan defect: `AuthService.initialize()` no-ops on the server and only calls the Clerk factory in the browser, so build/tests pass regardless. The user provides real keys later, dropped directly into the environment files (see Task 1) — no code changes needed at that point.
- **Naming correction from the design spec:** the spec's Section 1 said `environment.development.ts`; this plan uses Angular's actual standard pair — `environment.ts` (default/dev) and `environment.prod.ts` (swapped in via `fileReplacements` under the `production` build configuration only). Same intent, correct Angular convention.
- `AuthService` is the only file that may import `@clerk/clerk-js` types/values directly (via the `CLERK_FACTORY` token's default factory). Every other file (guards, interceptor, login/signup components) only ever touches `AuthService`'s public signals/methods.
- Standalone components only, `OnPush` change detection, named exports, functional guards/interceptors (not class-based) — per existing CLAUDE.md Angular conventions.
- Test files colocated as `.spec.ts`. `AuthService` tests use the `CLERK_FACTORY` seam to inject a fake Clerk-shaped object — never a real `@clerk/clerk-js` import in tests.
- Explicitly out of scope (do not touch): `roleGuard` / real-role wiring for the existing `AccountMenu` Role switcher, the company switcher, any server-side session verification.

---

### Task 1: Dependency + environment config

**Files:**
- Modify: `source/package.json` (via `pnpm add`)
- Create: `source/apps/ikho-ui/src/environments/environment.ts`
- Create: `source/apps/ikho-ui/src/environments/environment.prod.ts`
- Modify: `source/apps/ikho-ui/project.json`

**Interfaces:**
- Produces: `environment.clerkPublishableKey: string`, importable as `import { environment } from '../../../environments/environment'` from `src/app/core/auth/*` (or the correct relative path from wherever it's imported — always resolves to `src/environments/environment.ts`, swapped to `environment.prod.ts` in production builds).

No test framework covers environment files or build config directly — this task is verified by a successful build using each configuration.

- [ ] **Step 1: Install the dependency**

Run: `cd source && pnpm add @clerk/clerk-js`
Expected: `@clerk/clerk-js` added to `source/package.json` dependencies and `source/pnpm-lock.yaml` updated.

- [ ] **Step 2: Create the environment files**

Create `source/apps/ikho-ui/src/environments/environment.ts`:

```typescript
export const environment = {
  production: false,
  clerkPublishableKey: '',
};
```

Create `source/apps/ikho-ui/src/environments/environment.prod.ts`:

```typescript
export const environment = {
  production: true,
  clerkPublishableKey: '',
};
```

- [ ] **Step 3: Wire `fileReplacements` into the production build configuration**

In `source/apps/ikho-ui/project.json`, find the `"production"` object nested under `targets.build.configurations`:

```json
        "production": {
          "budgets": [
            {
              "type": "initial",
              "maximumWarning": "500kb",
              "maximumError": "1mb"
            },
            {
              "type": "anyComponentStyle",
              "maximumWarning": "4kb",
              "maximumError": "8kb"
            }
          ],
          "outputHashing": "all"
        },
```

Replace it with:

```json
        "production": {
          "budgets": [
            {
              "type": "initial",
              "maximumWarning": "500kb",
              "maximumError": "1mb"
            },
            {
              "type": "anyComponentStyle",
              "maximumWarning": "4kb",
              "maximumError": "8kb"
            }
          ],
          "outputHashing": "all",
          "fileReplacements": [
            {
              "replace": "apps/ikho-ui/src/environments/environment.ts",
              "with": "apps/ikho-ui/src/environments/environment.prod.ts"
            }
          ]
        },
```

- [ ] **Step 4: Build to verify no compile errors**

Run: `pnpm nx build ikho-ui`
Expected: build succeeds (both `environment.ts` and the new dependency resolve correctly). No component references either file yet, so this only proves the files/config are syntactically valid.

- [ ] **Step 5: Commit**

```bash
git add source/package.json source/pnpm-lock.yaml source/apps/ikho-ui/src/environments source/apps/ikho-ui/project.json
git commit -m "feat(ikho-ui): add @clerk/clerk-js dependency and environment config"
```

---

### Task 2: `AuthService` — the Clerk facade

**Files:**
- Create: `source/apps/ikho-ui/src/app/core/auth/clerk-factory.ts`
- Create: `source/apps/ikho-ui/src/app/core/auth/auth.service.ts`
- Create: `source/apps/ikho-ui/src/app/core/auth/auth.service.spec.ts`

**Interfaces:**
- Produces: `CLERK_FACTORY: InjectionToken<(publishableKey: string) => Promise<Clerk>>`. `AuthService` (`providedIn: 'root'`) with `isLoaded: Signal<boolean>`, `isSignedIn: Signal<boolean>`, `currentUser: Signal<AuthUser | undefined>` (`AuthUser = { name: string; email: string; imageUrl: string }`), `initialize(): Promise<void>`, `getToken(forceRefresh?: boolean): Promise<string | null>`, `signOut(): Promise<void>`, `mountSignIn(el: HTMLElement): void`, `unmountSignIn(el: HTMLElement): void`, `mountSignUp(el: HTMLElement): void`, `unmountSignUp(el: HTMLElement): void`.

> **Correction discovered during execution:** the original brief had `CLERK_FACTORY` do a static `import { Clerk } from '@clerk/clerk-js'` and construct synchronously. Task 5's build check caught the real consequence: `app.routes.ts` imports `authGuard` → `AuthService` → this factory, and `provideRouter(appRoutes)` is wired eagerly in `app.config.ts` — so the ~1.8MB `@clerk/clerk-js` SDK was landing in the initial bundle instead of behind a lazy boundary, blowing the 1MB production budget set in Task 1. Fix: `CLERK_FACTORY`'s factory does a dynamic `import('@clerk/clerk-js')` instead, making it `async` and changing its type to return `Promise<Clerk>`. This is a packaging-only change — Clerk still finishes loading before the first navigation via `provideAppInitializer` (Task 6), just via a separate, lazily-fetched chunk instead of inline in `main.js`. `AuthService.initialize()` below reflects the corrected `await this.clerkFactory(...)` call.

- [ ] **Step 1: Write the Clerk factory injection token**

```typescript
// source/apps/ikho-ui/src/app/core/auth/clerk-factory.ts
import { InjectionToken } from '@angular/core';
import type { Clerk } from '@clerk/clerk-js';

/** Seam for tests: override this token to inject a fake Clerk-shaped object instead of the real SDK.
 *  Dynamic import keeps @clerk/clerk-js out of the eagerly-loaded main bundle — see the
 *  "Correction discovered during execution" note above this step. */
export const CLERK_FACTORY = new InjectionToken<(publishableKey: string) => Promise<Clerk>>('CLERK_FACTORY', {
  providedIn: 'root',
  factory: () => async (publishableKey: string) => {
    const { Clerk } = await import('@clerk/clerk-js');
    return new Clerk(publishableKey);
  },
});
```

- [ ] **Step 2: Write `AuthService`**

```typescript
// source/apps/ikho-ui/src/app/core/auth/auth.service.ts
import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import type { Clerk } from '@clerk/clerk-js';
import { environment } from '../../../environments/environment';
import { CLERK_FACTORY } from './clerk-factory';

export interface AuthUser {
  name: string;
  email: string;
  imageUrl: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly clerkFactory = inject(CLERK_FACTORY);
  private clerk: Clerk | undefined;

  readonly isLoaded = signal(false);
  readonly isSignedIn = signal(false);
  readonly currentUser = signal<AuthUser | undefined>(undefined);

  async initialize(): Promise<void> {
    if (!this.isBrowser) {
      this.isLoaded.set(true);
      return;
    }
    this.clerk = await this.clerkFactory(environment.clerkPublishableKey);
    await this.clerk.load();
    this.syncState();
    this.clerk.addListener(() => this.syncState());
    this.isLoaded.set(true);
  }

  async getToken(forceRefresh = false): Promise<string | null> {
    if (!this.clerk?.session) {
      return null;
    }
    return this.clerk.session.getToken(forceRefresh ? { skipCache: true } : undefined);
  }

  async signOut(): Promise<void> {
    await this.clerk?.signOut();
  }

  mountSignIn(el: HTMLElement): void {
    this.clerk?.mountSignIn(el);
  }

  unmountSignIn(el: HTMLElement): void {
    this.clerk?.unmountSignIn(el);
  }

  mountSignUp(el: HTMLElement): void {
    this.clerk?.mountSignUp(el);
  }

  unmountSignUp(el: HTMLElement): void {
    this.clerk?.unmountSignUp(el);
  }

  private syncState(): void {
    const user = this.clerk?.user;
    this.isSignedIn.set(!!user);
    this.currentUser.set(
      user
        ? {
            name: user.fullName ?? '',
            email: user.primaryEmailAddress?.emailAddress ?? '',
            imageUrl: user.imageUrl,
          }
        : undefined,
    );
  }
}
```

- [ ] **Step 3: Write the spec**

```typescript
// source/apps/ikho-ui/src/app/core/auth/auth.service.spec.ts
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
```

- [ ] **Step 4: Run the tests**

Run: `pnpm nx test ikho-ui`
Expected: PASS, including all 7 new `AuthService` tests.

- [ ] **Step 5: Commit**

```bash
git add source/apps/ikho-ui/src/app/core/auth
git commit -m "feat(ikho-ui): add AuthService Clerk facade"
```

---

### Task 3: Route guards

**Files:**
- Create: `source/apps/ikho-ui/src/app/core/auth/auth.guard.ts`
- Create: `source/apps/ikho-ui/src/app/core/auth/auth.guard.spec.ts`

**Interfaces:**
- Consumes: `AuthService.isSignedIn` from Task 2.
- Produces: `authGuard: CanActivateFn` (redirects to `/login?redirectUrl=<url>` when signed out), `guestGuard: CanActivateFn` (redirects to `/office/dashboard` when already signed in).

- [ ] **Step 1: Write the failing tests**

```typescript
// source/apps/ikho-ui/src/app/core/auth/auth.guard.spec.ts
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
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm nx test ikho-ui`
Expected: FAIL — `auth.guard.ts` doesn't exist yet.

- [ ] **Step 3: Write the guards**

```typescript
// source/apps/ikho-ui/src/app/core/auth/auth.guard.ts
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.isSignedIn()) {
    return true;
  }
  return router.createUrlTree(['/login'], { queryParams: { redirectUrl: state.url } });
};

export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (!auth.isSignedIn()) {
    return true;
  }
  return router.createUrlTree(['/office/dashboard']);
};
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm nx test ikho-ui`
Expected: PASS, all 4 new guard tests green.

- [ ] **Step 5: Commit**

```bash
git add source/apps/ikho-ui/src/app/core/auth/auth.guard.ts source/apps/ikho-ui/src/app/core/auth/auth.guard.spec.ts
git commit -m "feat(ikho-ui): add authGuard and guestGuard"
```

---

### Task 4: Auth HTTP interceptor

**Files:**
- Create: `source/apps/ikho-ui/src/app/core/interceptors/auth.interceptor.ts`
- Create: `source/apps/ikho-ui/src/app/core/interceptors/auth.interceptor.spec.ts`

**Interfaces:**
- Consumes: `AuthService.getToken`/`AuthService.signOut` from Task 2.
- Produces: `authInterceptor: HttpInterceptorFn`.

- [ ] **Step 1: Write the failing tests**

```typescript
// source/apps/ikho-ui/src/app/core/interceptors/auth.interceptor.spec.ts
import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { authInterceptor } from './auth.interceptor';
import { AuthService } from '../auth/auth.service';

describe('authInterceptor', () => {
  let httpMock: HttpTestingController;
  let httpClient: HttpClient;
  let getTokenCalls: (boolean | undefined)[];

  function setup(tokenResponses: (string | null)[]): void {
    getTokenCalls = [];
    let call = 0;
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        provideRouter([]),
        {
          provide: AuthService,
          useValue: {
            getToken: (forceRefresh?: boolean) => {
              getTokenCalls.push(forceRefresh);
              return Promise.resolve(tokenResponses[call++] ?? null);
            },
            signOut: () => Promise.resolve(),
          } as unknown as AuthService,
        },
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
    httpClient = TestBed.inject(HttpClient);
  }

  afterEach(() => httpMock.verify());

  it('should not attach a header for non-/api/ requests', () => {
    setup(['some-token']);
    httpClient.get('/assets/foo.json').subscribe();
    const req = httpMock.expectOne('/assets/foo.json');
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({});
  });

  it('should attach the bearer token for /api/ requests', () => {
    setup(['my-token']);
    httpClient.get('/api/warehouses').subscribe();
    const req = httpMock.expectOne('/api/warehouses');
    expect(req.request.headers.get('Authorization')).toBe('Bearer my-token');
    req.flush({});
  });

  it('should retry once with a refreshed token on a 401', () => {
    setup(['stale-token', 'fresh-token']);
    httpClient.get('/api/warehouses').subscribe();

    const firstReq = httpMock.expectOne('/api/warehouses');
    expect(firstReq.request.headers.get('Authorization')).toBe('Bearer stale-token');
    firstReq.flush('unauthorized', { status: 401, statusText: 'Unauthorized' });

    const retryReq = httpMock.expectOne('/api/warehouses');
    expect(retryReq.request.headers.get('Authorization')).toBe('Bearer fresh-token');
    expect(getTokenCalls).toEqual([undefined, true]);
    retryReq.flush({});
  });

  it('should propagate the error when the refreshed token also 401s', (done) => {
    setup(['stale-token', null]);
    httpClient.get('/api/warehouses').subscribe({
      next: () => done.fail('expected an error'),
      error: (err) => {
        expect(err.status).toBe(401);
        done();
      },
    });

    const firstReq = httpMock.expectOne('/api/warehouses');
    firstReq.flush('unauthorized', { status: 401, statusText: 'Unauthorized' });
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm nx test ikho-ui`
Expected: FAIL — `auth.interceptor.ts` doesn't exist yet.

- [ ] **Step 3: Write the interceptor**

```typescript
// source/apps/ikho-ui/src/app/core/interceptors/auth.interceptor.ts
import { inject } from '@angular/core';
import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { Router } from '@angular/router';
import { catchError, from, switchMap, throwError } from 'rxjs';
import { AuthService } from '../auth/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.startsWith('/api/')) {
    return next(req);
  }

  const auth = inject(AuthService);
  const router = inject(Router);

  return from(auth.getToken()).pipe(
    switchMap((token) => {
      const authedReq = token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;
      return next(authedReq).pipe(
        catchError((error: unknown) => {
          if (!(error instanceof HttpErrorResponse) || error.status !== 401) {
            return throwError(() => error);
          }
          return from(auth.getToken(true)).pipe(
            switchMap((freshToken) => {
              if (!freshToken) {
                void auth.signOut().then(() => router.navigateByUrl('/login'));
                return throwError(() => error);
              }
              const retryReq = req.clone({ setHeaders: { Authorization: `Bearer ${freshToken}` } });
              return next(retryReq);
            }),
          );
        }),
      );
    }),
  );
};
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm nx test ikho-ui`
Expected: PASS, all 4 new interceptor tests green.

- [ ] **Step 5: Commit**

```bash
git add source/apps/ikho-ui/src/app/core/interceptors
git commit -m "feat(ikho-ui): add auth HTTP interceptor"
```

---

### Task 5: Login/Signup components and routes

**Files:**
- Create: `source/apps/ikho-ui/src/app/features/auth/login/login.ts`
- Create: `source/apps/ikho-ui/src/app/features/auth/login/login.spec.ts`
- Create: `source/apps/ikho-ui/src/app/features/auth/signup/signup.ts`
- Create: `source/apps/ikho-ui/src/app/features/auth/signup/signup.spec.ts`
- Create: `source/apps/ikho-ui/src/app/features/auth/auth.routes.ts`
- Modify: `source/apps/ikho-ui/src/app/app.routes.ts`

**Interfaces:**
- Consumes: `AuthService.mountSignIn`/`unmountSignIn`/`mountSignUp`/`unmountSignUp` from Task 2, `guestGuard`/`authGuard` from Task 3.
- Produces: `Login`, `Signup` standalone components; `authRoutes: Route[]` (paths `login`, `signup`); `app.routes.ts` gains those routes plus `canActivate: [authGuard]` on the `office` and `operator` route entries.

- [ ] **Step 1: Write `Login`**

```typescript
// source/apps/ikho-ui/src/app/features/auth/login/login.ts
import { AfterViewInit, ChangeDetectionStrategy, Component, ElementRef, OnDestroy, ViewChild, inject } from '@angular/core';
import { AuthService } from '../../../core/auth/auth.service';

@Component({
  selector: 'app-login',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex min-h-screen items-center justify-center bg-shell-canvas' },
  template: `<div #mount></div>`,
})
export class Login implements AfterViewInit, OnDestroy {
  private readonly auth = inject(AuthService);
  @ViewChild('mount', { static: true }) private readonly mountRef!: ElementRef<HTMLDivElement>;

  ngAfterViewInit(): void {
    this.auth.mountSignIn(this.mountRef.nativeElement);
  }

  ngOnDestroy(): void {
    this.auth.unmountSignIn(this.mountRef.nativeElement);
  }
}
```

- [ ] **Step 2: Write `Login`'s spec**

```typescript
// source/apps/ikho-ui/src/app/features/auth/login/login.spec.ts
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
```

- [ ] **Step 3: Write `Signup` (mirrors `Login` exactly, using `mountSignUp`/`unmountSignUp`)**

```typescript
// source/apps/ikho-ui/src/app/features/auth/signup/signup.ts
import { AfterViewInit, ChangeDetectionStrategy, Component, ElementRef, OnDestroy, ViewChild, inject } from '@angular/core';
import { AuthService } from '../../../core/auth/auth.service';

@Component({
  selector: 'app-signup',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex min-h-screen items-center justify-center bg-shell-canvas' },
  template: `<div #mount></div>`,
})
export class Signup implements AfterViewInit, OnDestroy {
  private readonly auth = inject(AuthService);
  @ViewChild('mount', { static: true }) private readonly mountRef!: ElementRef<HTMLDivElement>;

  ngAfterViewInit(): void {
    this.auth.mountSignUp(this.mountRef.nativeElement);
  }

  ngOnDestroy(): void {
    this.auth.unmountSignUp(this.mountRef.nativeElement);
  }
}
```

- [ ] **Step 4: Write `Signup`'s spec**

```typescript
// source/apps/ikho-ui/src/app/features/auth/signup/signup.spec.ts
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
```

- [ ] **Step 5: Write the auth routes**

```typescript
// source/apps/ikho-ui/src/app/features/auth/auth.routes.ts
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
```

- [ ] **Step 6: Wire routes and `authGuard` into `app.routes.ts`**

Replace the full contents of `source/apps/ikho-ui/src/app/app.routes.ts`:

```typescript
import { Route } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';

export const appRoutes: Route[] = [
  { path: '', pathMatch: 'full', redirectTo: 'office/dashboard' },
  {
    path: '',
    loadChildren: () => import('./features/auth/auth.routes').then((m) => m.authRoutes),
  },
  {
    path: 'office',
    canActivate: [authGuard],
    loadComponent: () => import('./shared/layouts/office-shell/office-shell').then((m) => m.OfficeShell),
    loadChildren: () => import('./features/office/office.routes').then((m) => m.officeRoutes),
  },
  {
    path: 'operator',
    canActivate: [authGuard],
    loadComponent: () => import('./shared/layouts/operator-shell/operator-shell').then((m) => m.OperatorShell),
    loadChildren: () => import('./features/operator/operator.routes').then((m) => m.operatorRoutes),
  },
  { path: '**', redirectTo: 'office/dashboard' },
];
```

- [ ] **Step 7: Run the tests to verify they pass**

Run: `pnpm nx test ikho-ui`
Expected: PASS, all new `Login`/`Signup` tests green.

- [ ] **Step 8: Commit**

```bash
git add source/apps/ikho-ui/src/app/features/auth source/apps/ikho-ui/src/app/app.routes.ts
git commit -m "feat(ikho-ui): add login/signup routes and guard the office/operator trees"
```

---

### Task 6: App-level wiring, rendering mode, and end-to-end verification

**Files:**
- Modify: `source/apps/ikho-ui/src/app/app.config.ts`
- Modify: `source/apps/ikho-ui/src/app/app.routes.server.ts`

**Interfaces:**
- Consumes: `AuthService` from Task 2, `authInterceptor` from Task 4.

No new unit-testable behavior — verified by the full test suite, a production build, and (conditionally — see Step 4) a manual browser check.

- [ ] **Step 1: Wire `provideAppInitializer` and `provideHttpClient` into `app.config.ts`**

Replace the full contents of `source/apps/ikho-ui/src/app/app.config.ts`:

```typescript
import { ApplicationConfig, inject, provideAppInitializer, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { appRoutes } from './app.routes';
import { AuthService } from './core/auth/auth.service';
import { authInterceptor } from './core/interceptors/auth.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideClientHydration(withEventReplay()),
    provideBrowserGlobalErrorListeners(),
    provideRouter(appRoutes, withComponentInputBinding()),
    provideHttpClient(withInterceptors([authInterceptor])),
    provideAppInitializer(() => {
      const auth = inject(AuthService);
      return auth.initialize();
    }),
  ],
};
```

- [ ] **Step 2: Switch `/office` and `/operator` to client-side rendering**

Replace the full contents of `source/apps/ikho-ui/src/app/app.routes.server.ts`:

```typescript
import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  // These routes carry runtime-generated IDs (mock data created client-side via
  // InboundStore/OutboundStore/ReturnsStore), so there is no fixed param set to prerender
  // against — render them on the client instead.
  {
    path: 'operator/inbound/receive/:poId',
    renderMode: RenderMode.Client,
  },
  {
    path: 'operator/inbound/putaway/:taskId',
    renderMode: RenderMode.Client,
  },
  {
    path: 'operator/outbound/dispatch/:soId',
    renderMode: RenderMode.Client,
  },
  {
    path: 'operator/returns/receive/:rma',
    renderMode: RenderMode.Client,
  },
  {
    path: 'operator/returns/inspect/:rma',
    renderMode: RenderMode.Client,
  },
  {
    path: 'operator/returns/disposition/:rma',
    renderMode: RenderMode.Client,
  },
  // Everything under /office and /operator now requires a real signed-in Clerk session,
  // which only exists in the browser — a build-time prerenderer has no session to check,
  // so these render client-side instead of being baked into static HTML.
  {
    path: 'office/**',
    renderMode: RenderMode.Client,
  },
  {
    path: 'operator/**',
    renderMode: RenderMode.Client,
  },
  {
    path: '**',
    renderMode: RenderMode.Prerender,
  },
];
```

- [ ] **Step 3: Run the full frontend test suite and build**

Run: `pnpm nx test ikho-shared-ui`
Expected: PASS (unaffected by this plan).

Run: `pnpm nx test ikho-ui`
Expected: PASS — full suite, including every test from Tasks 2-5.

Run: `pnpm nx build ikho-ui`
Expected: build succeeds. `/office/**` and `/operator/**` are no longer in the prerendered-routes list (check the build output's route summary); `/login` and `/signup` are.

- [ ] **Step 4: Manual verification in the running app (conditional on real Clerk keys)**

Check `source/apps/ikho-ui/src/environments/environment.ts`'s `clerkPublishableKey`:

- **If still an empty string:** the real Clerk project's keys haven't been provided yet. Skip the rest of this step, note it explicitly as deferred in your report, and do not treat this as a failure — Tasks 1-6's code, tests, and build are still fully verified without it.
- **If a real key is present:** run `pnpm nx serve ikho-ui`, open `http://localhost:4200`, and verify:
  - Visiting `/office/dashboard` while signed out redirects to `/login?redirectUrl=%2Foffice%2Fdashboard`.
  - `/login` renders Clerk's sign-in UI, including a "Sign in with Google" option (or whatever the connected Clerk project has enabled).
  - Completing a Google sign-in redirects back into the app and lands on `/office/dashboard` (honoring `redirectUrl`).
  - Visiting `/login` again while already signed in redirects to `/office/dashboard` (`guestGuard`).
  - Any `/api/*` request made by the app (if one exists to observe — otherwise confirm via browser devtools that a manually-triggered request would carry the header) includes `Authorization: Bearer <token>`.

- [ ] **Step 5: Commit**

```bash
git add source/apps/ikho-ui/src/app/app.config.ts source/apps/ikho-ui/src/app/app.routes.server.ts
git commit -m "feat(ikho-ui): wire AuthService bootstrap, HTTP auth, and client-render protected routes"
```
