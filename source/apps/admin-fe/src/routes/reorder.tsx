import { createFileRoute } from '@tanstack/react-router'
import { DashboardLayout } from '@/shared/layouts'
import { ReorderList } from '@/features/reorder'

export const Route = createFileRoute('/reorder')({
  component: ReorderPage,
})

function ReorderPage() {
  return (
    <DashboardLayout>
      <ReorderList />
    </DashboardLayout>
  )
}
