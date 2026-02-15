# Frontend app — brief

Location: `source/apps/fe`

## Purpose
Lightweight SPA UI for the iKho monorepo. Built with TanStack Start (file-based routing) and Vite — intended as the primary web frontend for demos and local development.

## Tech stack
- React + TypeScript (React 19)
- Vite (dev / build)
- TanStack Router / Start (file-based routing + server functions)
- Tailwind CSS for styling
- Zustand for global state
- i18next for i18n
- Vitest for unit tests

## Quick start
- Install: `npm install` (run inside `source/apps/fe`)
- Dev: `npm run dev` (Vite → port 3000)
- Build: `npm run build`
- Preview: `npm run preview`
- Test: `npm run test` (Vitest)

## Key files
- `src/routes/` — file-based routes (add new route files here)
- `src/routes/__root.tsx` — root layout / shell
- `src/components/` — UI components (Header, Sidebar, ThemeProvider, etc.)
- `src/components/ui/` — UI primitives
- `src/store/useStore.ts` — Zustand store
- `src/lib/utils.ts` — utilities
- `public/locales/*` — translations (en, vi)
- `vite.config.ts`, `package.json`, `tsconfig.json` — configuration & scripts

## Conventions
- Commit scope: `source(fe): <short-description>`
- Add routes under `src/routes/` and follow existing route/component patterns
- Add unit tests (Vitest) when changing behavior
- Keep changes small and focused; prefer one feature per commit

## Notes / gotchas
- `source/apps/fe/.git.backup` contains the original nested repo metadata (kept as a backup when the folder was absorbed into the monorepo)
- Demo files under `src/routes/demo/` can be removed safely
- Consider adding CI to run `npm run test` and `npm run build`

---
(Generated automatically from repository source structure)
