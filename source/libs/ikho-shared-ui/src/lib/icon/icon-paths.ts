// Minimal inline stand-ins for the Lucide icon set used by the iKho UI (24x24, stroke-based).
// No npm icon dependency, and no innerHTML: keeps the shared-ui lib dependency-free and SSR-safe
// (Angular's server-side DOM shim does not implement setProperty('innerHTML', ...)).
export type IconElement =
  | { tag: 'path'; d: string }
  | { tag: 'circle'; cx: number; cy: number; r: number }
  | { tag: 'line'; x1: number; y1: number; x2: number; y2: number }
  | { tag: 'rect'; x: number; y: number; width: number; height: number; rx?: number }
  | { tag: 'polyline'; points: string };

const path = (d: string): IconElement => ({ tag: 'path', d });
const circle = (cx: number, cy: number, r: number): IconElement => ({ tag: 'circle', cx, cy, r });
const line = (x1: number, y1: number, x2: number, y2: number): IconElement => ({ tag: 'line', x1, y1, x2, y2 });
const rect = (x: number, y: number, width: number, height: number, rx?: number): IconElement => ({
  tag: 'rect',
  x,
  y,
  width,
  height,
  rx,
});
const polyline = (points: string): IconElement => ({ tag: 'polyline', points });

export const ICONS: Record<string, IconElement[]> = {
  'layout-dashboard': [rect(3, 3, 7, 9, 1), rect(14, 3, 7, 5, 1), rect(14, 12, 7, 9, 1), rect(3, 16, 7, 5, 1)],
  'building-2': [
    path('M6 22V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v18Z'),
    path('M10 22v-4h4v4'),
    line(6, 9, 10, 9),
    line(6, 13, 10, 13),
    line(14, 9, 18, 9),
    line(14, 13, 18, 13),
  ],
  package: [
    path('M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z'),
    path('m3.3 7 8.7 5 8.7-5'),
    line(12, 22, 12, 12),
  ],
  users: [
    path('M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2'),
    circle(9, 7, 4),
    path('M22 21v-2a4 4 0 0 0-3-3.87'),
    path('M16 3.13a4 4 0 0 1 0 7.75'),
  ],
  boxes: [
    path('M2.97 12.92 8 15.5v5.62l-5.03-2.58A1 1 0 0 1 2.5 17.6v-3.8a1 1 0 0 1 .47-.88Z'),
    path('M8 15.5 13.03 12.92a1 1 0 0 1 .94 0L19 15.5'),
    path('M8 21.12V15.5l5-2.58 5 2.58v5.62'),
    path('M13.03 3.92 8 6.5l5.03 2.58 5.03-2.58Z'),
    line(8, 6.5, 8, 12.12),
    line(18.06, 6.5, 18.06, 12.12),
  ],
  truck: [
    path('M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2'),
    line(9, 18, 15, 18),
    path('M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14v10'),
    circle(7, 18, 2),
    circle(17, 18, 2),
  ],
  'package-check': [
    path('M5 7 12 3l7 4'),
    path('M5 7v10l7 4 7-4V7'),
    path('M5 7 12 11l7-4'),
    line(12, 11, 12, 21),
    polyline('16.5 15 18 16.5 21 13.5'),
  ],
  'undo-2': [path('M9 14 4 9l5-5'), path('M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5v0a5.5 5.5 0 0 1-5.5 5.5H11')],
  'receipt-text': [
    path('M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z'),
    line(8, 7, 16, 7),
    line(8, 11, 16, 11),
    line(8, 15, 13, 15),
  ],
  'chart-line': [path('M3 3v18h18'), polyline('19 9 14 14 10 10 7 13')],
  x: [line(18, 6, 6, 18), line(6, 6, 18, 18)],
  'chevron-right': [polyline('9 18 15 12 9 6')],
  check: [polyline('20 6 9 17 4 12')],
  search: [circle(11, 11, 7), line(21, 21, 16.65, 16.65)],
  'chevron-down': [polyline('6 9 12 15 18 9')],
  bell: [path('M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9'), path('M10.3 21a1.94 1.94 0 0 0 3.4 0')],
  menu: [line(3, 6, 21, 6), line(3, 12, 21, 12), line(3, 18, 21, 18)],
  settings: [
    circle(12, 12, 3),
    path(
      'M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z',
    ),
  ],
};
