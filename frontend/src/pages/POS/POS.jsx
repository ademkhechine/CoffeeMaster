import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getProducts, getCustomers, createOrder, downloadOrderReceipt, getTables, getActiveShift } from '../../api'
import { useCartStore, useAuthStore } from '../../store'
import { formatCurrency, CATEGORIES, CATEGORY_EMOJIS, downloadBlob } from '../../utils'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'

export default function POS() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const branchId = user?.branch?._id || user?.branch
  const [selectedTable, setSelectedTable] = useState('')
  const queryClient = useQueryClient()
  const [activeCategory, setActiveCategory] = useState('Coffee')
  const [search, setSearch] = useState('')
  const [custSearch, setCustSearch] = useState('')
  const [showReceipt, setShowReceipt] = useState(false)
  const [createdOrder, setCreatedOrder] = useState(null)
  const [floaters, setFloaters] = useState([])
  const [showConfetti, setShowConfetti] = useState(false)

  const { items, customer, discount, addItem, removeItem, updateQty, setCustomer, setDiscount, clear, subtotal, total } = useCartStore()

  // Queries
  const { data: activeShiftRes, isLoading: isLoadingShift } = useQuery({
    queryKey: ['active-shift'],
    queryFn: getActiveShift
  })
  const activeShift = activeShiftRes?.data?.data

  const { data: productsRes } = useQuery({
    queryKey: ['pos-products'],
    queryFn: () => getProducts({ isAvailable: true })
  })

  const { data: customersRes } = useQuery({
    queryKey: ['pos-customers', custSearch],
    queryFn: () => getCustomers({ search: custSearch }),
    enabled: custSearch.length > 2
  })

  const { data: tablesRes } = useQuery({
    queryKey: ['pos-tables', branchId],
    queryFn: () => getTables({ branch: branchId }),
    enabled: !!branchId
  })
  const tables = tablesRes?.data?.data || []

  // Mutations
  const orderMutation = useMutation({
    mutationFn: createOrder,
    onSuccess: (res) => {
      setCreatedOrder(res.data)
      setShowReceipt(true)
      setShowConfetti(true)
      clear()
      setSelectedTable('')
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['low-stock'] })
      queryClient.invalidateQueries({ queryKey: ['pos-products'] })
      toast.success('Order placed successfully! ☕')
      setTimeout(() => setShowConfetti(false), 4000)
    }
  })

  const handleAddItem = (product, e) => {
    addItem(product)
    if (e) {
      const rect = e.currentTarget.getBoundingClientRect()
      const x = rect.left + rect.width / 2
      const y = rect.top + rect.height / 2
      const id = Date.now() + Math.random()
      
      setFloaters(prev => [...prev, { id, x, y, image: product.image }])
      setTimeout(() => {
        setFloaters(prev => prev.filter(f => f.id !== id))
      }, 800)
    }
  }

  const products = productsRes?.data || []
  const customers = customersRes?.data || []

  const filteredProducts = products.filter(p => {
    const matchesCat = activeCategory === 'All' || p.category === activeCategory
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase())
    return matchesCat && matchesSearch
  })

  const handleCheckout = (paymentMethod) => {
    if (items.length === 0) return toast.error('Cart is empty!')
    if (!activeShift) return toast.error('⚠️ No open shift. Please open the cash drawer first.')
    const orderData = {
      items: items.map(i => ({
        product: i._id,
        name: i.name,
        price: i.price,
        quantity: i.quantity
      })),
      subtotal,
      discountPercent: discount,
      discountAmount: subtotal * (discount / 100),
      total,
      paymentMethod,
      customer: customer?._id,
      table: selectedTable || undefined,
      tableNumber: tables.find(t => t._id === selectedTable)?.number || undefined
    }
    orderMutation.mutate(orderData)
  }

  const printReceipt = () => window.print()

  const handleDownloadPDF = async () => {
    if (!createdOrder?._id) return
    try {
      const res = await downloadOrderReceipt(createdOrder._id)
      downloadBlob(res.data, `receipt-${createdOrder.orderNumber}.pdf`)
      toast.success('Receipt saved! 📄')
    } catch {
      toast.error('Could not generate PDF')
    }
  }

  if (!isLoadingShift && !activeShift) {
    return (
      <div className="h-[calc(100vh-7rem)] flex items-center justify-center bg-gray-50 dark:bg-coffee-950 p-6 rounded-3xl border border-coffee-100 dark:border-coffee-900 shadow-xl overflow-hidden relative">
        {/* Decorative ambient blobs */}
        <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-amber-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-coffee-800/10 rounded-full blur-3xl" />
        
        <div className="text-center max-w-md space-y-6 relative z-10 animate-fade-in">
          <div className="w-20 h-20 rounded-3xl bg-amber-500/10 flex items-center justify-center mx-auto text-4xl shadow-lg border border-amber-500/20">
            🔒
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-coffee-900 dark:text-coffee-100">Cash Drawer is Closed</h2>
            <p className="text-sm text-coffee-600 dark:text-coffee-400">
              For security and financial compliance, you must open a cash register shift drawer before processing checkouts in the POS system.
            </p>
          </div>
          <button
            onClick={() => navigate('/shifts')}
            className="btn-primary px-6 py-3 rounded-xl font-bold shadow-lg shadow-coffee-900/20 text-xs inline-flex items-center gap-2"
          >
            🔑 Open Cash Register Shift
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-7rem)] animate-fade-in print:hidden">
      {/* Product Selection area */}
      <div className="lg:col-span-8 flex flex-col h-full space-y-4 min-w-0">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            placeholder="Search products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input sm:max-w-xs focus:ring-coffee-700"
          />
          <div className="flex overflow-x-auto gap-2 pb-1 scrollbar-none">
            {['All', ...CATEGORIES].map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold shrink-0 transition-all ${
                  activeCategory === cat
                    ? 'bg-coffee-800 text-white dark:bg-coffee-700 shadow-md'
                    : 'bg-white dark:bg-coffee-900 text-coffee-700 dark:text-coffee-300 border border-coffee-100 dark:border-coffee-800'
                }`}
              >
                {cat === 'All' ? '🍽️' : CATEGORY_EMOJIS[cat]} {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Products Grid */}
        <div className="flex-1 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4 pr-1">
          {filteredProducts.length === 0 ? (
            <div className="col-span-full flex flex-col items-center justify-center py-12 text-coffee-400">
              <span className="text-4xl">☕</span>
              <p className="mt-2 text-sm">No products found</p>
            </div>
          ) : filteredProducts.map(p => (
            <motion.div
              layout
              key={p._id}
              onClick={(e) => handleAddItem(p, e)}
              className="card-hover p-4 flex flex-col justify-between select-none h-44 cursor-pointer"
            >
              <div className="relative">
                {p.image ? (
                  <img src={p.image} alt={p.name} className="w-12 h-12 rounded-xl object-cover mb-2" />
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-coffee-100 dark:bg-coffee-800 flex items-center justify-center text-xl mb-2">
                    {CATEGORY_EMOJIS[p.category] || '☕'}
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-sm truncate text-coffee-900 dark:text-coffee-100">{p.name}</h4>
                <p className="text-xs text-coffee-500">{p.category}</p>
              </div>
              <div className="flex items-center justify-between mt-2 pt-2 border-t border-coffee-50 dark:border-coffee-800/50">
                <span className="font-bold text-coffee-900 dark:text-coffee-50 text-sm">
                  {formatCurrency(p.price)}
                </span>
                <span className="text-xs text-latte font-semibold">Add +</span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Cart Sidebar */}
      <div className="lg:col-span-4 card flex flex-col h-full p-4 overflow-hidden border border-coffee-200">
        <h3 className="font-bold text-base text-coffee-900 dark:text-coffee-100 mb-3 flex items-center justify-between">
          <span>Current Order</span>
          {items.length > 0 && (
            <button onClick={clear} className="text-xs text-red-500 hover:underline">Clear all</button>
          )}
        </h3>

        {/* Table Selection */}
        <div className="mb-3">
          <label className="label text-xs">Assign Table</label>
          <select
            value={selectedTable}
            onChange={(e) => setSelectedTable(e.target.value)}
            className="input text-xs py-2"
          >
            <option value="">🚶 Walk-in (No Table)</option>
            {tables.map(t => (
              <option key={t._id} value={t._id}>
                🪑 Table {t.number} ({t.zone}) {t.status !== 'available' ? `— [${t.status}]` : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Customer Search & Select */}
        <div className="mb-4">
          <label className="label text-xs">Link Customer (Loyalty)</label>
          <div className="relative">
            <input
              type="text"
              placeholder="Search by phone or name..."
              value={custSearch}
              onChange={(e) => setCustSearch(e.target.value)}
              className="input pr-8 text-xs py-2"
            />
            {customer && (
              <button
                onClick={() => { setCustomer(null); setCustSearch('') }}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-red-500 text-sm"
              >
                ✕
              </button>
            )}
          </div>
          {custSearch.length > 2 && !customer && (
            <div className="absolute bg-white dark:bg-coffee-950 border border-coffee-100 dark:border-coffee-800 rounded-xl shadow-lg mt-1 w-64 z-10 max-h-48 overflow-y-auto">
              {customers.length === 0 ? (
                <p className="p-3 text-xs text-coffee-400">No customers found</p>
              ) : customers.map(c => (
                <button
                  key={c._id}
                  onClick={() => { setCustomer(c); setCustSearch(c.name) }}
                  className="w-full text-left p-2.5 hover:bg-coffee-50 dark:hover:bg-coffee-900 text-xs border-b border-coffee-50 dark:border-coffee-800 last:border-0"
                >
                  <p className="font-semibold">{c.name}</p>
                  <p className="text-coffee-500">{c.phone} · {c.tier} ({c.loyaltyPoints} pts)</p>
                </button>
              ))}
            </div>
          )}
          {customer && (
            <div className="mt-2 p-2 bg-coffee-50 dark:bg-coffee-900/50 rounded-xl flex items-center justify-between text-xs border border-coffee-100 dark:border-coffee-800">
              <div>
                <p className="font-semibold">{customer.name}</p>
                <p className="text-coffee-500">{customer.tier} · {customer.loyaltyPoints} pts available</p>
              </div>
              <span className="badge badge-coffee">Connected</span>
            </div>
          )}
        </div>

        {/* Cart items list */}
        <div className="flex-1 overflow-y-auto space-y-3 mb-4 pr-1">
          {items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-coffee-400 py-12">
              <span className="text-3xl">🛒</span>
              <p className="mt-2 text-xs">Cart is empty</p>
            </div>
          ) : items.map(item => (
            <div key={item._id} className="flex gap-3 py-2 border-b border-coffee-50 dark:border-coffee-800/50 last:border-0">
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-xs text-coffee-950 dark:text-coffee-100 truncate">{item.name}</p>
                <p className="text-xs text-coffee-500">{formatCurrency(item.price)}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button onClick={() => updateQty(item._id, item.quantity - 1)} className="w-6 h-6 rounded-lg bg-coffee-100 dark:bg-coffee-800 flex items-center justify-center text-xs font-bold">-</button>
                <span className="text-xs font-semibold w-4 text-center">{item.quantity}</span>
                <button onClick={() => updateQty(item._id, item.quantity + 1)} className="w-6 h-6 rounded-lg bg-coffee-100 dark:bg-coffee-800 flex items-center justify-center text-xs font-bold">+</button>
              </div>
              <div className="text-right min-w-[4.5rem]">
                <p className="text-xs font-bold text-coffee-950 dark:text-coffee-50">{formatCurrency(item.price * item.quantity)}</p>
                <button onClick={() => removeItem(item._id)} className="text-[10px] text-red-400 hover:text-red-600">Remove</button>
              </div>
            </div>
          ))}
        </div>

        {/* Calculations & Discounts */}
        <div className="border-t border-coffee-100 dark:border-coffee-800 pt-3 space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-coffee-500">Subtotal</span>
            <span className="font-semibold">{formatCurrency(subtotal)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-coffee-500">Discount (%)</span>
            <input
              type="number"
              min="0"
              max="100"
              value={discount}
              onChange={(e) => setDiscount(Number(e.target.value))}
              className="w-16 text-right border border-coffee-200 dark:border-coffee-700 bg-white dark:bg-coffee-900 rounded-lg p-1 text-xs focus:ring-coffee-700"
            />
          </div>
          <div className="border-t border-coffee-100 dark:border-coffee-800 pt-2 flex items-center justify-between">
            <span className="font-semibold text-coffee-900 dark:text-coffee-100">Total</span>
            <span className="font-bold text-lg text-coffee-900 dark:text-coffee-50">{formatCurrency(total)}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="grid grid-cols-2 gap-2 mt-4">
          <button
            onClick={() => handleCheckout('cash')}
            disabled={items.length === 0 || orderMutation.isPending}
            className="btn-primary py-3 w-full text-center"
          >
            💵 Cash Pay
          </button>
          <button
            onClick={() => handleCheckout('card')}
            disabled={items.length === 0 || orderMutation.isPending}
            className="btn-secondary py-3 w-full text-center"
          >
            💳 Card Pay
          </button>
        </div>
      </div>

      {/* Receipt Modal */}
      <AnimatePresence>
        {showReceipt && createdOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowReceipt(false)} />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white text-black p-6 rounded-2xl w-full max-w-sm relative z-10 shadow-2xl font-mono text-xs"
            >
              <div className="text-center space-y-1 mb-4">
                <h2 className="text-base font-bold">☕ CoffeeMaster</h2>
                <p>{createdOrder.branch?.name || 'Tunis Lac 2'}</p>
                <p>Rue du Lac Turkana, Les Berges du Lac, Tunis</p>
                <p>Tel: +216 71 860 120</p>
              </div>

              <div className="border-b border-dashed border-black/40 pb-2 mb-2">
                <p>Order: {createdOrder.orderNumber}</p>
                <p>Date: {new Date(createdOrder.createdAt).toLocaleString()}</p>
                <p>Cashier: {createdOrder.cashier?.name}</p>
                {createdOrder.tableNumber && <p>Table: Table {createdOrder.tableNumber}</p>}
                {createdOrder.customer && <p>Cust: {createdOrder.customer?.name}</p>}
              </div>

              <div className="border-b border-dashed border-black/40 pb-2 mb-2 space-y-1.5">
                {createdOrder.items.map((item, i) => (
                  <div key={i} className="flex justify-between">
                    <div>
                      <span>{item.name}</span>
                      <p className="text-[10px] text-black/60">Qty: {item.quantity} x {formatCurrency(item.price)}</p>
                    </div>
                    <span>{formatCurrency(item.price * item.quantity)}</span>
                  </div>
                ))}
              </div>

              <div className="space-y-1 mb-4 text-right">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>{formatCurrency(createdOrder.subtotal)}</span>
                </div>
                {createdOrder.discountAmount > 0 && (
                  <div className="flex justify-between">
                    <span>Discount ({createdOrder.discountPercent}%)</span>
                    <span>-{formatCurrency(createdOrder.discountAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-sm pt-1 border-t border-dashed border-black/40">
                  <span>Total</span>
                  <span>{formatCurrency(createdOrder.total)}</span>
                </div>
              </div>

              <div className="text-center border-t border-dashed border-black/40 pt-4 space-y-2 print:hidden">
                <p>Thank you for your visit! ☕</p>
                <div className="flex gap-2">
                  <button onClick={printReceipt} className="btn-secondary flex-1 text-center py-2 text-xs">🖨️ Print</button>
                  <button onClick={handleDownloadPDF} className="btn-primary flex-1 text-center py-2 text-xs">📄 PDF</button>
                  <button onClick={() => setShowReceipt(false)} className="btn-ghost border border-coffee-200 flex-1 text-center py-2 text-xs text-coffee-600">Close</button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Floating Product Addition Particles */}
      <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
        <AnimatePresence>
          {floaters.map(f => (
            <motion.div
              key={f.id}
              initial={{ x: f.x - 24, y: f.y - 24, scale: 1.2, opacity: 1, rotate: 0 }}
              animate={{ 
                x: window.innerWidth - 180, 
                y: 200, 
                scale: 0.3, 
                opacity: 0.2,
                rotate: 360
              }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.7, ease: [0.25, 1, 0.5, 1] }}
              className="absolute w-12 h-12 rounded-2xl bg-coffee-gradient flex items-center justify-center text-white text-base font-bold shadow-xl border-2 border-white pointer-events-none overflow-hidden"
            >
              {f.image ? (
                <img src={f.image} className="w-full h-full object-cover" />
              ) : (
                '☕'
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Money Shower checkout celebration */}
      <AnimatePresence>
        {showConfetti && (
          <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden flex items-center justify-center">
            {/* Money notes & gold coins falling */}
            {[...Array(45)].map((_, i) => {
              const xStart = Math.random() * window.innerWidth
              const duration = 2.0 + Math.random() * 1.5
              const delay = Math.random() * 0.8
              const content = ['💵', '🪙', '💰', '✨', '☕'][i % 5]
              return (
                <motion.div
                  key={i}
                  initial={{ y: -50, x: xStart, opacity: 1, scale: 0.8 + Math.random() * 0.5, rotate: 0 }}
                  animate={{ 
                    y: window.innerHeight + 50, 
                    x: xStart + (Math.random() * 120 - 60),
                    rotate: Math.random() * 720 - 360,
                    opacity: [1, 1, 0]
                  }}
                  transition={{ duration, delay, ease: 'linear', repeat: Infinity }}
                  className="absolute text-2xl select-none"
                >
                  {content}
                </motion.div>
              )
            })}
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
