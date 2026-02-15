import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { useTranslation } from "react-i18next"
import type { Product } from "./types"

interface ProductTableProps {
  products: Product[]
}

export function ProductTable({ products }: ProductTableProps) {
  const { t } = useTranslation()

  const getStockTypeBadge = (type: Product["stockType"]) => {
    switch(type) {
      case "serialized":
        return <span className="text-xs text-muted-foreground">{t('products.serialized')}</span>
      case "stocked":
        return <span className="text-xs text-muted-foreground">{t('products.stocked')}</span>
      case "consumable":
        return <span className="text-xs text-muted-foreground">{t('products.consumable')}</span>
    }
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[450px]">{t('products.product')}</TableHead>
            <TableHead className="text-right">{t('products.retail_price')}</TableHead>
            <TableHead className="text-right">{t('products.wholesale_price')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {products.map((product) => (
            <TableRow key={product.id} className="cursor-pointer hover:bg-muted/50">
              <TableCell>
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-lg overflow-hidden bg-muted shrink-0">
                    <img 
                      src={product.image} 
                      alt={product.name}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="space-y-1">
                    <div className="font-medium">{product.name}</div>
                    <div className="flex items-center gap-2 text-sm flex-wrap">
                      {product.variants && (
                        <Badge 
                          variant="outline" 
                          className={`text-xs ${
                            product.variantColor === "emerald" 
                              ? "border-emerald-500 text-emerald-500" 
                              : "border-rose-500 text-rose-500"
                          }`}
                        >
                          {product.variants} {t('products.variants')}
                        </Badge>
                      )}
                      <span className="text-muted-foreground">• {product.category}</span>
                      <span className="text-muted-foreground">•</span>
                      {getStockTypeBadge(product.stockType)}
                      <span className="text-muted-foreground">
                        • {product.stock} {t('products.in_stock')}
                      </span>
                      {product.isLowStock && (
                        <Badge variant="destructive" className="text-xs">
                          {t('products.low')}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </TableCell>
              <TableCell className="text-right">
                <div className="text-xs text-muted-foreground uppercase">{t('products.retail_price')}</div>
                <div className="font-medium">{product.retailPrice}</div>
              </TableCell>
              <TableCell className="text-right">
                <div className="text-xs text-muted-foreground uppercase">{t('products.wholesale_price')}</div>
                <div className="font-medium">{product.wholesalePrice}</div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
