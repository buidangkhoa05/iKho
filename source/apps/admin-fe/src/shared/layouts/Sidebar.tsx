import {
  LayoutDashboard,
  Package,
  Layers,
  PackagePlus,
  RefreshCw,
  ClipboardList,
  FolderTree
} from "lucide-react"
import { Link, useLocation } from "@tanstack/react-router"

import { cn } from "@/lib/utils"
import { Button } from "@/shared/components/button"
import { useTranslation } from "react-i18next"

interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> {}

export function Sidebar({ className }: SidebarProps) {
  const { t } = useTranslation()
  const location = useLocation()
  const pathname = location.pathname

  const isActive = (path: string) => pathname === path

  return (
    <div className={cn("pb-12 w-64 border-r bg-background", className)}>
      <div className="space-y-4 py-4">
        <div className="px-3 py-2">
          <h2 className="mb-2 px-4 text-lg font-semibold tracking-tight">
            {t('sidebar.overview')}
          </h2>
          <div className="space-y-1">
            <Button 
              variant={isActive('/') ? "secondary" : "ghost"} 
              className="w-full justify-start"
              asChild
            >
              <Link to="/">
                <LayoutDashboard className="mr-2 h-4 w-4" />
                {t('sidebar.dashboard')}
              </Link>
            </Button>
          </div>
        </div>
        <div className="px-3 py-2">
          <h2 className="mb-2 px-4 text-lg font-semibold tracking-tight">
            {t('sidebar.inventory')}
          </h2>
          <div className="space-y-1">
            <Button 
              variant={isActive('/products') ? "secondary" : "ghost"} 
              className="w-full justify-start"
              asChild
            >
              <Link to="/products">
                <Package className="mr-2 h-4 w-4" />
                {t('sidebar.products')}
              </Link>
            </Button>
            <Button 
              variant={isActive('/variants') ? "secondary" : "ghost"} 
              className="w-full justify-start"
              asChild
            >
              <Link to="/variants">
                <Layers className="mr-2 h-4 w-4" />
                {t('sidebar.variants')}
              </Link>
            </Button>
            <Button 
              variant={isActive('/bundles') ? "secondary" : "ghost"} 
              className="w-full justify-start"
              asChild
            >
              <Link to="/bundles">
                <PackagePlus className="mr-2 h-4 w-4" />
                {t('sidebar.bundles')}
              </Link>
            </Button>
            <Button 
              variant={isActive('/reorder') ? "secondary" : "ghost"} 
              className="w-full justify-start"
              asChild
            >
              <Link to="/reorder">
                <RefreshCw className="mr-2 h-4 w-4" />
                {t('sidebar.reorder')}
              </Link>
            </Button>
             <Button 
              variant={isActive('/stock-adjustment') ? "secondary" : "ghost"} 
              className="w-full justify-start"
              asChild
            >
              <Link to="/stock-adjustment">
                <ClipboardList className="mr-2 h-4 w-4" />
                {t('sidebar.stock_adjustment')}
              </Link>
            </Button>
          </div>
        </div>
        <div className="px-3 py-2">
          <h2 className="mb-2 px-4 text-lg font-semibold tracking-tight">
            {t('sidebar.settings')}
          </h2>
          <div className="space-y-1">
            <Button 
              variant={isActive('/categories') ? "secondary" : "ghost"} 
              className="w-full justify-start"
              asChild
            >
              <Link to="/categories">
                <FolderTree className="mr-2 h-4 w-4" />
                {t('sidebar.categories')}
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
