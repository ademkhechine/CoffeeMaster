export const formatCurrency = (amount, currency = 'TND') => {
  return `${Number(amount || 0).toLocaleString('fr-TN', { minimumFractionDigits: 3, maximumFractionDigits: 3 })} ${currency}`
}

export const formatDate = (date, opts = {}) => {
  if (!date) return '-'
  return new Date(date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', ...opts })
}

export const formatDateTime = (date) => {
  if (!date) return '-'
  return new Date(date).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export const ROLES = { ADMIN: 'admin', MANAGER: 'manager', CASHIER: 'cashier', BARISTA: 'barista' }

export const ROLE_PERMISSIONS = {
  admin:   ['dashboard', 'pos', 'kitchen', 'products', 'inventory', 'recipes', 'orders', 'customers', 'employees', 'expenses', 'analytics', 'reports', 'branches', 'users', 'settings', 'tables', 'reservations', 'suppliers', 'purchase-orders', 'shifts'],
  manager: ['dashboard', 'pos', 'kitchen', 'products', 'inventory', 'recipes', 'orders', 'customers', 'employees', 'expenses', 'analytics', 'reports', 'settings', 'tables', 'reservations', 'suppliers', 'purchase-orders', 'shifts'],
  cashier: ['pos', 'kitchen', 'orders', 'customers', 'settings', 'tables', 'reservations', 'shifts'],
  barista: ['pos', 'kitchen', 'recipes', 'settings', 'tables', 'shifts'],
}

export const hasPermission = (role, page) => {
  return ROLE_PERMISSIONS[role]?.includes(page) || false
}

export const CATEGORIES = ['Coffee', 'Tea', 'Desserts', 'Sandwiches', 'Juices', 'Other']
export const CATEGORY_EMOJIS = { Coffee: '☕', Tea: '🍵', Desserts: '🍰', Sandwiches: '🥪', Juices: '🥤', Other: '🍽️' }

export const STOCK_STATUS = (qty, min) => {
  if (qty === 0) return { label: 'Out of Stock', cls: 'badge-danger', color: '#ef4444' }
  if (qty <= min) return { label: 'Low Stock', cls: 'badge-warning', color: '#f59e0b' }
  return { label: 'In Stock', cls: 'badge-success', color: '#10b981' }
}

export const TIER_COLORS = {
  Bronze: 'text-amber-700 bg-amber-50',
  Silver: 'text-slate-600 bg-slate-100',
  Gold: 'text-yellow-600 bg-yellow-50',
  Platinum: 'text-sky-600 bg-sky-50',
}

export const downloadBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}

export const getSocketUrl = () => {
  return import.meta.env.VITE_API_URL || (import.meta.env.MODE === 'production' ? window.location.origin : 'http://localhost:5000')
}

