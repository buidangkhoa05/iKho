import { InjectionToken } from '@angular/core';
import type { Clerk } from '@clerk/clerk-js';

/** Seam for tests: override this token to inject a fake Clerk-shaped object instead of the real SDK.
 *  Dynamic import keeps @clerk/clerk-js out of the eagerly-loaded main bundle. */
export const CLERK_FACTORY = new InjectionToken<(publishableKey: string) => Promise<Clerk>>('CLERK_FACTORY', {
  providedIn: 'root',
  factory: () => async (publishableKey: string) => {
    const { Clerk } = await import('@clerk/clerk-js');
    return new Clerk(publishableKey);
  },
});
