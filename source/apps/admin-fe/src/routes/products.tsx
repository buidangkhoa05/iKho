import { createFileRoute } from '@tanstack/react-router'
import { DashboardLayout } from '@/shared/layouts'
import { ProductList } from '@/features/products'

export const Route = createFileRoute('/products')({
  component: ProductsPage,
})

function ProductsPage() {
  return (
    <DashboardLayout>
      <ProductList />
    </DashboardLayout>
  )
}
