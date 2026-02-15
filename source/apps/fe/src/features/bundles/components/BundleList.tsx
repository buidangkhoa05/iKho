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

export function BundleList() {
  const { t } = useTranslation()
  
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
         <h2 className="text-2xl font-bold tracking-tight">{t('sidebar.bundles')}</h2>
         <Button>
            <Plus className="mr-2 h-4 w-4" /> {t('bundles.create_bundle')}
         </Button>
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('bundles.bundle_name')}</TableHead>
              <TableHead>{t('bundles.components')}</TableHead>
              <TableHead className="text-right">{t('bundles.bundle_price')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell className="font-medium">Gamer Starter Pack</TableCell>
              <TableCell>Mouse, Keyboard, Headset</TableCell>
              <TableCell className="text-right">$450.00</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
