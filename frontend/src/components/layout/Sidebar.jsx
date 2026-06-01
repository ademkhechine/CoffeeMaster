import { NavLink, useNavigate } from 'react-router-dom'
import { useAuthStore, useThemeStore } from '../../store'
import { hasPermission } from '../../utils'
import { motion, AnimatePresence } from 'framer-motion'

const NAV = [
  { to: '/dashboard',    icon: '📊', label: 'Dashboard',       page: 'dashboard' },
  { to: '/pos',          icon: '🖥️', label: 'Point of Sale',    page: 'pos' },
  { to: '/kitchen',      icon: '🔥', label: 'Kitchen Display',  page: 'kitchen' },
  { to: '/tables',       icon: '🪑', label: 'Floor Plan',        page: 'tables' },
  { to: '/reservations', icon: '📅', label: 'Reservations',     page: 'reservations' },
  { to: '/orders',       icon: '📋', label: 'Orders',            page: 'orders' },
  { to: '/products',     icon: '☕', label: 'Products',          page: 'products' },
  { to: '/inventory',    icon: '📦', label: 'Inventory',         page: 'inventory' },
  { to: '/recipes',      icon: '📖', label: 'Recipes',           page: 'recipes' },
  { to: '/customers',    icon: '👥', label: 'Customers',         page: 'customers' },
  { to: '/employees',    icon: '👤', label: 'Employees',         page: 'employees' },
  { to: '/expenses',     icon: '💸', label: 'Expenses',          page: 'expenses' },
  { to: '/analytics',    icon: '📈', label: 'Analytics',         page: 'analytics' },
  { to: '/reports',      icon: '📄', label: 'Reports',           page: 'reports' },
  { to: '/suppliers',    icon: '🏪', label: 'Suppliers',         page: 'suppliers' },
  { to: '/purchase-orders', icon: '📋', label: 'Purchase Orders',  page: 'purchase-orders' },
  { to: '/shifts',       icon: '💵', label: 'Cash Drawer',       page: 'shifts' },
  { to: '/branches',     icon: '🏪', label: 'Branches',          page: 'branches' },
  { to: '/users',        icon: '⚙️', label: 'Users',             page: 'users' },
]

export default function Sidebar({ open, setOpen }) {
  const { user, logout } = useAuthStore()
  const { dark, toggle, sidebarCollapsed, toggleSidebar } = useThemeStore()
  const navigate = useNavigate()

  const allowed = NAV.filter(n => hasPermission(user?.role, n.page))

  const handleLogout = () => { logout(); navigate('/login') }

  return (
    <>
      {/* Mobile overlay */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-20 lg:hidden"
            onClick={() => setOpen(false)}
          />
        )}
      </AnimatePresence>

      <motion.aside
        initial={false}
        animate={{ 
          x: open ? 0 : 0, 
          width: sidebarCollapsed ? 80 : 256 
        }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className={`fixed left-0 top-0 h-full z-30 lg:relative lg:translate-x-0
                   bg-white dark:bg-coffee-900 border-r border-coffee-100 dark:border-coffee-800
                   flex flex-col shadow-coffee-lg overflow-hidden ${open ? 'block' : 'hidden lg:flex'}`}
      >
        {/* Logo */}
        <div className="p-4 border-b border-coffee-100 dark:border-coffee-800 flex items-center justify-between">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-10 h-10 rounded-xl bg-coffee-gradient flex items-center justify-center text-2xl shadow-md shrink-0 select-none">
              ☕
            </div>
            {!sidebarCollapsed && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="whitespace-nowrap"
              >
                <h1 className="font-display font-bold text-coffee-900 dark:text-coffee-50 text-base leading-tight">
                  CoffeeMaster
                </h1>
                <p className="text-coffee-500 text-[10px]">Management System</p>
              </motion.div>
            )}
          </div>
        </div>

        {/* Nav links */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {allowed.map(({ to, icon, label }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setOpen(false)}
              className={({ isActive }) => `sidebar-link flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
                isActive 
                  ? 'bg-coffee-50 dark:bg-coffee-800/40 text-coffee-800 dark:text-coffee-200 font-bold' 
                  : 'text-coffee-500 hover:text-coffee-800 dark:hover:text-coffee-300 hover:bg-coffee-50/50 dark:hover:bg-coffee-800/20'
              }`}
              title={sidebarCollapsed ? label : ''}
            >
              <span className="text-lg shrink-0">{icon}</span>
              {!sidebarCollapsed && (
                <motion.span
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="text-xs truncate"
                >
                  {label}
                </motion.span>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Bottom section */}
        <div className="p-3 border-t border-coffee-100 dark:border-coffee-800 space-y-1">
          {/* User card */}
          <NavLink to="/settings" 
            className={({ isActive }) => `sidebar-link flex items-center gap-3 px-3 py-2 rounded-xl transition-all ${
              isActive ? 'bg-coffee-50 dark:bg-coffee-800/40' : ''
            }`}
            title={sidebarCollapsed ? `${user?.name} (${user?.role})` : ''}
          >
            <div className="w-8 h-8 rounded-full bg-coffee-gradient flex items-center justify-center text-white text-xs font-bold shrink-0">
              {user?.name?.[0] || 'U'}
            </div>
            {!sidebarCollapsed && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex-1 min-w-0"
              >
                <p className="text-[11px] font-semibold truncate text-coffee-900 dark:text-coffee-100">{user?.name}</p>
                <p className="text-[9px] text-coffee-500 capitalize">{user?.role}</p>
              </motion.div>
            )}
          </NavLink>
          
          {/* Theme toggle */}
          <button onClick={toggle} className="sidebar-link flex items-center gap-3 px-3 py-2 rounded-xl w-full text-left" title={sidebarCollapsed ? (dark ? 'Light Mode' : 'Dark Mode') : ''}>
            <span className="text-base shrink-0">{dark ? '☀️' : '🌙'}</span>
            {!sidebarCollapsed && (
              <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs">
                {dark ? 'Light Mode' : 'Dark Mode'}
              </motion.span>
            )}
          </button>
          
          {/* Logout button */}
          <button onClick={handleLogout} className="sidebar-link flex items-center gap-3 px-3 py-2 rounded-xl w-full text-left text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20" title={sidebarCollapsed ? 'Logout' : ''}>
            <span className="text-base shrink-0">🚪</span>
            {!sidebarCollapsed && (
              <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs">
                Logout
              </motion.span>
            )}
          </button>

          {/* Collapse toggle (Desktop only) */}
          <button 
            onClick={toggleSidebar} 
            className="hidden lg:flex sidebar-link items-center justify-center gap-2 px-3 py-2 rounded-xl w-full hover:bg-coffee-50 dark:hover:bg-coffee-800/40 text-coffee-400 dark:text-coffee-600 hover:text-coffee-850 transition-colors mt-2 border-t border-coffee-50 dark:border-coffee-800/60 pt-3"
          >
            <span className="text-xs font-semibold">{sidebarCollapsed ? '▶ Expand' : '◀ Collapse'}</span>
          </button>
        </div>
      </motion.aside>
    </>
  )
}
