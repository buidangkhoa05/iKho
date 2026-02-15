export interface Product {
  id: string
  name: string
  category: string
  variants?: number
  variantColor?: string
  stockType: "serialized" | "stocked" | "consumable"
  stock: number
  isLowStock: boolean
  retailPrice: string
  wholesalePrice: string
  image: string
}

export interface ProductFiltersState {
  searchQuery: string
  activeStatus: string
  productType: string
  sortBy: string
  stockAlert: string
  category: string
  minPrice: string
  maxPrice: string
}

export interface StatusCounts {
  all: number
  active: number
  inactive: number
  draft: number
}
