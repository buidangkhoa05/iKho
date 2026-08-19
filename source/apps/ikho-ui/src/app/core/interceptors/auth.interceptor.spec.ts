import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router, provideRouter } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { authInterceptor } from './auth.interceptor';
import { AuthService } from '../auth/auth.service';

// A minimal placeholder so `router.navigateByUrl('/login')` (fired by the interceptor on a
// non-recoverable 401) resolves against a real route instead of rejecting with NG04002.
@Component({ selector: 'app-test-empty', template: '' })
class EmptyTestComponent {}

describe('authInterceptor', () => {
  let httpMock: HttpTestingController;
  let httpClient: HttpClient;
  let router: Router;
  let getTokenCalls: (boolean | undefined)[];
  let signOutCalls: number;

  /**
   * The interceptor kicks off with `from(auth.getToken())`, so every request it handles
   * needs at least one microtask tick before it reaches the testing backend. A `setTimeout`
   * flush (rather than a bare `await Promise.resolve()`) guarantees all pending microtasks —
   * including any chained inside the interceptor's `switchMap`s — have drained first.
   */
  function flushPromises(): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, 0));
  }

  function setup(tokenResponses: (string | null)[]): void {
    getTokenCalls = [];
    signOutCalls = 0;
    let call = 0;
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        provideRouter([{ path: 'login', component: EmptyTestComponent }]),
        {
          provide: AuthService,
          useValue: {
            getToken: (forceRefresh?: boolean) => {
              getTokenCalls.push(forceRefresh);
              return Promise.resolve(tokenResponses[call++] ?? null);
            },
            signOut: () => {
              signOutCalls++;
              return Promise.resolve();
            },
          } as unknown as AuthService,
        },
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
    httpClient = TestBed.inject(HttpClient);
    router = TestBed.inject(Router);
  }

  afterEach(() => httpMock.verify());

  it('should not attach a header for non-/api/ requests', () => {
    setup(['some-token']);
    httpClient.get('/assets/foo.json').subscribe();
    const req = httpMock.expectOne('/assets/foo.json');
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({});
  });

  it('should attach the bearer token for /api/ requests', async () => {
    setup(['my-token']);
    httpClient.get('/api/warehouses').subscribe();
    await flushPromises();
    const req = httpMock.expectOne('/api/warehouses');
    expect(req.request.headers.get('Authorization')).toBe('Bearer my-token');
    req.flush({});
  });

  it('should retry once with a refreshed token on a 401', async () => {
    setup(['stale-token', 'fresh-token']);
    httpClient.get('/api/warehouses').subscribe();
    await flushPromises();

    const firstReq = httpMock.expectOne('/api/warehouses');
    expect(firstReq.request.headers.get('Authorization')).toBe('Bearer stale-token');
    firstReq.flush('unauthorized', { status: 401, statusText: 'Unauthorized' });
    await flushPromises();

    const retryReq = httpMock.expectOne('/api/warehouses');
    expect(retryReq.request.headers.get('Authorization')).toBe('Bearer fresh-token');
    expect(getTokenCalls).toEqual([undefined, true]);
    retryReq.flush({});
  });

  it('should propagate the error when no fresh token is available', async () => {
    setup(['stale-token', null]);
    const result = firstValueFrom(httpClient.get('/api/warehouses'));
    await flushPromises();

    const firstReq = httpMock.expectOne('/api/warehouses');
    firstReq.flush('unauthorized', { status: 401, statusText: 'Unauthorized' });

    await expect(result).rejects.toMatchObject({ status: 401 });
    // Let the fire-and-forget signOut()/navigateByUrl() chain settle before the test ends.
    await flushPromises();
    expect(signOutCalls).toBe(1);
  });

  it('should sign out and redirect to /login when the retried request itself 401s again', async () => {
    setup(['stale-token', 'fresh-token']);
    const navigateSpy = vi.spyOn(router, 'navigateByUrl');
    const result = firstValueFrom(httpClient.get('/api/warehouses'));
    await flushPromises();

    const firstReq = httpMock.expectOne('/api/warehouses');
    firstReq.flush('unauthorized', { status: 401, statusText: 'Unauthorized' });
    await flushPromises();

    const retryReq = httpMock.expectOne('/api/warehouses');
    expect(retryReq.request.headers.get('Authorization')).toBe('Bearer fresh-token');
    retryReq.flush('unauthorized', { status: 401, statusText: 'Unauthorized' });

    await expect(result).rejects.toMatchObject({ status: 401 });
    // Let the fire-and-forget signOut()/navigateByUrl() chain settle before the test ends.
    await flushPromises();
    expect(signOutCalls).toBe(1);
    expect(navigateSpy).toHaveBeenCalledWith('/login');
  });
});
