import {
  LayoutDashboard,
  Package,
  Layers,
  PackagePlus,
  RefreshCw,
  ClipboardList,
  FolderTree
} from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { useTranslation } from "react-i18next"

interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> {
  activeView: string
  onViewChange: (view: string) => void
}

export function Sidebar({ className, activeView, onViewChange }: SidebarProps) {
  const { t } = useTranslation()

  return (
    <div className={cn("pb-12 w-64 border-r bg-background", className)}>
      <div className="space-y-4 py-4">
        <div className="px-3 py-2">
          <h2 className="mb-2 px-4 text-lg font-semibold tracking-tight">
            {t('sidebar.overview')}
          </h2>
          <div className="space-y-1">
            <Button 
              variant={activeView === 'dashboard' ? "secondary" : "ghost"} 
              className="w-full justify-start"
              onClick={() => onViewChange('dashboard')}
            >
              <LayoutDashboard className="mr-2 h-4 w-4" />
              {t('sidebar.dashboard')}
            </Button>
          </div>
        </div>
        <div className="px-3 py-2">
          <h2 className="mb-2 px-4 text-lg font-semibold tracking-tight">
            {t('sidebar.inventory')}
          </h2>
          <div className="space-y-1">
            <Button 
              variant={activeView === 'product-list' ? "secondary" : "ghost"} 
              className="w-full justify-start"
              onClick={() => onViewChange('product-list')}
            >
              <Package className="mr-2 h-4 w-4" />
              {t('sidebar.products')}
            </Button>
            <Button 
              variant={activeView === 'variant-list' ? "secondary" : "ghost"} 
              className="w-full justify-start"
              onClick={() => onViewChange('variant-list')}
            >
              <Layers className="mr-2 h-4 w-4" />
              {t('sidebar.variants')}
            </Button>
            <Button 
              variant={activeView === 'bundle-list' ? "secondary" : "ghost"} 
              className="w-full justify-start"
              onClick={() => onViewChange('bundle-list')}
            >
              <PackagePlus className="mr-2 h-4 w-4" />
              {t('sidebar.bundles')}
            </Button>
            <Button 
              variant={activeView === 'reorder-list' ? "secondary" : "ghost"} 
              className="w-full justify-start"
              onClick={() => onViewChange('reorder-list')}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              {t('sidebar.reorder')}
            </Button>
             <Button 
              variant={activeView === 'stock-adjustment-list' ? "secondary" : "ghost"} 
              className="w-full justify-start"
              onClick={() => onViewChange('stock-adjustment-list')}
            >
              <ClipboardList className="mr-2 h-4 w-4" />
              {t('sidebar.stock_adjustment')}
            </Button>
          </div>
        </div>
        <div className="px-3 py-2">
          <h2 className="mb-2 px-4 text-lg font-semibold tracking-tight">
            {t('sidebar.settings')}
          </h2>
          <div className="space-y-1">
            <Button 
              variant={activeView === 'category-list' ? "secondary" : "ghost"} 
              className="w-full justify-start"
              onClick={() => onViewChange('category-list')}
            >
              <FolderTree className="mr-2 h-4 w-4" />
              {t('sidebar.categories')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
