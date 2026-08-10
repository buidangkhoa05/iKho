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
  {
    path: '**',
    renderMode: RenderMode.Prerender
  }
];
