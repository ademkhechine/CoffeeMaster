import { useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getDashboard, getRevenueChart, getLowStock, getExpiring } from '../../api'
import { formatCurrency, formatDate, STOCK_STATUS, getSocketUrl } from '../../utils'
import { useAuthStore } from '../../store'
import { motion } from 'framer-motion'
import { Line, Bar } from 'react-chartjs-2'
import { Chart, registerables } from 'chart.js'
import { io } from 'socket.io-client'
Chart.register(...registerables)

const fade = (delay = 0) => ({
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0 },
  transition: { delay, duration: 0.3 }
})

const KPI = ({ icon, label, value, sub, gradient, trend, idx }) => (
  <motion.div {...fade(idx * 0.07)}
    className="relative overflow-hidden bg-white dark:bg-coffee-900 rounded-2xl border border-coffee-100 dark:border-coffee-800 p-5 shadow-sm hover:shadow-md transition-all group">
    {/* Gradient blob */}
    <div className={`absolute -right-4 -top-4 w-20 h-20 rounded-full opacity-10 group-hover:opacity-20 transition-opacity ${gradient}`} />
    <div className="flex items-start justify-between">
      <div>
        <p className="text-xs font-semibold text-coffee-500 uppercase tracking-widest mb-2">{label}</p>
        <p className="text-2xl font-bold text-coffee-900 dark:text-coffee-50 leading-none">{value}</p>
        <p className="text-xs text-coffee-400 mt-1.5">{sub}</p>
      </div>
      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl ${gradient} shadow-lg`}>
        {icon}
      </div>
    </div>
    {trend != null && (
      <div className={`mt-3 flex items-center gap-1 text-xs font-medium ${trend >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
        {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}% vs last period
      </div>
    )}
  </motion.div>
)

export default function Dashboard() {
  const { user, token } = useAuthStore()
  const qc = useQueryClient()
  const now = new Date()
  const hour = now.getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  const { data: dash, isLoading } = useQuery({ queryKey: ['dashboard'], queryFn: () => getDashboard() })
  const { data: chart } = useQuery({ queryKey: ['revenue-chart'], queryFn: () => getRevenueChart({ days: 14 }) })
  const { data: lowStockRes } = useQuery({ queryKey: ['low-stock'], queryFn: () => getLowStock() })
  const { data: expiringRes } = useQuery({ queryKey: ['expiring'], queryFn: () => getExpiring() })

  useEffect(() => {
    if (!token) return
    const socket = io(getSocketUrl(), { auth: { token } })
    socket.emit('join-cashier')

    const refreshAll = () => {
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      qc.invalidateQueries({ queryKey: ['revenue-chart'] })
      qc.invalidateQueries({ queryKey: ['low-stock'] })
      qc.invalidateQueries({ queryKey: ['expiring'] })
    }

    socket.on('order:created', refreshAll)
    socket.on('order:updated', refreshAll)

    return () => {
      socket.disconnect()
    }
  }, [token, qc])

  const d = dash?.data?.data || dash?.data
  const chartData = chart?.data?.data || chart?.data || []
  const lowStockItems = lowStockRes?.data || []
  const expiringItems = expiringRes?.data || []

  const isDark = document.documentElement.classList.contains('dark')
  const textColor = isDark ? 'rgba(214,192,175,0.7)' : 'rgba(111,78,55,0.6)'
  const gridColor = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(111,78,55,0.05)'

  const revenueChart = {
    labels: chartData.map(d => {
      const date = new Date(d._id.year, d._id.month - 1, d._id.day)
      return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
    }),
    datasets: [{
      label: 'Revenue',
      data: chartData.map(d => d.revenue),
      borderColor: '#B8860B',
      backgroundColor: (ctx) => {
        const gradient = ctx.chart.ctx.createLinearGradient(0, 0, 0, 220)
        gradient.addColorStop(0, 'rgba(184,134,11,0.25)')
        gradient.addColorStop(1, 'rgba(184,134,11,0)')
        return gradient
      },
      borderWidth: 2.5,
      fill: true,
      tension: 0.45,
      pointBackgroundColor: '#B8860B',
      pointBorderColor: '#fff',
      pointBorderWidth: 2,
      pointRadius: 4,
      pointHoverRadius: 6,
    }]
  }

  const ordersChart = {
    labels: chartData.map(d => {
      const date = new Date(d._id.year, d._id.month - 1, d._id.day)
      return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
    }),
    datasets: [{
      label: 'Orders',
      data: chartData.map(d => d.orders),
      backgroundColor: 'rgba(111,78,55,0.7)',
      borderRadius: 6,
      borderSkipped: false,
    }]
  }

  const chartOpts = (yLabel = '') => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: { backgroundColor: '#3E2723', titleColor: '#fff', bodyColor: '#D6C0AF', padding: 10, cornerRadius: 10 } },
    scales: {
      x: { grid: { display: false }, ticks: { color: textColor, font: { size: 10 } }, border: { display: false } },
      y: { grid: { color: gridColor }, ticks: { color: textColor, font: { size: 10 } }, border: { display: false } }
    }
  })

  const profitMargin = d?.revenue?.month > 0 ? Math.round((d?.profit?.month / d?.revenue?.month) * 100) : 0

  if (isLoading) return (
    <div className="flex flex-col items-center justify-center h-64 gap-3">
      <div className="w-12 h-12 border-4 border-coffee-200 border-t-amber-500 rounded-full animate-spin" />
      <p className="text-coffee-500 text-sm">Loading dashboard…</p>
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Greeting bar */}
      <motion.div {...fade(0)} className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-coffee-900 dark:text-coffee-50">
            {greeting}, {user?.name?.split(' ')[0]} ☕
          </h2>
          <p className="text-coffee-500 text-sm mt-0.5">
            {now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">System Online</span>
        </div>
      </motion.div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <KPI idx={0} icon="💰" label="Today's Revenue" value={formatCurrency(d?.revenue?.today || 0)} sub="Completed orders today" gradient="bg-emerald-500" />
        <KPI idx={1} icon="📅" label="Weekly Revenue" value={formatCurrency(d?.revenue?.week || 0)} sub="Last 7 days" gradient="bg-sky-500" />
        <KPI idx={2} icon="📈" label="Monthly Revenue" value={formatCurrency(d?.revenue?.month || 0)} sub="This month" gradient="bg-violet-500" />
        <KPI idx={3} icon="🧾" label="Today's Orders" value={d?.orders?.today || 0} sub={`${d?.orders?.month || 0} orders this month`} gradient="bg-amber-500" />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Revenue trend */}
        <motion.div {...fade(0.28)} className="card xl:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-coffee-900 dark:text-coffee-100">Revenue Trend</h3>
            <span className="badge badge-coffee text-xs">Last 14 days</span>
          </div>
          <div className="h-52">
            {chartData.length > 0
              ? <Line data={revenueChart} options={chartOpts()} />
              : <div className="h-full flex flex-col items-center justify-center text-coffee-400 gap-2">
                  <span className="text-3xl">📊</span>
                  <p className="text-sm">No order data yet — make your first sale!</p>
                </div>}
          </div>
        </motion.div>

        {/* Month summary */}
        <motion.div {...fade(0.34)} className="card space-y-4">
          <h3 className="font-bold text-coffee-900 dark:text-coffee-100">Monthly Summary</h3>
          <div className="space-y-3">
            {[
              { label: 'Revenue', value: formatCurrency(d?.revenue?.month || 0), color: 'text-emerald-600' },
              { label: 'Expenses', value: formatCurrency(d?.totalExpenses || 0), color: 'text-red-500' },
            ].map(({ label, value, color }) => (
              <div key={label} className="flex justify-between items-center py-2 border-b border-coffee-50 dark:border-coffee-800">
                <span className="text-sm text-coffee-500">{label}</span>
                <span className={`text-sm font-bold ${color}`}>{value}</span>
              </div>
            ))}
            <div className="flex justify-between items-center py-2">
              <span className="text-sm font-semibold text-coffee-700 dark:text-coffee-300">Net Profit</span>
              <span className={`text-base font-bold ${(d?.profit?.month || 0) >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                {formatCurrency(d?.profit?.month || 0)}
              </span>
            </div>
          </div>

          {/* Profit margin pill */}
          <div className={`flex items-center justify-between p-3 rounded-xl ${profitMargin >= 0 ? 'bg-emerald-50 dark:bg-emerald-900/20' : 'bg-red-50 dark:bg-red-900/20'}`}>
            <span className="text-xs font-medium text-coffee-500">Profit Margin</span>
            <span className={`text-sm font-bold ${profitMargin >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
              {profitMargin}%
            </span>
          </div>

          {/* Best sellers */}
          {(d?.bestSellers || []).length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs text-coffee-500 font-semibold uppercase tracking-wide">Top Sellers</p>
              {(d?.bestSellers || []).slice(0, 4).map((p, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-xs text-coffee-400 w-4">#{i + 1}</span>
                  <span className="text-xs text-coffee-800 dark:text-coffee-200 flex-1 truncate">{p.name}</span>
                  <span className="text-xs font-semibold text-amber-600 bg-amber-50 dark:bg-amber-900/30 px-1.5 py-0.5 rounded-lg">{p.qty}</span>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>

      {/* Orders chart + Alerts row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Orders bar chart */}
        <motion.div {...fade(0.4)} className="card xl:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-coffee-900 dark:text-coffee-100">Daily Orders</h3>
            <span className="badge badge-coffee text-xs">Last 14 days</span>
          </div>
          <div className="h-44">
            {chartData.length > 0
              ? <Bar data={ordersChart} options={chartOpts()} />
              : <div className="h-full flex items-center justify-center text-coffee-400 text-sm">No data yet</div>}
          </div>
        </motion.div>

        {/* Quick stats column */}
        <div className="space-y-4">
          {/* Low stock */}
          <motion.div {...fade(0.44)} className="card space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-coffee-900 dark:text-coffee-100 text-sm">⚠️ Low Stock</h3>
              <span className={`badge ${lowStockItems.length > 0 ? 'badge-warning' : 'badge-success'}`}>{lowStockItems.length}</span>
            </div>
            {lowStockItems.length === 0
              ? <p className="text-xs text-coffee-400 py-2 text-center">All stock levels healthy ✅</p>
              : lowStockItems.slice(0, 3).map(ing => {
                  const s = STOCK_STATUS(ing.quantity, ing.minQuantity)
                  return (
                    <div key={ing._id} className="flex items-center justify-between py-1.5 border-b border-coffee-50 dark:border-coffee-800 last:border-0">
                      <span className="text-xs text-coffee-800 dark:text-coffee-200 truncate">{ing.name}</span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-xs text-coffee-400">{ing.quantity} {ing.unit}</span>
                        <span className={`badge text-[10px] ${s.cls}`}>{s.label}</span>
                      </div>
                    </div>
                  )
                })}
          </motion.div>

          {/* Expiring soon */}
          <motion.div {...fade(0.5)} className="card space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-coffee-900 dark:text-coffee-100 text-sm">🚨 Expiring Soon</h3>
              <span className={`badge ${expiringItems.length > 0 ? 'badge-danger' : 'badge-success'}`}>{expiringItems.length}</span>
            </div>
            {expiringItems.length === 0
              ? <p className="text-xs text-coffee-400 py-2 text-center">Nothing expiring soon ✅</p>
              : expiringItems.slice(0, 3).map(ing => (
                  <div key={ing._id} className="flex items-center justify-between py-1.5 border-b border-coffee-50 dark:border-coffee-800 last:border-0">
                    <span className="text-xs text-coffee-800 dark:text-coffee-200 truncate">{ing.name}</span>
                    <span className="badge badge-danger text-[10px]">Exp {formatDate(ing.expirationDate)}</span>
                  </div>
                ))}
          </motion.div>
        </div>
      </div>
    </div>
  )
}
