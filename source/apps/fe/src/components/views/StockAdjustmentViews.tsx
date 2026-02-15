import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { useTranslation } from "react-i18next"

export function StockAdjustmentList() {
  const { t } = useTranslation()
  
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
         <h2 className="text-2xl font-bold tracking-tight">{t('sidebar.stock_adjustment')}</h2>
         <Button>
            <Plus className="mr-2 h-4 w-4" /> {t('stock_adjustment.new_adjustment')}
         </Button>
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('stock_adjustment.date')}</TableHead>
              <TableHead>{t('stock_adjustment.reference')}</TableHead>
              <TableHead>{t('stock_adjustment.reason')}</TableHead>
              <TableHead className="text-right">{t('stock_adjustment.qty')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell className="font-medium">2023-10-25</TableCell>
              <TableCell>ADJ-001</TableCell>
              <TableCell>Damaged Goods</TableCell>
              <TableCell className="text-right text-destructive">-5</TableCell>
            </TableRow>
             <TableRow>
              <TableCell className="font-medium">2023-10-26</TableCell>
              <TableCell>ADJ-002</TableCell>
              <TableCell>Found Inventory</TableCell>
              <TableCell className="text-right text-green-600">+12</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
