import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus, Search } from "lucide-react"

export function DashboardView() {
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold tracking-tight">Dashboard</h2>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border bg-card text-card-foreground shadow p-6">
          <div className="flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="tracking-tight text-sm font-medium">Total Revenue</h3>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              className="h-4 w-4 text-muted-foreground"
            >
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          </div>
          <div className="text-2xl font-bold">$45,231.89</div>
          <p className="text-xs text-muted-foreground">+20.1% from last month</p>
        </div>
        <div className="rounded-xl border bg-card text-card-foreground shadow p-6">
           <div className="flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="tracking-tight text-sm font-medium">Subscriptions</h3>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              className="h-4 w-4 text-muted-foreground"
            >
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </div>
          <div className="text-2xl font-bold">+2350</div>
          <p className="text-xs text-muted-foreground">+180.1% from last month</p>
        </div>
         <div className="rounded-xl border bg-card text-card-foreground shadow p-6">
           <div className="flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="tracking-tight text-sm font-medium">Sales</h3>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              className="h-4 w-4 text-muted-foreground"
            >
              <rect width="20" height="14" x="2" y="5" rx="2" />
              <path d="M2 10h20" />
            </svg>
          </div>
          <div className="text-2xl font-bold">+12,234</div>
          <p className="text-xs text-muted-foreground">+19% from last month</p>
        </div>
         <div className="rounded-xl border bg-card text-card-foreground shadow p-6">
           <div className="flex flex-row items-center justify-between space-y-0 pb-2">
            <h3 className="tracking-tight text-sm font-medium">Active Now</h3>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              className="h-4 w-4 text-muted-foreground"
            >
              <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
            </svg>
          </div>
          <div className="text-2xl font-bold">+573</div>
          <p className="text-xs text-muted-foreground">+201 since last hour</p>
        </div>
      </div>
    </div>
  )
}

export function ProductList() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
         <h2 className="text-2xl font-bold tracking-tight">Products</h2>
         <Button>
            <Plus className="mr-2 h-4 w-4" /> Add Product
         </Button>
      </div>
      <div className="flex items-center space-x-2">
        <div className="relative w-full max-w-sm">
             <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
             <Input placeholder="Search products..." className="pl-8" />
        </div>
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">ID</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead>Category</TableHead>
              <TableHead className="text-right">Price</TableHead>
              <TableHead className="text-right">Stock</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell className="font-medium">PROD-001</TableCell>
              <TableCell>Wireless Headset</TableCell>
              <TableCell>WH-001</TableCell>
              <TableCell>Electronics</TableCell>
              <TableCell className="text-right">$250.00</TableCell>
              <TableCell className="text-right">120</TableCell>
            </TableRow>
             <TableRow>
              <TableCell className="font-medium">PROD-002</TableCell>
              <TableCell>Gaming Mouse</TableCell>
              <TableCell>GM-002</TableCell>
              <TableCell>Electronics</TableCell>
              <TableCell className="text-right">$85.00</TableCell>
              <TableCell className="text-right">45</TableCell>
            </TableRow>
             <TableRow>
              <TableCell className="font-medium">PROD-003</TableCell>
              <TableCell>Mechanical Keyboard</TableCell>
              <TableCell>MK-003</TableCell>
              <TableCell>Electronics</TableCell>
              <TableCell className="text-right">$150.00</TableCell>
              <TableCell className="text-right">30</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

export function VariantList() {
   return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
         <h2 className="text-2xl font-bold tracking-tight">Product Variants</h2>
         <Button>
            <Plus className="mr-2 h-4 w-4" /> Add Variant
         </Button>
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Variant Name</TableHead>
              <TableHead>Color</TableHead>
              <TableHead>Size</TableHead>
              <TableHead className="text-right">Stock</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell className="font-medium">T-Shirt - Red/M</TableCell>
              <TableCell>Red</TableCell>
              <TableCell>M</TableCell>
              <TableCell className="text-right">500</TableCell>
            </TableRow>
             <TableRow>
              <TableCell className="font-medium">T-Shirt - Blue/L</TableCell>
              <TableCell>Blue</TableCell>
              <TableCell>L</TableCell>
              <TableCell className="text-right">350</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

export function BundleList() {
    return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
         <h2 className="text-2xl font-bold tracking-tight">Product Bundles</h2>
         <Button>
            <Plus className="mr-2 h-4 w-4" /> Create Bundle
         </Button>
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Bundle Name</TableHead>
              <TableHead>Components</TableHead>
              <TableHead className="text-right">Bundle Price</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell className="font-medium">Gamer Starter Pack</TableCell>
              <TableCell>Mouse, Keyboard, Headset</TableCell>
              <TableCell className="text-right">$450.00</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

export function ReorderList() {
    return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
         <h2 className="text-2xl font-bold tracking-tight">Reorder Points</h2>
         <Button>
            <Plus className="mr-2 h-4 w-4" /> New Reorder
         </Button>
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead>Current Stock</TableHead>
              <TableHead>Reorder Point</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell className="font-medium">Gaming Mouse</TableCell>
              <TableCell>45</TableCell>
              <TableCell>50</TableCell>
              <TableCell className="text-destructive font-bold">Low</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

export function StockAdjustmentList() {
    return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
         <h2 className="text-2xl font-bold tracking-tight">Stock Adjustments</h2>
         <Button>
            <Plus className="mr-2 h-4 w-4" /> New Adjustment
         </Button>
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Reference</TableHead>
              <TableHead>Reason</TableHead>
              <TableHead className="text-right">Qty</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell className="font-medium">2023-10-25</TableCell>
              <TableCell>ADJ-001</TableCell>
              <TableCell>Damaged Goods</TableCell>
              <TableCell className="text-right text-destructive">-5</TableCell>
            </TableRow>
             <TableRow>
              <TableCell className="font-medium">2023-10-26</TableCell>
              <TableCell>ADJ-002</TableCell>
              <TableCell>Found Inventory</TableCell>
              <TableCell className="text-right text-green-600">+12</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
