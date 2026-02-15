import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/table"
import { Button } from "@/shared/components/button"
import { Plus } from "lucide-react"
import { useTranslation } from "react-i18next"

export function VariantList() {
  const { t } = useTranslation()
  
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
         <h2 className="text-2xl font-bold tracking-tight">{t('sidebar.variants')}</h2>
         <Button>
            <Plus className="mr-2 h-4 w-4" /> {t('variants.add_variant')}
         </Button>
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('variants.variant_name')}</TableHead>
              <TableHead>{t('variants.color')}</TableHead>
              <TableHead>{t('variants.size')}</TableHead>
              <TableHead className="text-right">{t('products.stock')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell className="font-medium">T-Shirt - Red/M</TableCell>
              <TableCell>Red</TableCell>
              <TableCell>M</TableCell>
              <TableCell className="text-right">500</TableCell>
            </TableRow>
             <TableRow>
              <TableCell className="font-medium">T-Shirt - Blue/L</TableCell>
              <TableCell>Blue</TableCell>
              <TableCell>L</TableCell>
              <TableCell className="text-right">350</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
