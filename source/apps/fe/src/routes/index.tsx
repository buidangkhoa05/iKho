import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { DashboardLayout } from '../components/DashboardLayout'
import { 
  DashboardView, 
  ProductList, 
  VariantList, 
  BundleList, 
  ReorderList, 
  StockAdjustmentList,
  CategoryList 
} from '../components/views'

export const Route = createFileRoute('/')({
  component: Dashboard,
})

function Dashboard() {
  const [activeView, setActiveView] = useState('dashboard')

  const renderView = () => {
    switch(activeView) {
      case 'dashboard': return <DashboardView />
      case 'product-list': return <ProductList />
      case 'variant-list': return <VariantList />
      case 'bundle-list': return <BundleList />
      case 'reorder-list': return <ReorderList />
      case 'stock-adjustment-list': return <StockAdjustmentList />
      case 'category-list': return <CategoryList />
      default: return <DashboardView />
    }
  }

  return (
    <DashboardLayout activeView={activeView} onViewChange={setActiveView}>
      {renderView()}
    </DashboardLayout>
  )
}
