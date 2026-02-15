import { createFileRoute } from '@tanstack/react-router'
import { DashboardLayout } from '@/shared/layouts'
import { VariantList } from '@/features/variants'

export const Route = createFileRoute('/variants')({
  component: VariantsPage,
})

function VariantsPage() {
  return (
    <DashboardLayout>
      <VariantList />
    </DashboardLayout>
  )
}
