import { useState } from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Plus, Search, Pencil, Trash2, ChevronRight } from "lucide-react"
import { useTranslation } from "react-i18next"

// Mock data for categories with hierarchy
interface Category {
  id: string
  name: string
  parentId: string | null
  description: string
  imageUrl: string
  status: "active" | "inactive"
  sortOrder: number
  productsCount: number
  level: number
}

const mockCategories: Category[] = [
  {
    id: "CAT-001",
    name: "Electronics",
    parentId: null,
    description: "Electronic devices and accessories",
    imageUrl: "",
    status: "active",
    sortOrder: 1,
    productsCount: 150,
    level: 0,
  },
  {
    id: "CAT-002",
    name: "Computers",
    parentId: "CAT-001",
    description: "Desktop and laptop computers",
    imageUrl: "",
    status: "active",
    sortOrder: 1,
    productsCount: 45,
    level: 1,
  },
  {
    id: "CAT-003",
    name: "Laptops",
    parentId: "CAT-002",
    description: "Portable laptop computers",
    imageUrl: "",
    status: "active",
    sortOrder: 1,
    productsCount: 30,
    level: 2,
  },
  {
    id: "CAT-004",
    name: "Smartphones",
    parentId: "CAT-001",
    description: "Mobile phones and accessories",
    imageUrl: "",
    status: "active",
    sortOrder: 2,
    productsCount: 80,
    level: 1,
  },
  {
    id: "CAT-005",
    name: "Clothing",
    parentId: null,
    description: "Apparel and fashion items",
    imageUrl: "",
    status: "active",
    sortOrder: 2,
    productsCount: 200,
    level: 0,
  },
  {
    id: "CAT-006",
    name: "Men's Wear",
    parentId: "CAT-005",
    description: "Clothing for men",
    imageUrl: "",
    status: "active",
    sortOrder: 1,
    productsCount: 90,
    level: 1,
  },
  {
    id: "CAT-007",
    name: "Women's Wear",
    parentId: "CAT-005",
    description: "Clothing for women",
    imageUrl: "",
    status: "inactive",
    sortOrder: 2,
    productsCount: 110,
    level: 1,
  },
]

interface CategoryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  category: Category | null
  categories: Category[]
}

function CategoryDialog({ open, onOpenChange, category, categories }: CategoryDialogProps) {
  const { t } = useTranslation()
  const isEditing = category !== null

  const [formData, setFormData] = useState({
    name: category?.name || "",
    parentId: category?.parentId || "none",
    description: category?.description || "",
    imageUrl: category?.imageUrl || "",
    status: category?.status || "active",
    sortOrder: category?.sortOrder?.toString() || "1",
  })

  // Get root categories for parent selection (exclude current category and its children)
  const availableParents = categories.filter(
    (cat) => cat.id !== category?.id && cat.parentId !== category?.id
  )

  const handleSave = () => {
    // In a real app, this would call an API
    console.log("Saving category:", formData)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? t('categories.edit_category') : t('categories.add_category')}
          </DialogTitle>
          <DialogDescription>
            {isEditing 
              ? t('categories.edit_description') 
              : t('categories.add_description')}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="name">{t('categories.name')}</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder={t('categories.name')}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="parent">{t('categories.parent')}</Label>
            <Select
              value={formData.parentId}
              onValueChange={(value) => setFormData({ ...formData, parentId: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('categories.parent_none')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{t('categories.parent_none')}</SelectItem>
                {availableParents.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {"—".repeat(cat.level)} {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="description">{t('categories.description')}</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder={t('categories.description')}
              rows={3}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="image">{t('categories.image')}</Label>
            <Input
              id="image"
              value={formData.imageUrl}
              onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
              placeholder="https://example.com/image.jpg"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="status">{t('categories.status')}</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData({ ...formData, status: value as "active" | "inactive" })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">{t('categories.status_active')}</SelectItem>
                  <SelectItem value="inactive">{t('categories.status_inactive')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="sortOrder">{t('categories.sort_order')}</Label>
              <Input
                id="sortOrder"
                type="number"
                min="1"
                value={formData.sortOrder}
                onChange={(e) => setFormData({ ...formData, sortOrder: e.target.value })}
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('common.cancel')}
          </Button>
          <Button onClick={handleSave}>{t('common.save')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function CategoryList() {
  const { t } = useTranslation()
  const [searchQuery, setSearchQuery] = useState("")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null)

  const filteredCategories = mockCategories.filter((cat) =>
    cat.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleAddCategory = () => {
    setSelectedCategory(null)
    setDialogOpen(true)
  }

  const handleEditCategory = (category: Category) => {
    setSelectedCategory(category)
    setDialogOpen(true)
  }

  const handleDeleteCategory = (category: Category) => {
    // In a real app, this would show a confirmation dialog and call an API
    console.log("Deleting category:", category.id)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">{t('categories.title')}</h2>
        <Button onClick={handleAddCategory}>
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
            {filteredCategories.map((category) => (
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
                      onClick={() => handleEditCategory(category)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteCategory(category)}
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

      <CategoryDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        category={selectedCategory}
        categories={mockCategories}
      />
    </div>
  )
}
