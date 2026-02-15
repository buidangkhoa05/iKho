import { useState } from "react"
import { ProductFilters } from "./ProductFilters"
import { ProductHeader } from "./ProductHeader"
import { ProductTable } from "./ProductTable"
import { mockProducts, statusCounts } from "./mockData"

export function ProductList() {
  const [searchQuery, setSearchQuery] = useState("")
  const [activeStatus, setActiveStatus] = useState("all")
  const [productType, setProductType] = useState("retail")
  const [sortBy, setSortBy] = useState("a-z")
  const [viewMode, setViewMode] = useState<"list" | "grid">("list")
  const [minPrice, setMinPrice] = useState("")
  const [maxPrice, setMaxPrice] = useState("")

  const handleResetFilters = () => {
    setActiveStatus("all")
    setProductType("retail")
    setSortBy("a-z")
    setMinPrice("")
    setMaxPrice("")
  }

  return (
    <div className="flex gap-6">
      {/* Left Sidebar Filters */}
      <ProductFilters
        activeStatus={activeStatus}
        onStatusChange={setActiveStatus}
        productType={productType}
        onProductTypeChange={setProductType}
        sortBy={sortBy}
        onSortByChange={setSortBy}
        minPrice={minPrice}
        onMinPriceChange={setMinPrice}
        maxPrice={maxPrice}
        onMaxPriceChange={setMaxPrice}
        onResetFilters={handleResetFilters}
        statusCounts={statusCounts}
      />

      {/* Main Content */}
      <div className="flex-1 space-y-4">
        <ProductHeader
          totalProducts={statusCounts.all}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
        />
        <ProductTable products={mockProducts} />
      </div>
    </div>
  )
}
