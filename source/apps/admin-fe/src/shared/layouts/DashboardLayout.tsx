import { Sidebar } from "./Sidebar"

interface DashboardLayoutProps {
  children: React.ReactNode
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="flex min-h-[calc(100vh-3.5rem)]">
      <Sidebar className="hidden md:block" />
      <div className="flex-1 p-8 overflow-y-auto">
        {children}
      </div>
    </div>
  )
}
