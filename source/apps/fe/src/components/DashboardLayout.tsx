import { Sidebar } from "@/components/Sidebar"

interface DashboardLayoutProps {
  children: React.ReactNode
  activeView: string
  onViewChange: (view: string) => void
}

export function DashboardLayout({ children, activeView, onViewChange }: DashboardLayoutProps) {
  return (
    <div className="flex min-h-[calc(100vh-3.5rem)]">
      <Sidebar className="hidden md:block" activeView={activeView} onViewChange={onViewChange} />
      <div className="flex-1 p-8 overflow-y-auto">
        {children}
      </div>
    </div>
  )
}
