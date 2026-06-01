import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getBranches, downloadSalesPDF, downloadSalesExcel, downloadExpensesExcel } from '../../api'
import { downloadBlob } from '../../utils'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'

export default function Reports() {
  const [branch, setBranch] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [loading, setLoading] = useState({})

  const { data: branchesRes } = useQuery({ queryKey: ['branches'], queryFn: getBranches })
  const branches = branchesRes?.data?.data || []

  const setLoadingKey = (key, val) => setLoading(prev => ({ ...prev, [key]: val }))

  const handleDownload = async (key, fn, filename) => {
    try {
      setLoadingKey(key, true)
      const params = {}
      if (branch) params.branch = branch
      if (from) params.from = from
      if (to) params.to = to
      const res = await fn(params)
      downloadBlob(res.data, filename)
      toast.success(`${filename} downloaded!`)
    } catch {
      toast.error('Download failed. Please try again.')
    } finally {
      setLoadingKey(key, false)
    }
  }

  const reports = [
    {
      key: 'sales-pdf',
      icon: '📄',
      title: 'Sales Report (PDF)',
      description: 'Download detailed order-by-order sales report with totals and cashier names.',
      format: 'PDF',
      color: 'bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-800',
      iconBg: 'bg-red-100 dark:bg-red-900/40',
      fn: () => handleDownload('sales-pdf', downloadSalesPDF, 'sales-report.pdf'),
    },
    {
      key: 'sales-excel',
      icon: '📊',
      title: 'Sales Report (Excel)',
      description: 'Full order history with cashier, customer, branch, discount, payment method.',
      format: 'XLSX',
      color: 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-800',
      iconBg: 'bg-emerald-100 dark:bg-emerald-900/40',
      fn: () => handleDownload('sales-excel', downloadSalesExcel, 'sales-report.xlsx'),
    },
    {
      key: 'expenses-excel',
      icon: '💸',
      title: 'Expenses Report (Excel)',
      description: 'All recorded expenses grouped by category, branch and payment method.',
      format: 'XLSX',
      color: 'bg-amber-50 dark:bg-amber-900/20 border-amber-100 dark:border-amber-800',
      iconBg: 'bg-amber-100 dark:bg-amber-900/40',
      fn: () => handleDownload('expenses-excel', downloadExpensesExcel, 'expenses-report.xlsx'),
    },
  ]

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Filters */}
      <div className="card p-5 border border-coffee-100">
        <h3 className="font-semibold text-coffee-900 dark:text-coffee-100 mb-4">📅 Filter Report Date Range</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="label">Branch</label>
            <select value={branch} onChange={e => setBranch(e.target.value)} className="input">
              <option value="">All Branches</option>
              {branches.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Date From</label>
            <input type="date" value={from} onChange={e => setFrom(e.target.value)} className="input" />
          </div>
          <div>
            <label className="label">Date To</label>
            <input type="date" value={to} onChange={e => setTo(e.target.value)} className="input" />
          </div>
        </div>
      </div>

      {/* Report Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {reports.map((r, i) => (
          <motion.div
            key={r.key}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className={`card border ${r.color} flex flex-col gap-4`}
          >
            <div className="flex items-center gap-4">
              <div className={`w-14 h-14 rounded-2xl ${r.iconBg} flex items-center justify-center text-3xl`}>
                {r.icon}
              </div>
              <div>
                <h4 className="font-bold text-coffee-950 dark:text-coffee-50 text-sm">{r.title}</h4>
                <span className="badge badge-coffee text-[10px]">{r.format}</span>
              </div>
            </div>
            <p className="text-xs text-coffee-500 flex-1">{r.description}</p>
            <button
              onClick={r.fn}
              disabled={loading[r.key]}
              className="btn-primary w-full py-2.5 text-sm"
            >
              {loading[r.key] ? '⏳ Generating...' : `⬇️ Download ${r.format}`}
            </button>
          </motion.div>
        ))}
      </div>

      {/* Info box */}
      <div className="card border border-coffee-100 bg-coffee-50 dark:bg-coffee-900/30 p-5">
        <h4 className="font-semibold text-coffee-800 dark:text-coffee-200 mb-3 flex items-center gap-2">
          <span>ℹ️</span> About Reports
        </h4>
        <ul className="space-y-2 text-xs text-coffee-600 dark:text-coffee-400">
          <li>📄 <strong>PDF Sales Report</strong> — Best for printing and sharing with stakeholders. Includes up to 100 orders.</li>
          <li>📊 <strong>Excel Sales Report</strong> — Full dataset for detailed analysis in Excel or Google Sheets. Unlimited rows.</li>
          <li>💸 <strong>Excel Expenses Report</strong> — All expense entries with categories, branches, and payment methods.</li>
          <li>📅 Use the date range filter above to narrow the period covered by any report.</li>
          <li>🏪 Use the branch filter to generate per-branch reports (or leave blank for all branches).</li>
        </ul>
      </div>
    </div>
  )
}
