# Project Tech Stack

Use this list as a system prompt or context for future chat sessions to ensure the AI assistant understands the technologies used in this project.

---

## Core Frameworks & Libraries
- **Runtime**: Node.js
- **Language**: TypeScript
- **Frontend Framework**: React 19
- **Full-Stack Framework**: TanStack Start
- **Routing**: TanStack Router
- **Build Tool**: Vite 7
- **Server Engine**: Nitro (via TanStack Start)

## State Management
- **Global State**: Zustand

## Styling & UI
- **CSS Framework**: Tailwind CSS 4
- **Icons**: Lucide React

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
