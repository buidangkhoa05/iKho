import { createFileRoute } from '@tanstack/react-router'
import { DashboardLayout } from '@/shared/layouts'
import { StockAdjustmentList } from '@/features/stock-adjustment'

export const Route = createFileRoute('/stock-adjustment')({
  component: StockAdjustmentPage,
})

function StockAdjustmentPage() {
  return (
    <DashboardLayout>
      <StockAdjustmentList />
    </DashboardLayout>
  )
}
