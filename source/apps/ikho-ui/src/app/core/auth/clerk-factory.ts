import { InjectionToken } from '@angular/core';
import { Clerk } from '@clerk/clerk-js';

/** Seam for tests: override this token to inject a fake Clerk-shaped object instead of the real SDK. */
export const CLERK_FACTORY = new InjectionToken<(publishableKey: string) => Clerk>('CLERK_FACTORY', {
  providedIn: 'root',
  factory: () => (publishableKey: string) => new Clerk(publishableKey),
});
