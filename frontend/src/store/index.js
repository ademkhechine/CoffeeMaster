import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useAuthStore = create(
  persist(
    (set) => ({
      user: null,
      token: null,
      setAuth: (user, token) => set({ user, token }),
      logout: () => { set({ user: null, token: null }); localStorage.removeItem('auth-storage'); },
      updateUser: (user) => set({ user }),
    }),
    { name: 'auth-storage', partialize: (s) => ({ user: s.user, token: s.token }) }
  )
)

export const useThemeStore = create(
  persist(
    (set, get) => ({
      dark: false,
      sidebarCollapsed: false,
      toggle: () => {
        const next = !get().dark
        set({ dark: next })
        document.documentElement.classList.toggle('dark', next)
      },
      toggleSidebar: () => set({ sidebarCollapsed: !get().sidebarCollapsed }),
      init: () => {
        const { dark } = get()
        document.documentElement.classList.toggle('dark', dark)
      }
    }),
    { name: 'theme-storage' }
  )
)

export const useCartStore = create((set, get) => {
  const calculateTotals = (items, discount) => {
    const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0)
    const total = subtotal * (1 - discount / 100)
    return { subtotal, total }
  }

  return {
    items: [],
    customer: null,
    discount: 0,
    subtotal: 0,
    total: 0,
    addItem: (product) => {
      const items = get().items
      const existing = items.find(i => i._id === product._id)
      let newItems
      if (existing) {
        newItems = items.map(i => i._id === product._id ? { ...i, quantity: i.quantity + 1 } : i)
      } else {
        newItems = [...items, { ...product, quantity: 1 }]
      }
      set({ items: newItems, ...calculateTotals(newItems, get().discount) })
    },
    removeItem: (id) => {
      const newItems = get().items.filter(i => i._id !== id)
      set({ items: newItems, ...calculateTotals(newItems, get().discount) })
    },
    updateQty: (id, qty) => {
      if (qty <= 0) { get().removeItem(id); return; }
      const newItems = get().items.map(i => i._id === id ? { ...i, quantity: qty } : i)
      set({ items: newItems, ...calculateTotals(newItems, get().discount) })
    },
    setCustomer: (customer) => set({ customer }),
    setDiscount: (discount) => {
      const d = Math.min(100, Math.max(0, discount))
      set({ discount: d, ...calculateTotals(get().items, d) })
    },
    clear: () => set({ items: [], customer: null, discount: 0, subtotal: 0, total: 0 }),
  }
})

export const useNotificationStore = create((set, get) => ({
  notifications: [],
  unreadCount: 0,
  setNotifications: (notifications, unreadCount) => set({ notifications, unreadCount }),
  markRead: (id) => {
    set({
      notifications: get().notifications.map(n => n._id === id ? { ...n, isRead: true } : n),
      unreadCount: Math.max(0, get().unreadCount - 1)
    })
  },
}))
