import { useState } from "react"
import { Button } from "@/shared/components/button"
import { Input } from "@/shared/components/input"
import { Label } from "@/shared/components/label"
import { Textarea } from "@/shared/components/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/select"
import { useTranslation } from "react-i18next"
import type { Category } from "../types"

interface CategoryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  category: Category | null
  categories: Category[]
}

export function CategoryDialog({ open, onOpenChange, category, categories }: CategoryDialogProps) {
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
