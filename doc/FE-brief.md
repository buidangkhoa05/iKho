# Frontend app — brief

Location: `source/apps/admin-fe`

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
- **Nx** for monorepo task orchestration and caching

## Quick start
- Install: `pnpm install` (run from `source/` workspace root)
- Dev: `pnpm nx dev admin-fe` or `pnpm dev` (Vite → port 3000)
- Build: `pnpm nx build admin-fe` or `pnpm build`
- Preview: `pnpm nx preview admin-fe`
- Test: `pnpm nx test admin-fe` or `pnpm test` (Vitest)
- Graph: `pnpm nx graph` — visualize workspace project graph

## Key files
- `src/routes/` — file-based routes (add new route files here)
- `src/routes/__root.tsx` — root layout / shell
- `src/features/` — feature modules (Vertical Slice Architecture)
- `src/shared/components/` — shadcn/ui components
- `src/shared/layouts/` — layout components (Header, Sidebar, ThemeProvider, etc.)
- `src/core/` — shared types and base entities
- `src/services/` — API client
- `src/lib/utils.ts` — utilities
- `public/locales/*` — translations (en, vi)
- `vite.config.ts`, `package.json`, `tsconfig.json` — configuration & scripts

## Conventions
- Commit scope: `source(admin-fe): <short-description>`
- Add routes under `src/routes/` and follow existing route/component patterns
- Add unit tests (Vitest) when changing behavior
- Keep changes small and focused; prefer one feature per commit
- Run tasks through Nx for caching benefits: `pnpm nx <target> admin-fe`

## Notes / gotchas
- Demo files under `src/routes/demo/` can be removed safely
- CI should run `pnpm nx affected -t test build` to only build/test changed projects

---
(Generated automatically from repository source structure)
