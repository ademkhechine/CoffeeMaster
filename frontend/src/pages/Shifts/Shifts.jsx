import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getActiveShift, openShift, closeShift, getShiftHistory } from '../../api'
import { formatCurrency, formatDateTime } from '../../utils'
import { useAuthStore } from '../../store'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'

export default function Shifts() {
  const queryClient = useQueryClient()
  const { user } = useAuthStore()
  const [openingCashInput, setOpeningCashInput] = useState('')
  const [actualCashInput, setActualCashInput] = useState('')
  const [closeNotesInput, setCloseNotesInput] = useState('')
  const [closeModal, setCloseModal] = useState(false)

  const { data: activeRes, isLoading: activeLoading } = useQuery({
    queryKey: ['active-shift'],
    queryFn: () => getActiveShift()
  })

  const { data: historyRes, isLoading: historyLoading } = useQuery({
    queryKey: ['shifts-history'],
    queryFn: () => getShiftHistory(),
    enabled: user?.role === 'admin' || user?.role === 'manager'
  })

  const activeShift = activeRes?.data?.data
  const shiftsHistory = historyRes?.data?.data || []

  const openMutation = useMutation({
    mutationFn: openShift,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['active-shift'] })
      toast.success('Register drawer shift successfully opened!')
      setOpeningCashInput('')
    }
  })

  const closeMutation = useMutation({
    mutationFn: closeShift,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['active-shift'] })
      queryClient.invalidateQueries({ queryKey: ['shifts-history'] })
      toast.success('Shift closed. Cash register locked and variance calculated!')
      setCloseModal(false)
      setActualCashInput('')
      setCloseNotesInput('')
    }
  })

  const handleOpenSubmit = (e) => {
    e.preventDefault()
    const amt = Number(openingCashInput)
    if (openingCashInput === '' || amt < 0) {
      return toast.error('Please enter a valid starting cash amount.')
    }
    openMutation.mutate(amt)
  }

  const handleCloseSubmit = (e) => {
    e.preventDefault()
    const amt = Number(actualCashInput)
    if (actualCashInput === '' || amt < 0) {
      return toast.error('Please enter the actual cash in drawer.')
    }
    closeMutation.mutate({
      actualCash: amt,
      notes: closeNotesInput
    })
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-xl font-bold text-coffee-950 dark:text-coffee-50">💵 Cash Drawer & Shift Ledger</h2>
        <p className="text-xs text-coffee-500">Track cashier shift registers, starting drawer cash balances, and operational cash variances.</p>
      </div>

      {activeLoading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-coffee-600" />
        </div>
      ) : !activeShift ? (
        /* NO ACTIVE SHIFT: OPEN DRAWER FORM */
        <div className="max-w-md mx-auto card border border-coffee-100 dark:border-coffee-800 p-6 space-y-6">
          <div className="text-center">
            <span className="text-5xl block mb-3">🔒</span>
            <h3 className="text-lg font-bold text-coffee-900 dark:text-coffee-100">Drawer Shift is Locked</h3>
            <p className="text-xs text-coffee-500 mt-1">To begin processing orders and accepting payments, open a new register shift.</p>
          </div>

          <form onSubmit={handleOpenSubmit} className="space-y-4 pt-4 border-t border-coffee-50 dark:border-coffee-800/60">
            <div>
              <label className="label font-bold text-xs text-coffee-800 dark:text-coffee-200">Opening Cash Balance (TND) *</label>
              <input
                type="number"
                step="0.001"
                min="0"
                value={openingCashInput}
                onChange={e => setOpeningCashInput(e.target.value)}
                placeholder="Enter starting cash amount, e.g. 150.000"
                className="input text-center text-lg font-bold tracking-wide"
                required
              />
              <span className="text-[10px] text-coffee-400 mt-2 block text-center font-medium">Verify actual drawer notes & coins before submitting.</span>
            </div>

            <button
              type="submit"
              disabled={openMutation.isPending}
              className="btn-primary w-full py-3 font-semibold text-sm rounded-xl"
            >
              {openMutation.isPending ? '⏳ Opening Register...' : '🔓 Open Shift Register'}
            </button>
          </form>
        </div>
      ) : (
        /* ACTIVE SHIFT: DASHBOARD & LIVE AUDIT */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Active Shift Info */}
          <div className="card border border-coffee-100 dark:border-coffee-800/80 p-5 lg:col-span-2 space-y-6">
            <div className="flex justify-between items-start border-b border-coffee-50 dark:border-coffee-800 pb-3">
              <div>
                <span className="badge badge-success text-[10px] py-1 px-2.5 font-bold uppercase tracking-wider mb-2 inline-block">🔓 Active Shift</span>
                <h3 className="font-bold text-coffee-950 dark:text-coffee-50 text-base">{activeShift.shiftNumber}</h3>
                <p className="text-[10px] text-coffee-400 mt-1">Started on {formatDateTime(activeShift.openingTime)}</p>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-bold text-coffee-400 block uppercase">CASHIER</span>
                <span className="text-xs font-semibold text-coffee-900 dark:text-coffee-100 capitalize">{user?.name}</span>
              </div>
            </div>

            {/* Live Counters */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-4 bg-coffee-50/45 dark:bg-coffee-900/30 border border-coffee-100/50 dark:border-coffee-800/40 rounded-2xl">
                <span className="text-[10px] text-coffee-500 font-bold uppercase block">Opening Cash</span>
                <p className="text-base font-bold text-coffee-950 dark:text-coffee-50 mt-1">{formatCurrency(activeShift.openingCash)}</p>
              </div>
              <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100/60 dark:border-emerald-900/40 rounded-2xl">
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold uppercase block">Cash Sales</span>
                <p className="text-base font-bold text-emerald-700 dark:text-emerald-400 mt-1">+{formatCurrency(activeShift.cashSales)}</p>
              </div>
              <div className="p-4 bg-coffee-50/45 dark:bg-coffee-900/30 border border-coffee-100/50 dark:border-coffee-800/40 rounded-2xl">
                <span className="text-[10px] text-coffee-500 font-bold uppercase block">Card Sales</span>
                <p className="text-base font-bold text-coffee-850 dark:text-coffee-100 mt-1">{formatCurrency(activeShift.cardSales)}</p>
              </div>
              <div className="p-4 bg-red-50 dark:bg-red-950/20 border border-red-100/60 dark:border-red-900/40 rounded-2xl">
                <span className="text-[10px] text-red-500 font-bold uppercase block">Expenses Paid</span>
                <p className="text-base font-bold text-red-700 dark:text-red-400 mt-1">-{formatCurrency(activeShift.expensesPaid)}</p>
              </div>
            </div>

            {/* Expected Summary */}
            <div className="p-5 bg-coffee-50 dark:bg-coffee-900/50 border border-coffee-100 dark:border-coffee-800 rounded-2xl flex flex-col sm:flex-row justify-between items-center gap-4">
              <div>
                <h4 className="font-bold text-sm text-coffee-900 dark:text-coffee-100">Live Expected Cash Balance</h4>
                <p className="text-[11px] text-coffee-500 mt-1">Computed as: Opening Cash ({formatCurrency(activeShift.openingCash)}) + Cash Sales ({formatCurrency(activeShift.cashSales)}) - Cash Expenses ({formatCurrency(activeShift.expensesPaid)})</p>
              </div>
              <div className="text-center sm:text-right shrink-0">
                <span className="text-xl font-display font-bold text-coffee-950 dark:text-coffee-55 block">{formatCurrency(activeShift.expectedCash)}</span>
                <span className="text-[10px] font-bold text-coffee-400 uppercase">Target Drawer Total</span>
              </div>
            </div>
          </div>

          {/* Close Register Trigger */}
          <div className="card border border-coffee-100 dark:border-coffee-800 p-5 flex flex-col justify-between">
            <div className="space-y-4">
              <span className="text-4xl block">🔑</span>
              <h3 className="font-bold text-coffee-950 dark:text-coffee-50 text-base">Register Close</h3>
              <p className="text-xs text-coffee-500 leading-relaxed">
                Ready to hand off drawer? Close this shift to record the actual physical cash inside the register and audit variances.
              </p>
            </div>
            <button
              onClick={() => setCloseModal(true)}
              className="btn-danger w-full py-2.5 mt-8 font-semibold text-xs rounded-xl"
            >
              🔒 Close Drawer Shift
            </button>
          </div>
        </div>
      )}

      {/* ADMIN/MANAGER: AUDIT LOGS */}
      {(user?.role === 'admin' || user?.role === 'manager') && (
        <div className="pt-6 border-t border-coffee-100 dark:border-coffee-800">
          <div className="mb-4">
            <h3 className="text-base font-bold text-coffee-950 dark:text-coffee-50">📋 Closed Shift History & Audits</h3>
            <p className="text-[11px] text-coffee-500 mt-0.5">Audit reports of cashier cash drawer tallies and variance reports.</p>
          </div>

          {historyLoading ? (
            <div className="flex justify-center py-6">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-coffee-600" />
            </div>
          ) : shiftsHistory.length === 0 ? (
            <div className="card text-center p-8 border border-coffee-100 dark:border-coffee-800">
              <p className="text-xs text-coffee-500 font-medium">No closed shifts recorded in database.</p>
            </div>
          ) : (
            <div className="card border border-coffee-100 dark:border-coffee-850 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="table-auto w-full text-left text-xs">
                  <thead>
                    <tr className="bg-coffee-50 dark:bg-coffee-800/40 font-bold text-coffee-600 dark:text-coffee-400 border-b border-coffee-100 dark:border-coffee-800">
                      <th className="p-3">Shift ID</th>
                      <th className="p-3">Cashier</th>
                      <th className="p-3">Closing Time</th>
                      <th className="p-3">Opening Cash</th>
                      <th className="p-3">Expected Cash</th>
                      <th className="p-3">Actual Cash</th>
                      <th className="p-3">Variance</th>
                      <th className="p-3">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-coffee-50 dark:divide-coffee-800/60">
                    {shiftsHistory.map(s => (
                      <tr key={s._id} className="hover:bg-coffee-50/20 dark:hover:bg-coffee-800/10 transition-colors">
                        <td className="p-3 font-bold text-coffee-950 dark:text-coffee-50">{s.shiftNumber}</td>
                        <td className="p-3 capitalize font-semibold text-coffee-800 dark:text-coffee-300">{s.cashier?.name}</td>
                        <td className="p-3 text-coffee-500">{formatDateTime(s.closingTime)}</td>
                        <td className="p-3">{formatCurrency(s.openingCash)}</td>
                        <td className="p-3">{formatCurrency(s.expectedCash)}</td>
                        <td className="p-3 font-medium">{formatCurrency(s.actualCash)}</td>
                        <td className="p-3 font-bold">
                          {s.variance === 0 ? (
                            <span className="text-emerald-500">✅ {formatCurrency(s.variance)}</span>
                          ) : s.variance > 0 ? (
                            <span className="text-sky-500">📈 +{formatCurrency(s.variance)}</span>
                          ) : (
                            <span className="text-red-500">📉 {formatCurrency(s.variance)}</span>
                          )}
                        </td>
                        <td className="p-3 text-coffee-400 italic truncate max-w-xs">{s.notes || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Close Shift Modal */}
      <AnimatePresence>
        {closeModal && activeShift && (
          <div className="modal-overlay">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="modal-content max-w-md w-full">
              <h3 className="text-base font-bold text-coffee-950 dark:text-coffee-50 mb-3">🔒 Close Register Shift</h3>
              <p className="text-xs text-coffee-500 mb-4">
                Verify drawer currency. Tally physical notes and enter the exact cash total to compute shift variance.
              </p>

              <form onSubmit={handleCloseSubmit} className="space-y-4 text-xs">
                <div className="p-3.5 bg-coffee-50 dark:bg-coffee-900/60 border border-coffee-100 dark:border-coffee-800 rounded-2xl space-y-2">
                  <div className="flex justify-between">
                    <span className="text-coffee-400">Opening Balance:</span>
                    <span className="font-semibold">{formatCurrency(activeShift.openingCash)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-coffee-400">Total Cash Sales:</span>
                    <span className="font-semibold text-emerald-500">+{formatCurrency(activeShift.cashSales)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-coffee-400">Cash Expenses:</span>
                    <span className="font-semibold text-red-500">-{formatCurrency(activeShift.expensesPaid)}</span>
                  </div>
                  <div className="flex justify-between border-t border-coffee-100 dark:border-coffee-800 pt-2 font-bold mt-2">
                    <span className="text-coffee-700 dark:text-coffee-200">Expected Cash In Hand:</span>
                    <span className="text-coffee-950 dark:text-coffee-55 text-sm">{formatCurrency(activeShift.expectedCash)}</span>
                  </div>
                </div>

                <div>
                  <label className="label font-bold text-[11px]">Actual Physical Cash Count (TND) *</label>
                  <input
                    type="number"
                    step="0.001"
                    min="0"
                    value={actualCashInput}
                    onChange={e => setActualCashInput(e.target.value)}
                    placeholder="Enter physical drawer total"
                    className="input text-center text-base font-bold tracking-wide"
                    required
                  />
                </div>

                <div>
                  <label className="label">Notes / Discrepancy Explanation</label>
                  <textarea
                    rows="2"
                    value={closeNotesInput}
                    onChange={e => setCloseNotesInput(e.target.value)}
                    placeholder="e.g. Discrepancy due to minor cent change issues."
                    className="input py-2"
                  />
                </div>

                <div className="flex gap-3 justify-end pt-4 border-t border-coffee-100 dark:border-coffee-800">
                  <button type="button" onClick={() => setCloseModal(false)} className="btn-secondary py-2 px-4 font-semibold">Cancel</button>
                  <button type="submit" disabled={closeMutation.isPending} className="btn-danger py-2 px-4 font-bold text-white">
                    {closeMutation.isPending ? 'Closing...' : 'Confirm & Close Drawer'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
