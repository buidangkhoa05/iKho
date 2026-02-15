export interface Category {
  id: string
  name: string
  parentId: string | null
  description: string
  imageUrl: string
  status: "active" | "inactive"
  sortOrder: number
  productsCount: number
  level: number
}

export interface CategoryFormData {
  name: string
  parentId: string
  description: string
  imageUrl: string
  status: "active" | "inactive"
  sortOrder: string
}
