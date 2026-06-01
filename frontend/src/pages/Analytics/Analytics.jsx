import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getRevenueChart, getPeakHours, getForecast, getProductProfitability, getBranches } from '../../api'
import { formatCurrency } from '../../utils'
import { Bar, Line, Doughnut } from 'react-chartjs-2'
import { Chart, registerables } from 'chart.js'
import { motion } from 'framer-motion'
Chart.register(...registerables)

const chartDefaults = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false } },
  scales: {
    x: { grid: { display: false }, ticks: { color: '#9b7b65', font: { size: 10 } } },
    y: { grid: { color: 'rgba(111,78,55,0.06)' }, ticks: { color: '#9b7b65', font: { size: 10 } } },
  },
}

export default function Analytics() {
  const [branch, setBranch] = useState('')
  const [period, setPeriod] = useState('daily')
  const [days, setDays] = useState(30)

  const { data: branchesRes } = useQuery({ queryKey: ['branches'], queryFn: getBranches })
  const { data: revenueRes } = useQuery({ queryKey: ['revenue-chart', branch, period, days], queryFn: () => getRevenueChart({ branch, period, days }) })
  const { data: peakRes } = useQuery({ queryKey: ['peak-hours', branch, days], queryFn: () => getPeakHours({ branch, days }) })
  const { data: forecastRes } = useQuery({ queryKey: ['forecast', branch], queryFn: () => getForecast({ branch, days: 7 }) })
  const { data: profitRes } = useQuery({ queryKey: ['product-profitability', branch, days], queryFn: () => getProductProfitability({ branch, days }) })

  const branches = branchesRes?.data?.data || []
  const revenueData = revenueRes?.data?.data || []
  const peakData = peakRes?.data?.data || []
  const forecastData = forecastRes?.data?.forecast || []
  const profitData = profitRes?.data?.data || []

  const revenueChart = {
    labels: revenueData.map(d => period === 'monthly' ? `${d._id.month}/${d._id.year}` : `${d._id.day}/${d._id.month}`),
    datasets: [{
      label: 'Revenue (DZD)',
      data: revenueData.map(d => d.revenue),
      backgroundColor: 'rgba(111,78,55,0.7)',
      borderColor: '#6F4E37',
      borderWidth: 1,
      borderRadius: 6,
    }]
  }

  const peakChart = {
    labels: Array.from({ length: 24 }, (_, i) => `${i}:00`),
    datasets: [{
      label: 'Orders',
      data: Array.from({ length: 24 }, (_, i) => {
        const found = peakData.find(p => p._id.hour === i)
        return found ? found.orders : 0
      }),
      backgroundColor: peakData.map((_, i) => {
        const found = peakData[i]
        if (!found) return 'rgba(111,78,55,0.3)'
        const max = Math.max(...peakData.map(p => p.orders))
        const ratio = found.orders / max
        return `rgba(111,78,55,${0.2 + ratio * 0.8})`
      }),
      borderRadius: 4,
    }]
  }

  const forecastChart = {
    labels: forecastData.map(f => f.date),
    datasets: [{
      label: 'Predicted Revenue',
      data: forecastData.map(f => f.predicted),
      borderColor: '#C9A96E',
      backgroundColor: 'rgba(201,169,110,0.1)',
      borderWidth: 2.5,
      fill: true,
      tension: 0.4,
      pointBackgroundColor: '#C9A96E',
      pointRadius: 5,
      borderDash: [5, 5],
    }]
  }

  const profitChart = {
    labels: profitData.map(p => p._id.name),
    datasets: [{
      data: profitData.map(p => p.totalRevenue),
      backgroundColor: ['#6F4E37', '#8B6347', '#A87858', '#C59068', '#E0A978', '#F0C090', '#D4956A'],
      borderWidth: 0,
      hoverOffset: 6,
    }]
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Filters */}
      <div className="card p-4 flex flex-col sm:flex-row gap-4 border border-coffee-100">
        <div className="flex-1">
          <label className="label text-[10px]">Branch</label>
          <select value={branch} onChange={e => setBranch(e.target.value)} className="input text-xs py-1.5">
            <option value="">All Branches</option>
            {branches.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
          </select>
        </div>
        <div className="flex-1">
          <label className="label text-[10px]">Period Grouping</label>
          <select value={period} onChange={e => setPeriod(e.target.value)} className="input text-xs py-1.5">
            <option value="daily">Daily</option>
            <option value="monthly">Monthly</option>
          </select>
        </div>
        <div className="flex-1">
          <label className="label text-[10px]">Days Range</label>
          <select value={days} onChange={e => setDays(Number(e.target.value))} className="input text-xs py-1.5">
            <option value={7}>Last 7 days</option>
            <option value={14}>Last 14 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
        </div>
      </div>

      {/* Revenue Bar Chart */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="card">
        <h3 className="font-semibold text-coffee-900 dark:text-coffee-100 mb-4">📊 Revenue by Period</h3>
        <div className="h-64">
          {revenueData.length > 0
            ? <Bar data={revenueChart} options={chartDefaults} />
            : <div className="h-full flex items-center justify-center text-coffee-400 text-sm">No data available</div>
          }
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Peak hours chart */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="card">
          <h3 className="font-semibold text-coffee-900 dark:text-coffee-100 mb-4">⏰ Peak Hours Heatmap</h3>
          <div className="h-52">
            {peakData.length > 0
              ? <Bar data={peakChart} options={{ ...chartDefaults, scales: { ...chartDefaults.scales, x: { ...chartDefaults.scales.x, ticks: { ...chartDefaults.scales.x.ticks, maxTicksLimit: 12 } } } }} />
              : <div className="h-full flex items-center justify-center text-coffee-400 text-sm">No data available</div>
            }
          </div>
        </motion.div>

        {/* Product Profitability Donut */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="card">
          <h3 className="font-semibold text-coffee-900 dark:text-coffee-100 mb-4">☕ Top Product Revenue</h3>
          <div className="flex items-center gap-4 h-52">
            <div className="flex-1 h-full">
              {profitData.length > 0
                ? <Doughnut data={profitChart} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, cutout: '65%' }} />
                : <div className="h-full flex items-center justify-center text-coffee-400 text-sm">No data available</div>
              }
            </div>
            {profitData.length > 0 && (
              <div className="space-y-1.5 text-xs shrink-0 max-w-[50%]">
                {profitData.slice(0, 6).map((p, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: ['#6F4E37', '#8B6347', '#A87858', '#C59068', '#E0A978', '#F0C090'][i] }} />
                    <span className="truncate text-coffee-700 dark:text-coffee-300">{p._id.name}</span>
                    <span className="font-bold text-coffee-900 dark:text-coffee-100 shrink-0">{formatCurrency(p.totalRevenue)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Forecast Chart */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="card">
        <div className="flex items-center gap-3 mb-4">
          <h3 className="font-semibold text-coffee-900 dark:text-coffee-100">🔮 7-Day Sales Forecast</h3>
          <span className="badge badge-info text-xs">Moving Average</span>
        </div>
        <div className="h-52">
          {forecastData.length > 0
            ? <Line data={forecastChart} options={{ ...chartDefaults, scales: { ...chartDefaults.scales } }} />
            : <div className="h-full flex items-center justify-center text-coffee-400 text-sm">Not enough historical data (need 7+ days)</div>
          }
        </div>
        {forecastData.length > 0 && (
          <div className="mt-4 grid grid-cols-3 sm:grid-cols-7 gap-2">
            {forecastData.map((f, i) => (
              <div key={i} className="text-center bg-coffee-50 dark:bg-coffee-900/50 rounded-xl p-2">
                <p className="text-[10px] text-coffee-500">{f.date.slice(5)}</p>
                <p className="text-xs font-bold text-latte">{formatCurrency(f.predicted)}</p>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  )
}
