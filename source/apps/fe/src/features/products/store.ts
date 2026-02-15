import { create } from "zustand"
import type { ProductFiltersState } from "./types"

interface ProductStore {
  filters: ProductFiltersState
  viewMode: "list" | "grid"
  setFilter: <K extends keyof ProductFiltersState>(key: K, value: ProductFiltersState[K]) => void
  setViewMode: (mode: "list" | "grid") => void
  resetFilters: () => void
}

const initialFilters: ProductFiltersState = {
  searchQuery: "",
  activeStatus: "all",
  productType: "retail",
  sortBy: "a-z",
  stockAlert: "",
  category: "",
  minPrice: "",
  maxPrice: "",
}

export const useProductStore = create<ProductStore>((set) => ({
  filters: initialFilters,
  viewMode: "list",
  setFilter: (key, value) =>
    set((state) => ({
      filters: { ...state.filters, [key]: value },
    })),
  setViewMode: (mode) => set({ viewMode: mode }),
  resetFilters: () => set({ filters: initialFilters }),
}))
