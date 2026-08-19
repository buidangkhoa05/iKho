import { InjectionToken } from '@angular/core';
import type { Clerk } from '@clerk/clerk-js';

interface ClerkUiWindow {
  __internal_ClerkUICtor?: unknown;
}

/**
 * @clerk/clerk-js's npm build ships headless — the prebuilt sign-in/sign-up UI only
 * becomes available once this separate `@clerk/ui` bundle is loaded from Clerk's own CDN
 * (the frontend API host embedded in the publishable key) and passed into `clerk.load()`.
 * Without this, `clerk.mountSignIn()` throws "Clerk was not loaded with Ui components".
 */
function loadClerkUi(frontendApi: string): Promise<unknown> {
  const w = window as unknown as ClerkUiWindow;
  if (w.__internal_ClerkUICtor) {
    return Promise.resolve(w.__internal_ClerkUICtor);
  }
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = `https://${frontendApi}/npm/@clerk/ui@1/dist/ui.browser.js`;
    script.async = true;
    script.crossOrigin = 'anonymous';
    script.onload = () => resolve(w.__internal_ClerkUICtor);
    script.onerror = () => reject(new Error('Failed to load @clerk/ui bundle'));
    document.head.appendChild(script);
  });
}

/** Seam for tests: override this token to inject a fake Clerk-shaped object instead of the real SDK.
 *  Dynamic import keeps @clerk/clerk-js out of the eagerly-loaded main bundle. Returns an
 *  already-`.load()`-ed instance — see loadClerkUi() for why that requires the extra step. */
export const CLERK_FACTORY = new InjectionToken<(publishableKey: string) => Promise<Clerk>>('CLERK_FACTORY', {
  providedIn: 'root',
  factory: () => async (publishableKey: string) => {
    const { Clerk } = await import('@clerk/clerk-js');
    const clerk = new Clerk(publishableKey);
    const ClerkUI = await loadClerkUi(clerk.frontendApi);
    await clerk.load({ ui: { ClerkUI } } as Parameters<Clerk['load']>[0]);
    return clerk;
  },
});
