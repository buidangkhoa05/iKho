# iKho - Warehouse Management System (Frontend)

A modern warehouse management application built with TanStack Start, React 19, and Tailwind CSS 4, following **Vertical Slice Architecture**.

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

## Project Structure (Vertical Slice Architecture)

```
src/
├── features/                    # Feature slices (domain-driven)
│   ├── products/                # Products feature
│   │   ├── components/          # Feature-specific components
│   │   │   ├── ProductList.tsx
│   │   │   ├── ProductTable.tsx
│   │   │   └── ProductFilters.tsx
│   │   ├── types.ts             # Feature types/interfaces
│   │   ├── mockData.ts          # Mock data for development
│   │   ├── store.ts             # Feature-scoped Zustand store
│   │   └── index.ts             # Barrel export
│   ├── categories/              # Categories feature
│   │   ├── components/
│   │   │   ├── CategoryList.tsx
│   │   │   ├── CategoryTable.tsx
│   │   │   └── CategoryDialog.tsx
│   │   ├── types.ts
│   │   ├── mockData.ts
│   │   ├── store.ts
│   │   └── index.ts
│   ├── dashboard/               # Dashboard feature
│   ├── variants/                # Product variants feature
│   ├── bundles/                 # Product bundles feature
│   ├── reorder/                 # Reorder management feature
│   ├── stock-adjustment/        # Stock adjustment feature
│   └── index.ts                 # Features barrel export
├── shared/                      # Shared layer
│   ├── components/              # Reusable UI components (shadcn/ui)
│   │   ├── button.tsx
│   │   ├── dialog.tsx
│   │   ├── input.tsx
│   │   ├── select.tsx
│   │   ├── table.tsx
│   │   └── index.ts
│   ├── layouts/                 # Layout components
│   │   ├── DashboardLayout.tsx
│   │   ├── Header.tsx
│   │   ├── Footer.tsx
│   │   ├── Sidebar.tsx
│   │   ├── ThemeProvider.tsx
│   │   ├── LanguageToggle.tsx
│   │   └── index.ts
│   └── index.ts
├── core/                        # Core types and utilities
│   ├── types.ts                 # Base entity types, pagination, etc.
│   └── index.ts
├── services/                    # API and external services
│   ├── api.ts                   # API client
│   └── index.ts
├── routes/                      # TanStack Router routes (URL-based)
│   ├── __root.tsx               # Root layout
│   ├── index.tsx                # Dashboard (/)
│   ├── products.tsx             # Products (/products)
│   ├── categories.tsx           # Categories (/categories)
│   ├── variants.tsx             # Variants (/variants)
│   ├── bundles.tsx              # Bundles (/bundles)
│   ├── reorder.tsx              # Reorder (/reorder)
│   └── stock-adjustment.tsx     # Stock Adjustment (/stock-adjustment)
├── lib/
│   └── utils.ts                 # Utility functions (cn, etc.)
├── i18n.ts                      # i18next configuration
├── router.tsx                   # TanStack Router setup
├── routeTree.gen.ts             # Auto-generated route tree
└── styles.css                   # Global styles + Tailwind

public/
└── locales/
    ├── en/translation.json      # English translations
    └── vi/translation.json      # Vietnamese translations
```

---

## Architecture Patterns

### Vertical Slice Architecture

The app follows **Vertical Slice Architecture** where code is organized by **feature** rather than technical layer:

```
features/
├── products/          # Everything related to products
├── categories/        # Everything related to categories
└── dashboard/         # Everything related to dashboard
```

Each feature slice contains:
- `components/` - React components specific to this feature
- `types.ts` - TypeScript interfaces and types
- `store.ts` - Feature-scoped Zustand store
- `mockData.ts` - Mock data for development
- `index.ts` - Barrel export for clean imports

### URL-Based Routing

The app uses **URL-based routing** with TanStack Router:

| Route | Feature |
|-------|---------|
| `/` | Dashboard |
| `/products` | Products management |
| `/categories` | Category management |
| `/variants` | Product variants |
| `/bundles` | Product bundles |
| `/reorder` | Reorder management |
| `/stock-adjustment` | Stock adjustments |

**Adding a new feature:**
1. Create feature folder in `src/features/newfeature/`
2. Add components, types, store, and index.ts
3. Create route file in `src/routes/newfeature.tsx`
4. Add navigation link in `src/shared/layouts/Sidebar.tsx`
5. Add translation keys in `public/locales/`

### Path Aliases

The project uses TypeScript path aliases for clean imports:

```tsx
// Feature imports
import { ProductList, useProductStore } from "@/features/products"

// Shared UI components
import { Button, Input, Table } from "@/shared/components"

// Layouts
import { DashboardLayout, Header } from "@/shared/layouts"

// Core types
import { BaseEntity, PaginationParams } from "@/core"

// Services
import { apiClient } from "@/services"
```

### Feature-Scoped State (Zustand)

Each feature has its own Zustand store for isolated state management:

```tsx
// src/features/products/store.ts
import { create } from "zustand"

interface ProductStore {
  filters: ProductFilters
  viewMode: "list" | "grid"
  setFilter: (key: string, value: string) => void
  setViewMode: (mode: "list" | "grid") => void
  resetFilters: () => void
}

export const useProductStore = create<ProductStore>((set) => ({
  filters: initialFilters,
  viewMode: "list",
  setFilter: (key, value) => set((state) => ({
    filters: { ...state.filters, [key]: value }
  })),
  setViewMode: (mode) => set({ viewMode: mode }),
  resetFilters: () => set({ filters: initialFilters }),
}))
```

Usage in components:
```tsx
import { useProductStore } from "@/features/products"

function ProductList() {
  const { filters, setFilter, viewMode } = useProductStore()
  // ...
}
```

### UI Components (shadcn/ui Pattern)

All UI components follow the shadcn/ui pattern and are located in `src/shared/components/`:

```tsx
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/shared/components"

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

## Feature: Products

Located in `src/features/products/`

### Components

| Component | Description |
|-----------|-------------|
| `ProductList` | Main view with filters and product table |
| `ProductTable` | Data table displaying products |
| `ProductFilters` | Filter controls (search, status, category) |

### Product Data Structure

```typescript
interface Product {
  id: string
  name: string
  sku: string
  description: string
  categoryId: string
  price: number
  costPrice: number
  quantity: number
  minQuantity: number
  status: "in_stock" | "low_stock" | "out_of_stock"
  imageUrl: string
  createdAt: Date
  updatedAt: Date
}
```

---

## Feature: Categories

Located in `src/features/categories/`

### Components

| Component | Description |
|-----------|-------------|
| `CategoryList` | Main view with searchable table |
| `CategoryTable` | Data table with hierarchy display |
| `CategoryDialog` | Modal form for create/edit |

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
├── Dashboard           → /

Inventory
├── Products            → /products
├── Product Variants    → /variants
├── Product Bundles     → /bundles
├── Reorder             → /reorder
└── Stock Adjustment    → /stock-adjustment

Settings
└── Categories          → /categories
```

---

## Available UI Components

| Component | File | Usage |
|-----------|------|-------|
| Button | `shared/components/button.tsx` | Buttons with variants |
| Dialog | `shared/components/dialog.tsx` | Centered modal dialogs |
| Select | `shared/components/select.tsx` | Dropdown select inputs |
| Table | `shared/components/table.tsx` | Data tables |
| Input | `shared/components/input.tsx` | Text inputs |
| Textarea | `shared/components/textarea.tsx` | Multiline text inputs |
| Label | `shared/components/label.tsx` | Form labels |
| Badge | `shared/components/badge.tsx` | Status badges |
| DropdownMenu | `shared/components/dropdown-menu.tsx` | Context menus |

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

This project uses [TanStack Router](https://tanstack.com/router) with file-based routing. Routes are auto-generated in `src/routeTree.gen.ts`.

### Adding A New Feature Route

1. Create route file in `src/routes/newfeature.tsx`:

```tsx
import { createFileRoute } from "@tanstack/react-router"
import { DashboardLayout } from "@/shared/layouts"
import { NewFeatureList } from "@/features/newfeature"

export const Route = createFileRoute('/newfeature')({
  component: NewFeaturePage,
})

function NewFeaturePage() {
  return (
    <DashboardLayout>
      <NewFeatureList />
    </DashboardLayout>
  )
}
```

2. TanStack Router will auto-generate the route tree on save

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
export const Route = createFileRoute('/products')({
  loader: async () => {
    const response = await fetch('/api/products')
    return response.json()
  },
  component: ProductsPage,
})

function ProductsPage() {
  const data = Route.useLoaderData()
  return <ProductList products={data} />
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
- [Vertical Slice Architecture](https://dev.to/fpaghar/folder-structuring-techniques-for-beginner-to-advanced-react-projects-30d7)
