import { createFileRoute } from '@tanstack/react-router'
import { DashboardLayout } from '@/shared/layouts'
import { BundleList } from '@/features/bundles'

export const Route = createFileRoute('/bundles')({
  component: BundlesPage,
})

function BundlesPage() {
  return (
    <DashboardLayout>
      <BundleList />
    </DashboardLayout>
  )
}
