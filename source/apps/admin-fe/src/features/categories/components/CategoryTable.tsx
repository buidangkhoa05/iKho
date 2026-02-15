import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/table"
import { Button } from "@/shared/components/button"
import { Badge } from "@/shared/components/badge"
import { Pencil, Trash2, ChevronRight } from "lucide-react"
import { useTranslation } from "react-i18next"
import type { Category } from "../types"

interface CategoryTableProps {
  categories: Category[]
  onEdit: (category: Category) => void
  onDelete: (category: Category) => void
}

export function CategoryTable({ categories, onEdit, onDelete }: CategoryTableProps) {
  const { t } = useTranslation()

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[250px]">{t('categories.name')}</TableHead>
            <TableHead>{t('categories.description')}</TableHead>
            <TableHead className="w-[100px]">{t('categories.status')}</TableHead>
            <TableHead className="w-[100px] text-right">{t('categories.products_count')}</TableHead>
            <TableHead className="w-[80px] text-right">{t('categories.sort_order')}</TableHead>
            <TableHead className="w-[100px] text-right">{t('common.actions')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {categories.map((category) => (
            <TableRow key={category.id}>
              <TableCell className="font-medium">
                <div className="flex items-center">
                  {category.level > 0 && (
                    <span className="text-muted-foreground mr-1" style={{ marginLeft: `${category.level * 16}px` }}>
                      <ChevronRight className="h-4 w-4" />
                    </span>
                  )}
                  {category.name}
                </div>
              </TableCell>
              <TableCell className="text-muted-foreground truncate max-w-[200px]">
                {category.description}
              </TableCell>
              <TableCell>
                <Badge variant={category.status === "active" ? "default" : "secondary"}>
                  {category.status === "active" 
                    ? t('categories.status_active') 
                    : t('categories.status_inactive')}
                </Badge>
              </TableCell>
              <TableCell className="text-right">{category.productsCount}</TableCell>
              <TableCell className="text-right">{category.sortOrder}</TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onEdit(category)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onDelete(category)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
