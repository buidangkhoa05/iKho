# Frontend login via Clerk (Google OAuth), backed by Ikho.Identity

**Date:** 2026-08-19
**Status:** Approved
**Scope:** Frontend only (`source/apps/ikho-ui`). No backend changes — `Ikho.Identity` and
the gateway's JWT bearer scaffolding already exist and are unaffected by this spec.

## Problem

`ikho-ui` has no login/signup UI, no session state, and no route guards today. Every API
call is still mock-data-only (confirmed: no `HttpClient` usage anywhere in the app). Role
distinctions in the UI (Office vs Operator) come from a local dev-only toggle
(`RoleService`), not real authentication.

The backend half of this is already built and tested: `Ikho.Identity`
(`docs/superpowers/specs/2026-08-16-identity-service-design.md`,
`docs/superpowers/plans/2026-08-16-identity-service-implementation.md`) owns iKho roles and
company membership, synced from Clerk via webhook, with all Clerk-specific logic isolated
behind `IIdentityProvider`. Its own spec explicitly deferred the frontend piece: "No frontend
changes in this plan — `ikho-ui`'s Clerk integration is a separate follow-up plan." This spec
is that follow-up.

**Auth architecture, confirmed with the user:** Clerk hosts the actual login screen and OAuth
handshake (the browser talks to Clerk directly for that — this is inherent to how Clerk's
SDK/hosted-auth model works, not something a custom backend can front without discarding
Clerk's SDK entirely). `Ikho.Identity` is the system of record for roles/company membership
(synced via webhook, already implemented) and the gateway validates every `/api/*` call's JWT
centrally. Nothing about that changes here — this spec only adds the frontend pieces that
were always designed to exist alongside it.

**"Log in with Google," confirmed with the user:** this means Google as one of Clerk's OAuth
connections, surfaced through Clerk's own prebuilt sign-in UI (whatever methods are enabled
in the Clerk dashboard) — not a bespoke Google Identity Services integration.

## Design

### 1. Dependencies & environment config

- New dependency: `@clerk/clerk-js` (Clerk's framework-agnostic core SDK). No official
  Angular package exists, so `AuthService` (Section 2) wraps it directly — consistent with
  the backend spec's "isolate all Clerk-specific code behind one facade" principle.
- New `source/apps/ikho-ui/src/environments/environment.ts` +
  `environment.development.ts`, each exporting `clerkPublishableKey`, wired via Angular's
  standard `fileReplacements` build config (dev instance key for local dev, prod key for the
  real build). The publishable key is safe to ship client-side by Clerk's own design — it is
  not a secret, unlike the backend's Clerk secret key / webhook signing secret, which stay
  server-side in `Ikho.Identity`'s config (already scaffolded as placeholders in its
  `appsettings.json`, out of scope here).

### 2. `AuthService` — the facade

New `source/apps/ikho-ui/src/app/core/auth/auth.service.ts`, following the same pattern
already established by `RoleService`/`LangService`/`ThemeService` in this codebase
(signal-based, `isPlatformBrowser`-guarded, `providedIn: 'root'`):

- `isLoaded: Signal<boolean>` — true once Clerk has finished loading.
- `isSignedIn: Signal<boolean>`
- `currentUser: Signal<{ name: string; email: string; imageUrl: string } | undefined>`
- `getToken(forceRefresh?: boolean): Promise<string | null>` — wraps
  `clerk.session.getToken()`.
- `signOut(): Promise<void>`
- `mountSignIn(el: HTMLElement)` / `mountSignUp(el: HTMLElement)` / matching `unmount*` —
  wrap Clerk's DOM-mounting API so login/signup page components never import Clerk types
  directly.

Initialization happens once via Angular 19's `provideAppInitializer` in `app.config.ts`
(awaits `authService.initialize()` before the app's first navigation runs), guaranteeing
route guards never race against Clerk still loading. On the server (SSR/prerender),
`initialize()` no-ops; `isLoaded` is set `true` and `isSignedIn` stays `false`.

### 3. Login/Signup routes, guards, and rendering mode

New lazy-loaded `source/apps/ikho-ui/src/app/features/auth/` with `/login` and `/signup`
routes, each a small standalone component (`Login`, `Signup`) containing just
`<div #mount></div>` — `ngAfterViewInit` calls `authService.mountSignIn(mountRef.nativeElement)`
(or `mountSignUp`), `ngOnDestroy` unmounts. Clerk renders its full prebuilt UI into that div;
whatever sign-in methods are enabled in the Clerk dashboard (Google, per this conversation)
appear there automatically — no frontend code decides that.

Two guards in `core/auth/`:
- **`authGuard`** — applied to the `office` and `operator` route trees in `app.routes.ts`.
  Redirects to `/login?redirectUrl=<attempted-url>` when `authService.isSignedIn()` is false.
- **`guestGuard`** — applied to `/login` and `/signup`. Redirects to `/office/dashboard` when
  already signed in, so an authenticated user can't land back on the login screen.

**Rendering mode:** `app.routes.server.ts` currently prerenders every route by default
(`RenderMode.Prerender` on the `**` catch-all) except a handful of dynamic-ID operator routes
already set to `RenderMode.Client`. Add explicit `office/**` and `operator/**` entries set to
`RenderMode.Client` (same mechanism, extended) — a build-time prerenderer has no real Clerk
session to check, so these routes must render client-side once they require authentication.
`/login` and `/signup` stay under the `Prerender` catch-all: Clerk's mount is browser-only
anyway (guarded the same way as `AuthService.initialize()`), so prerendering just emits the
empty shell server-side and Clerk mounts after hydration, matching the pattern used
everywhere else in this app.

### 4. HTTP interceptor

New `source/apps/ikho-ui/src/app/core/interceptors/auth.interceptor.ts` — a functional
`HttpInterceptorFn`. Only touches requests whose URL starts with `/api/` (the existing
documented proxy convention); everything else passes through untouched:

1. Calls `authService.getToken()`; clones the request with `Authorization: Bearer <token>` if
   a token exists.
2. On a `401` response, calls `getToken(forceRefresh: true)` once and retries with the fresh
   token.
3. If the retry also `401`s (session genuinely expired/revoked), calls `authService.signOut()`
   and navigates to `/login` rather than leaving the app in a broken half-authenticated state.

This is the first place `provideHttpClient` is added to this app at all — nothing calls it
today (the whole frontend is still mock-data-only). `app.config.ts` gains
`provideHttpClient(withInterceptors([authInterceptor]))` alongside the existing providers.

## Testing

`AuthService` unit-tested with the Clerk SDK mocked (a fake `Clerk`-shaped object injected via
a constructor seam — never a real `@clerk/clerk-js` import in tests). `authGuard`/
`guestGuard`/`authInterceptor` tested directly against `AuthService`'s signals. No real Clerk
network calls anywhere in the vitest suite.

## Out of scope

- **`roleGuard` / replacing the dev-only Role switcher** with real Clerk-derived roles — the
  `AccountMenu` Admin/Operator toggle built in an earlier session keeps working exactly as
  today (a local dev toggle). Wiring it to real Clerk role claims is a deliberate, separate
  follow-up once login itself is proven out.
- **Company switcher UI** for users belonging to multiple companies.
- **Server-side session verification / SSR-aware auth** — explicitly rejected in favor of
  client-side-only auth (Section 3's rendering-mode decision), to avoid introducing
  server-side Clerk session-cookie verification this app has no infrastructure for today.
- **Any `Ikho.Identity` or gateway changes** — both already exist and are unaffected.
- **Provisioning/configuring the Clerk dashboard** (Google OAuth connection, webhook URL
  registration, JWT template for custom claims) — account-level setup on the user's side,
  a prerequisite for running this plan but not part of it. The user confirmed a Clerk project
  already exists; the actual key values (publishable key, secret key, webhook signing secret,
  JWT template Authority/Audience) will be provided before implementation runs.

## Current backend verification (done during this brainstorm, not part of the plan)

`Ikho.Identity` was independently verified before this spec was finalized:
- `dotnet build` succeeds cleanly (0 warnings, 0 errors).
- `dotnet test Ikho.Identity.Tests` — 18/18 passing, covering webhook signature verification,
  `organizationMembership.created` → `CompanyMembership` + default-`Operator`-role sync,
  role-assignment authorization policies, and claims-sync triggering — all against a
  `FakeIdentityProvider`, so no real Clerk connection was needed for this to pass.
- `appsettings.json`'s `Jwt:Authority`/`Jwt:Audience` and `Clerk:SecretKey`/
  `Clerk:WebhookSigningSecret` are still explicit placeholders — the code is correct and
  tested, but no live Clerk project is wired up yet. This confirms the code-level "does the
  webhook handler work" question (yes) is separate from "is a real webhook flowing right now"
  (no, not until real keys are configured).
