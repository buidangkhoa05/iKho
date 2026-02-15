import { Button } from "@/shared/components/button"
import { Input } from "@/shared/components/input"
import { Plus, Search } from "lucide-react"
import { useTranslation } from "react-i18next"
import { CategoryDialog } from "./CategoryDialog"
import { CategoryTable } from "./CategoryTable"
import { mockCategories } from "../mockData"
import { useCategoryStore } from "../store"
import type { Category } from "../types"

export function CategoryList() {
  const { t } = useTranslation()
  const {
    searchQuery,
    dialogOpen,
    selectedCategory,
    setSearchQuery,
    openAddDialog,
    openEditDialog,
    setDialogOpen,
  } = useCategoryStore()

  const filteredCategories = mockCategories.filter((cat) =>
    cat.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleDeleteCategory = (category: Category) => {
    // In a real app, this would show a confirmation dialog and call an API
    console.log("Deleting category:", category.id)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">{t('categories.title')}</h2>
        <Button onClick={openAddDialog}>
          <Plus className="mr-2 h-4 w-4" /> {t('categories.add_category')}
        </Button>
      </div>
      <div className="flex items-center space-x-2">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('categories.search_placeholder')}
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <CategoryTable
        categories={filteredCategories}
        onEdit={openEditDialog}
        onDelete={handleDeleteCategory}
      />

      <CategoryDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        category={selectedCategory}
        categories={mockCategories}
      />
    </div>
  )
}
