import { createFileRoute } from '@tanstack/react-router'
import { DashboardLayout } from '@/shared/layouts'
import { CategoryList } from '@/features/categories'

export const Route = createFileRoute('/categories')({
  component: CategoriesPage,
})

function CategoriesPage() {
  return (
    <DashboardLayout>
      <CategoryList />
    </DashboardLayout>
  )
}
