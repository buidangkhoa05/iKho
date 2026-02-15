import { ProductFilters } from "./ProductFilters"
import { ProductHeader } from "./ProductHeader"
import { ProductTable } from "./ProductTable"
import { mockProducts, statusCounts } from "../mockData"
import { useProductStore } from "../store"

export function ProductList() {
  const { filters, viewMode, setFilter, setViewMode, resetFilters } = useProductStore()

  return (
    <div className="flex gap-6">
      {/* Left Sidebar Filters */}
      <ProductFilters
        activeStatus={filters.activeStatus}
        onStatusChange={(status) => setFilter("activeStatus", status)}
        productType={filters.productType}
        onProductTypeChange={(type) => setFilter("productType", type)}
        sortBy={filters.sortBy}
        onSortByChange={(sort) => setFilter("sortBy", sort)}
        minPrice={filters.minPrice}
        onMinPriceChange={(price) => setFilter("minPrice", price)}
        maxPrice={filters.maxPrice}
        onMaxPriceChange={(price) => setFilter("maxPrice", price)}
        onResetFilters={resetFilters}
        statusCounts={statusCounts}
      />

      {/* Main Content */}
      <div className="flex-1 space-y-4">
        <ProductHeader
          totalProducts={statusCounts.all}
          searchQuery={filters.searchQuery}
          onSearchChange={(query) => setFilter("searchQuery", query)}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
        />
        <ProductTable products={mockProducts} />
      </div>
    </div>
  )
}
