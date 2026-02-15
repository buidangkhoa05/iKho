import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { 
  Plus, 
  Search, 
  ScanLine, 
  LayoutList, 
  LayoutGrid, 
  MoreHorizontal 
} from "lucide-react"
import { useTranslation } from "react-i18next"

interface ProductHeaderProps {
  totalProducts: number
  searchQuery: string
  onSearchChange: (query: string) => void
  viewMode: "list" | "grid"
  onViewModeChange: (mode: "list" | "grid") => void
}

export function ProductHeader({
  totalProducts,
  searchQuery,
  onSearchChange,
  viewMode,
  onViewModeChange,
}: ProductHeaderProps) {
  const { t } = useTranslation()

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-bold tracking-tight">{t('sidebar.products')}</h2>
          <Badge variant="secondary" className="text-muted-foreground">
            {totalProducts} {t('products.total_products')}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon">
            <MoreHorizontal className="h-5 w-5" />
          </Button>
          <Button>
            <Plus className="mr-2 h-4 w-4" /> {t('products.add_product')}
          </Button>
        </div>
      </div>

      {/* Search and View Controls */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('products.search_placeholder')}
              className="pl-9"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
            />
          </div>
          <Button variant="outline" size="icon">
            <ScanLine className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex items-center gap-1 border rounded-md p-1">
          <Button
            variant={viewMode === "list" ? "secondary" : "ghost"}
            size="icon"
            className="h-8 w-8"
            onClick={() => onViewModeChange("list")}
          >
            <LayoutList className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === "grid" ? "secondary" : "ghost"}
            size="icon"
            className="h-8 w-8"
            onClick={() => onViewModeChange("grid")}
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
