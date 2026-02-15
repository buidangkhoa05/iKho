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

export function ReorderList() {
  const { t } = useTranslation()
  
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
         <h2 className="text-2xl font-bold tracking-tight">{t('sidebar.reorder')}</h2>
         <Button>
            <Plus className="mr-2 h-4 w-4" /> {t('reorder.new_reorder')}
         </Button>
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('reorder.product')}</TableHead>
              <TableHead>{t('reorder.current_stock')}</TableHead>
              <TableHead>{t('reorder.reorder_point')}</TableHead>
              <TableHead>{t('common.status')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell className="font-medium">Gaming Mouse</TableCell>
              <TableCell>45</TableCell>
              <TableCell>50</TableCell>
              <TableCell className="text-destructive font-bold">{t('reorder.low')}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
