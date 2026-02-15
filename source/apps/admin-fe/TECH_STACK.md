# Project Tech Stack

Use this list as a system prompt or context for future chat sessions to ensure the AI assistant understands the technologies used in this project.

---

## Core Frameworks & Libraries
- **Runtime**: Node.js
- **Language**: TypeScript
- **Frontend Framework**: React 19
- **Full-Stack Framework**: TanStack Start
- **Routing**: TanStack Router (URL-based file routing)
- **Build Tool**: Vite 7
- **Server Engine**: Nitro (via TanStack Start)

## Architecture
- **Pattern**: Vertical Slice Architecture
- **Organization**: Feature-based folder structure
- **Routing**: URL-based with TanStack Router file conventions

## State Management
- **Feature State**: Zustand (feature-scoped stores per slice)
- **Pattern**: Each feature has its own store in `features/<name>/store.ts`

## Styling & UI
- **CSS Framework**: Tailwind CSS 4
- **Icons**: Lucide React
- **UI Components**: shadcn/ui pattern (Radix UI primitives)
- **Internationalization**: react-i18next with JSON locale files

## Project Structure

```
src/
├── features/           # Feature slices (domain-driven)
│   ├── products/       # Product management
│   ├── categories/     # Category management
│   ├── dashboard/      # Dashboard overview
│   ├── variants/       # Product variants
│   ├── bundles/        # Product bundles
│   ├── reorder/        # Reorder management
│   └── stock-adjustment/
├── shared/             # Shared layer
│   ├── components/     # UI components (shadcn/ui)
│   └── layouts/        # Layout components
├── core/               # Core types and utilities
├── services/           # API and external services
├── routes/             # TanStack Router routes
└── lib/                # Utility functions
```

## Path Aliases
```json
{
  "@/features/*": "src/features/*",
  "@/shared/*": "src/shared/*",
  "@/core/*": "src/core/*",
  "@/services/*": "src/services/*",
  "@/lib/*": "src/lib/*"
}
```

## UI Component Library
The project uses a shadcn/ui-style component library built on Radix UI primitives:

| Component | Radix Primitive | Location |
|-----------|-----------------|----------|
| Button | - | `shared/components/button.tsx` |
| Dialog | @radix-ui/react-dialog | `shared/components/dialog.tsx` |
| Select | @radix-ui/react-select | `shared/components/select.tsx` |
| DropdownMenu | @radix-ui/react-dropdown-menu | `shared/components/dropdown-menu.tsx` |
| Table | - | `shared/components/table.tsx` |
| Input | - | `shared/components/input.tsx` |
| Textarea | - | `shared/components/textarea.tsx` |
| Label | @radix-ui/react-label | `shared/components/label.tsx` |
| Badge | - | `shared/components/badge.tsx` |

## Testing
- **Unit/Integration**: Vitest
- **Component Testing**: React Testing Library

## Development Tools
- **Linter/Formatter**: (Standard config assumed)
- **DevTools**: TanStack Router Devtools, TanStack Query Devtools (if applicable)

## Key Dependencies List
- `@tanstack/react-start`
- `@tanstack/react-router`
- `zustand`
- `tailwindcss`
- `vite`
- `vitest`
- `react-i18next` / `i18next`
- `@radix-ui/react-dialog`
- `@radix-ui/react-select`
- `@radix-ui/react-dropdown-menu`
- `@radix-ui/react-collapsible`
- `@radix-ui/react-label`
- `lucide-react`

## Design System & Guidelines
### Color Palette (MANDATORY)
The application MUST strictly adhere to the following color palette. Do not use arbitrary hex codes or other colors unless absolutely necessary for semantic meaning (e.g., error/success states).

- **Primary Color**: `#F0EFEB` (Isabelline)
  - Usage: Main background or dominant surface areas.
  - CSS Variable: `--primary`
  - Tailwind Class: `bg-primary`, `text-primary`

- **Secondary Color**: `#1D3557` (Prussian Blue)
  - Usage: Call-to-action buttons, high-contrast text, navigation elements.
  - CSS Variable: `--secondary`
  - Tailwind Class: `bg-secondary`, `text-secondary`

### Typography & Spacing
- Use standard Tailwind styling utilities.
- Maintain consistent padding and margins (e.g., `p-4`, `m-4`, `gap-4`).
