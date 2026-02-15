import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { RotateCcw, DollarSign, Package } from "lucide-react"
import { useTranslation } from "react-i18next"
import type { StatusCounts } from "./types"

interface ProductFiltersProps {
  activeStatus: string
  onStatusChange: (status: string) => void
  productType: string
  onProductTypeChange: (type: string) => void
  sortBy: string
  onSortByChange: (sort: string) => void
  minPrice: string
  onMinPriceChange: (price: string) => void
  maxPrice: string
  onMaxPriceChange: (price: string) => void
  onResetFilters: () => void
  statusCounts: StatusCounts
}

export function ProductFilters({
  activeStatus,
  onStatusChange,
  productType,
  onProductTypeChange,
  sortBy,
  onSortByChange,
  minPrice,
  onMinPriceChange,
  maxPrice,
  onMaxPriceChange,
  onResetFilters,
  statusCounts,
}: ProductFiltersProps) {
  const { t } = useTranslation()

  return (
    <div className="w-56 shrink-0 space-y-6">
      {/* Product Status */}
      <div className="space-y-3">
        <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          {t('products.product_status')}
        </Label>
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant={activeStatus === "all" ? "default" : "outline"}
            size="sm"
            className="justify-between h-9"
            onClick={() => onStatusChange("all")}
          >
            <span>{t('products.status_all')}</span>
            <Badge variant="secondary" className="ml-1 text-xs">{statusCounts.all}</Badge>
          </Button>
          <Button
            variant={activeStatus === "active" ? "default" : "outline"}
            size="sm"
            className="justify-between h-9"
            onClick={() => onStatusChange("active")}
          >
            <span>{t('products.status_active')}</span>
            <Badge variant="secondary" className="ml-1 text-xs">{statusCounts.active}</Badge>
          </Button>
          <Button
            variant={activeStatus === "inactive" ? "default" : "outline"}
            size="sm"
            className="justify-between h-9"
            onClick={() => onStatusChange("inactive")}
          >
            <span>{t('products.status_inactive')}</span>
            <Badge variant="secondary" className="ml-1 text-xs">{statusCounts.inactive}</Badge>
          </Button>
          <Button
            variant={activeStatus === "draft" ? "default" : "outline"}
            size="sm"
            className="justify-between h-9"
            onClick={() => onStatusChange("draft")}
          >
            <span>{t('products.status_draft')}</span>
            <Badge variant="secondary" className="ml-1 text-xs">{statusCounts.draft}</Badge>
          </Button>
        </div>
      </div>

      {/* Product Type */}
      <div className="space-y-3">
        <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          {t('products.product_type')}
        </Label>
        <div className="flex gap-2">
          <Button
            variant={productType === "retail" ? "default" : "outline"}
            size="sm"
            onClick={() => onProductTypeChange("retail")}
          >
            {t('products.retail')}
          </Button>
          <Button
            variant={productType === "wholesale" ? "default" : "outline"}
            size="sm"
            onClick={() => onProductTypeChange("wholesale")}
          >
            {t('products.wholesale')}
          </Button>
        </div>
      </div>

      {/* Sort By */}
      <div className="space-y-3">
        <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          {t('products.sort_by')}
        </Label>
        <Select value={sortBy} onValueChange={onSortByChange}>
          <SelectTrigger className="h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="a-z">{t('products.alphabetical_az')}</SelectItem>
            <SelectItem value="z-a">{t('products.alphabetical_za')}</SelectItem>
            <SelectItem value="price-low">{t('products.price_low_high')}</SelectItem>
            <SelectItem value="price-high">{t('products.price_high_low')}</SelectItem>
            <SelectItem value="stock">{t('products.stock_level')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Stock Alert */}
      <div className="space-y-3">
        <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          {t('products.stock_alert')}
        </Label>
        <Select defaultValue="all">
          <SelectTrigger className="h-9">
            <Package className="mr-2 h-4 w-4" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('products.all_stock')}</SelectItem>
            <SelectItem value="low">{t('products.low_stock')}</SelectItem>
            <SelectItem value="out">{t('products.out_of_stock')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Category */}
      <div className="space-y-3">
        <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          {t('products.category')}
        </Label>
        <Select defaultValue="all">
          <SelectTrigger className="h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('products.all_categories')}</SelectItem>
            <SelectItem value="shoes">Man Shoes</SelectItem>
            <SelectItem value="clothes">Women Clothes</SelectItem>
            <SelectItem value="accessories">Accessories</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Price Range */}
      <div className="space-y-3">
        <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          {t('products.price')}
        </Label>
        <div className="space-y-2">
          <div className="relative">
            <DollarSign className="absolute left-3 top-2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('products.min_price')}
              className="pl-9 h-9"
              value={minPrice}
              onChange={(e) => onMinPriceChange(e.target.value)}
            />
          </div>
          <div className="relative">
            <DollarSign className="absolute left-3 top-2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('products.max_price')}
              className="pl-9 h-9"
              value={maxPrice}
              onChange={(e) => onMaxPriceChange(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Reset Filters */}
      <Button variant="ghost" className="w-full justify-start" onClick={onResetFilters}>
        <RotateCcw className="mr-2 h-4 w-4" />
        {t('products.reset_filters')}
      </Button>
    </div>
  )
}
