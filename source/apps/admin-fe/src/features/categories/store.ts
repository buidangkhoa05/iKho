import { create } from "zustand"
import type { Category } from "./types"

interface CategoryStore {
  searchQuery: string
  dialogOpen: boolean
  selectedCategory: Category | null
  setSearchQuery: (query: string) => void
  setDialogOpen: (open: boolean) => void
  setSelectedCategory: (category: Category | null) => void
  openAddDialog: () => void
  openEditDialog: (category: Category) => void
  closeDialog: () => void
}

export const useCategoryStore = create<CategoryStore>((set) => ({
  searchQuery: "",
  dialogOpen: false,
  selectedCategory: null,
  setSearchQuery: (query) => set({ searchQuery: query }),
  setDialogOpen: (open) => set({ dialogOpen: open }),
  setSelectedCategory: (category) => set({ selectedCategory: category }),
  openAddDialog: () => set({ selectedCategory: null, dialogOpen: true }),
  openEditDialog: (category) => set({ selectedCategory: category, dialogOpen: true }),
  closeDialog: () => set({ dialogOpen: false }),
}))
