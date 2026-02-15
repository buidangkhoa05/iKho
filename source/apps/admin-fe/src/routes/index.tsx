import { createFileRoute } from '@tanstack/react-router'
import { DashboardLayout } from '@/shared/layouts'
import { DashboardView } from '@/features/dashboard'

export const Route = createFileRoute('/')({
  component: Dashboard,
})

function Dashboard() {
  return (
    <DashboardLayout>
      <DashboardView />
    </DashboardLayout>
  )
}
