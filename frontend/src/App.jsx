import { useState, useEffect } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useThemeStore, useAuthStore } from './store'
import Sidebar from './components/layout/Sidebar'
import Topbar from './components/layout/Topbar'

// Pages
import Login from './pages/Auth/Login'
import Dashboard from './pages/Dashboard/Dashboard'
import POS from './pages/POS/POS'
import Products from './pages/Products/Products'
import Inventory from './pages/Inventory/Inventory'
import Recipes from './pages/Recipes/Recipes'
import Orders from './pages/Orders/Orders'
import Customers from './pages/Customers/Customers'
import Employees from './pages/Employees/Employees'
import Expenses from './pages/Expenses/Expenses'
import Analytics from './pages/Analytics/Analytics'
import Reports from './pages/Reports/Reports'
import Branches from './pages/Branches/Branches'
import Users from './pages/Users/Users'
import Settings from './pages/Settings/Settings'
import NotFound from './pages/NotFound'
import Tables from './pages/Tables/Tables'
import Kitchen from './pages/Kitchen/Kitchen'
import Reservations from './pages/Reservations/Reservations'
import Suppliers from './pages/Suppliers/Suppliers'
import PurchaseOrders from './pages/PurchaseOrders/PurchaseOrders'
import Shifts from './pages/Shifts/Shifts'

const PAGE_TITLES = {
  '/dashboard': 'Dashboard', '/pos': 'Point of Sale', '/orders': 'Orders',
  '/products': 'Products', '/inventory': 'Inventory', '/recipes': 'Recipes',
  '/customers': 'Customers', '/employees': 'Employees', '/expenses': 'Expenses',
  '/analytics': 'Analytics', '/reports': 'Reports', '/branches': 'Branches',
  '/users': 'User Management', '/settings': 'Settings', '/tables': 'Floor Plan & Tables',
  '/kitchen': 'Kitchen Display', '/reservations': 'Reservations',
  '/suppliers': 'Suppliers & Debts', '/purchase-orders': 'Purchase Orders', '/shifts': 'Cash Drawer (Shifts)',
}

function ProtectedRoute({ children }) {
  const { token } = useAuthStore()
  return token ? children : <Navigate to="/login" replace />
}

function AppLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const location = useLocation()
  const title = PAGE_TITLES[location.pathname] || 'CoffeeMaster'

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar open={sidebarOpen} setOpen={setSidebarOpen} />
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <Topbar onMenuClick={() => setSidebarOpen(!sidebarOpen)} title={title} />
        <main className="flex-1 overflow-y-auto p-6 page-enter">
          {children}
        </main>
      </div>
    </div>
  )
}

export default function App() {
  const { init } = useThemeStore()

  useEffect(() => { init() }, [init])

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/*" element={
        <ProtectedRoute>
          <AppLayout>
            <Routes>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/pos" element={<POS />} />
              <Route path="/orders" element={<Orders />} />
              <Route path="/products" element={<Products />} />
              <Route path="/inventory" element={<Inventory />} />
              <Route path="/recipes" element={<Recipes />} />
              <Route path="/customers" element={<Customers />} />
              <Route path="/employees" element={<Employees />} />
              <Route path="/expenses" element={<Expenses />} />
              <Route path="/analytics" element={<Analytics />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/suppliers" element={<Suppliers />} />
              <Route path="/purchase-orders" element={<PurchaseOrders />} />
              <Route path="/shifts" element={<Shifts />} />
              <Route path="/branches" element={<Branches />} />
              <Route path="/users" element={<Users />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/tables" element={<Tables />} />
              <Route path="/kitchen" element={<Kitchen />} />
              <Route path="/reservations" element={<Reservations />} />
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AppLayout>
        </ProtectedRoute>
      } />
    </Routes>
  )
}
