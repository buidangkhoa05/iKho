# iKho - Warehouse Management System (Frontend)

A modern warehouse management application built with TanStack Start, React 19, and Tailwind CSS 4.

## Quick Start

```bash
npm install
npm run dev
```

The app will be available at `http://localhost:3000`

## Project Overview

iKho is a warehouse inventory management system with features for:
- **Dashboard** - Overview metrics and statistics
- **Inventory Management** - Products, variants, bundles, reorder points, stock adjustments
- **Category Management** - Hierarchical product categorization with full CRUD operations

---

## Project Structure

```
src/
├── components/
│   ├── ui/                    # Reusable UI components (shadcn/ui style)
│   │   ├── button.tsx
│   │   ├── dialog.tsx         # Centered modal dialogs
│   │   ├── select.tsx         # Dropdown selects
│   │   ├── sheet.tsx          # Slide-in panels
│   │   ├── table.tsx
│   │   ├── textarea.tsx
│   │   └── ...
│   ├── views/                 # Feature view components
│   │   ├── InventoryViews.tsx # Dashboard, Products, Variants, etc.
│   │   └── CategoryViews.tsx  # Category management feature
│   ├── DashboardLayout.tsx    # Main layout wrapper
│   ├── Sidebar.tsx            # Navigation sidebar
│   ├── Header.tsx
│   └── Footer.tsx
├── routes/
│   ├── __root.tsx             # Root layout with Head/Body
│   └── index.tsx              # Main route with view switching
├── store/
│   └── useStore.ts            # Zustand global state
├── lib/
│   └── utils.ts               # Utility functions (cn, etc.)
├── i18n.ts                    # i18next configuration
├── router.tsx                 # TanStack Router setup
└── styles.css                 # Global styles + Tailwind

public/
└── locales/
    ├── en/translation.json    # English translations
    └── vi/translation.json    # Vietnamese translations
```

---

## Architecture Patterns

### View-Based Navigation (Not URL Routing)

The app uses **in-page view switching** rather than URL-based routing for main features:

```tsx
// routes/index.tsx
function Dashboard() {
  const [activeView, setActiveView] = useState('dashboard')

  const renderView = () => {
    switch(activeView) {
      case 'dashboard': return <DashboardView />
      case 'product-list': return <ProductList />
      case 'category-list': return <CategoryList />
      // ...
    }
  }
}
```

**Adding a new view:**
1. Create view component in `components/views/`
2. Add navigation button in `Sidebar.tsx`
3. Add case in `routes/index.tsx` switch statement
4. Add translation keys in both `en/` and `vi/` locales

### UI Components (shadcn/ui Pattern)

All UI components follow the shadcn/ui pattern:
- Use Radix UI primitives under the hood
- Include `data-slot` attributes for styling hooks
- Export individual parts for composition
- Use `cn()` utility for class merging

```tsx
// Example: Using Dialog component
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"

<Dialog open={isOpen} onOpenChange={setIsOpen}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Edit Category</DialogTitle>
    </DialogHeader>
    {/* Form content */}
    <DialogFooter>
      <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
      <Button onClick={handleSave}>Save</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

### State Management

**Local state (useState):** Used for view-specific state like form data, dialog open/close

**Global state (Zustand):** Available in `store/useStore.ts` for cross-component state

```tsx
// Using Zustand store
const { count, increase } = useStore()
```

### Internationalization (i18n)

All user-facing text uses `react-i18next`:

```tsx
import { useTranslation } from "react-i18next"

function MyComponent() {
  const { t } = useTranslation()
  return <h1>{t('categories.title')}</h1>
}
```

**Adding new translations:**
1. Add key to `public/locales/en/translation.json`
2. Add Vietnamese translation to `public/locales/vi/translation.json`

---

## Feature: Category Management

Located in `src/components/views/CategoryViews.tsx`

### Components

| Component | Description |
|-----------|-------------|
| `CategoryList` | Main view with searchable table displaying hierarchical categories |
| `CategoryDialog` | Modal form for creating/editing categories |

### Category Data Structure

```typescript
interface Category {
  id: string
  name: string
  parentId: string | null    // null = root category
  description: string
  imageUrl: string
  status: "active" | "inactive"
  sortOrder: number
  productsCount: number
  level: number              // 0 = root, 1 = child, 2 = grandchild
}
```

### Hierarchy Display

Categories display with visual indentation based on `level`:
- Root categories (level 0): No indent
- Child categories (level 1+): Indented with chevron icon

---

## Sidebar Navigation Structure

```
Overview
├── Dashboard

Inventory
├── Products
├── Product Variants
├── Product Bundles
├── Reorder
└── Stock Adjustment

Settings
└── Categories          ← NEW
```

---

## Available UI Components

| Component | File | Usage |
|-----------|------|-------|
| Button | `ui/button.tsx` | Buttons with variants: default, destructive, outline, secondary, ghost, link |
| Dialog | `ui/dialog.tsx` | Centered modal dialogs |
| Select | `ui/select.tsx` | Dropdown select inputs |
| Sheet | `ui/sheet.tsx` | Slide-in side panels |
| Table | `ui/table.tsx` | Data tables |
| Input | `ui/input.tsx` | Text inputs |
| Textarea | `ui/textarea.tsx` | Multiline text inputs |
| Label | `ui/label.tsx` | Form labels |
| Badge | `ui/badge.tsx` | Status badges |
| Card | `ui/card.tsx` | Card containers |

---

## Styling Guidelines

Refer to `TECH_STACK.md` for the mandatory color palette:

| Color | Hex | Usage |
|-------|-----|-------|
| Primary | `#F0EFEB` | Main background surfaces |
| Secondary | `#1D3557` | CTAs, high-contrast text, navigation |

Use Tailwind CSS utility classes. Prefer standard spacing: `p-4`, `m-4`, `gap-4`

---

## Scripts

```bash
npm run dev      # Start development server (port 3000)
npm run build    # Production build
npm run test     # Run Vitest tests
```

---

## Routing

This project uses [TanStack Router](https://tanstack.com/router) with file-based routing. Routes are managed as files in `src/routes`.

### Adding A New URL Route

Add a new file in `./src/routes` directory. TanStack will auto-generate the route tree.

### Server Functions

```tsx
import { createServerFn } from '@tanstack/react-start'

const getServerTime = createServerFn({
  method: 'GET',
}).handler(async () => {
  return new Date().toISOString()
})
```

### Data Fetching with Loaders

```tsx
export const Route = createFileRoute('/people')({
  loader: async () => {
    const response = await fetch('https://swapi.dev/api/people')
    return response.json()
  },
  component: PeopleComponent,
})

function PeopleComponent() {
  const data = Route.useLoaderData()
  return <ul>{data.results.map((p) => <li key={p.name}>{p.name}</li>)}</ul>
}
```

---

## Learn More

- [TanStack Documentation](https://tanstack.com)
- [TanStack Start](https://tanstack.com/start)
- [TanStack Router](https://tanstack.com/router)
- [Tailwind CSS](https://tailwindcss.com/)
- [Zustand](https://zustand-demo.pmnd.rs/)
- [react-i18next](https://react.i18next.com/)
