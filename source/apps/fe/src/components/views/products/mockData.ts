import type { Product, StatusCounts } from "./types"

export const mockProducts: Product[] = [
  {
    id: "1",
    name: "Adidas NEO Light Green 36",
    category: "Man Shoes",
    stockType: "stocked",
    stock: 12,
    isLowStock: true,
    retailPrice: "$280.00",
    wholesalePrice: "$300.00",
    image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=80&h=80&fit=crop"
  },
  {
    id: "2",
    name: "Adidas SAMBA Salsa 39",
    category: "Man Shoes",
    stockType: "serialized",
    stock: 120,
    isLowStock: false,
    retailPrice: "$250.00",
    wholesalePrice: "$280.00",
    image: "https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=80&h=80&fit=crop"
  },
  {
    id: "3",
    name: "Adidas ULTRABOOST 1.0 DNA Running Speed",
    category: "Man Shoes",
    variants: 6,
    variantColor: "emerald",
    stockType: "serialized",
    stock: 20,
    isLowStock: false,
    retailPrice: "$180.00-$220.00",
    wholesalePrice: "$100.00-$170.00",
    image: "https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=80&h=80&fit=crop"
  },
  {
    id: "4",
    name: "Adidas ADICOLOR SST TRACK JACKET",
    category: "Man Shoes",
    variants: 2,
    variantColor: "rose",
    stockType: "stocked",
    stock: 120,
    isLowStock: false,
    retailPrice: "$180.00-$220.00",
    wholesalePrice: "$100.00-$170.00",
    image: "https://images.unsplash.com/photo-1551028719-00167b16eac5?w=80&h=80&fit=crop"
  },
  {
    id: "5",
    name: "Adidas LOGO FULL-ZIP HOODIE Red",
    category: "Women Clothes",
    stockType: "serialized",
    stock: 0,
    isLowStock: false,
    retailPrice: "$180.00",
    wholesalePrice: "$200.00",
    image: "https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=80&h=80&fit=crop"
  },
  {
    id: "6",
    name: "Adidas HEAT.RDY SPORT SHORTS",
    category: "Man Shoes",
    stockType: "consumable",
    stock: 20,
    isLowStock: true,
    retailPrice: "$220.00",
    wholesalePrice: "$300.00",
    image: "https://images.unsplash.com/photo-1591195853828-11db59a44f6b?w=80&h=80&fit=crop"
  },
  {
    id: "7",
    name: "Adidas Superstar Shoes",
    category: "Man Shoes",
    stockType: "serialized",
    stock: 120,
    isLowStock: false,
    retailPrice: "$130.00",
    wholesalePrice: "$280.00",
    image: "https://images.unsplash.com/photo-1600269452121-4f2416e55c28?w=80&h=80&fit=crop"
  },
]

export const statusCounts: StatusCounts = {
  all: 1708,
  active: 1232,
  inactive: 250,
  draft: 36
}
