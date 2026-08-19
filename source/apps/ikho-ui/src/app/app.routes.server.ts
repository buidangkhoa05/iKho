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
