import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getExpenses, createExpense, deleteExpense, getBranches } from '../../api'
import { formatCurrency, formatDate } from '../../utils'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'

const EXPENSE_CATEGORIES = ['Rent', 'Electricity', 'Water', 'Internet', 'Supplies', 'Salaries', 'Marketing', 'Maintenance', 'Other']

export default function Expenses() {
  const queryClient = useQueryClient()
  const [selectedBranch, setSelectedBranch] = useState('All')
  const [showModal, setShowModal] = useState(false)

  // Form states
  const [category, setCategory] = useState('Supplies')
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [branch, setBranch] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [isRecurring, setIsRecurring] = useState(false)

  // Queries
  const { data: expensesRes, isLoading } = useQuery({
    queryKey: ['expenses', selectedBranch],
    queryFn: () => getExpenses({ branch: selectedBranch === 'All' ? undefined : selectedBranch })
  })

  const { data: branchesRes } = useQuery({
    queryKey: ['branches'],
    queryFn: getBranches
  })

  // Mutations
  const createMutation = useMutation({
    mutationFn: createExpense,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      toast.success('Expense recorded!')
      closeModal()
    }
  })

  const deleteMutation = useMutation({
    mutationFn: deleteExpense,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      toast.success('Expense deleted!')
    }
  })

  const expensesData = expensesRes?.data || {}
  const expenses = expensesData.expenses || []
  const grandTotal = expensesData.total || 0
  const branches = branchesRes?.data || []

  const openCreateModal = () => {
    setCategory('Supplies')
    setAmount('')
    setDescription('')
    setDate(new Date().toISOString().split('T')[0])
    setBranch(branches[0]?._id || '')
    setPaymentMethod('cash')
    setIsRecurring(false)
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!amount) return toast.error('Please enter amount')
    createMutation.mutate({
      category, amount: Number(amount), description, date: new Date(date),
      branch, paymentMethod, isRecurring
    })
  }

  const handleDelete = (id) => {
    if (window.confirm('Delete this expense permanently?')) {
      deleteMutation.mutate(id)
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <select
            value={selectedBranch}
            onChange={e => setSelectedBranch(e.target.value)}
            className="input sm:max-w-xs"
          >
            <option value="All">All Branches</option>
            {branches.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
          </select>
          <div className="card flex items-center justify-between py-2 px-4 shadow-sm h-11 shrink-0 bg-white">
            <span className="text-xs text-coffee-400 font-semibold uppercase pr-3">Total Expenses:</span>
            <span className="font-bold text-sm text-red-500 font-mono">{formatCurrency(grandTotal)}</span>
          </div>
        </div>
        <button onClick={openCreateModal} className="btn-primary py-2.5">
          ➕ New Expense
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="text-3xl animate-pulse-soft">💸</div>
        </div>
      ) : (
        <div className="table-container bg-white dark:bg-coffee-900 shadow-coffee">
          <table className="table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Category</th>
                <th>Description</th>
                <th>Amount</th>
                <th>Branch</th>
                <th>Payment</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {expenses.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-8 text-coffee-400">No expenses found</td>
                </tr>
              ) : expenses.map(e => (
                <tr key={e._id}>
                  <td>{formatDate(e.date)}</td>
                  <td>
                    <span className="badge badge-coffee">{e.category}</span>
                  </td>
                  <td className="max-w-xs truncate text-coffee-700 dark:text-coffee-300">{e.description || '-'}</td>
                  <td className="font-bold text-red-500 font-mono">{formatCurrency(e.amount)}</td>
                  <td>{e.branch?.name || '-'}</td>
                  <td className="uppercase text-xs">{e.paymentMethod}</td>
                  <td className="text-right">
                    <button onClick={() => handleDelete(e._id)} className="text-red-500 hover:text-red-700 text-xs font-semibold">
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Expense Modal */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={closeModal} />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-coffee-900 rounded-3xl p-6 w-full max-w-lg relative z-10 shadow-2xl overflow-y-auto max-h-[90vh]"
            >
              <h3 className="font-bold text-lg mb-4 text-coffee-950 dark:text-coffee-100">
                ➕ New Expense Entry
              </h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Category</label>
                    <select value={category} onChange={e => setCategory(e.target.value)} className="input">
                      {EXPENSE_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="label">Amount (TND)</label>
                    <input type="number" value={amount} onChange={e => setAmount(e.target.value)} className="input" placeholder="e.g. 5.000" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Date</label>
                    <input type="date" value={date} onChange={e => setDate(e.target.value)} className="input" />
                  </div>
                  <div>
                    <label className="label">Branch</label>
                    <select value={branch} onChange={e => setBranch(e.target.value)} className="input">
                      {branches.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Payment Method</label>
                    <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} className="input">
                      <option value="cash">Cash</option>
                      <option value="bank">Bank Transfer</option>
                      <option value="card">Credit/Debit Card</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div className="flex items-end pb-3">
                    <div className="flex items-center gap-2">
                      <input type="checkbox" id="recurring" checked={isRecurring} onChange={e => setIsRecurring(e.target.checked)} className="rounded text-coffee-800 focus:ring-coffee-700" />
                      <label htmlFor="recurring" className="text-xs font-semibold">Recurring Monthly Expense</label>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="label">Description / Notes</label>
                  <input type="text" value={description} onChange={e => setDescription(e.target.value)} className="input" placeholder="e.g. June Internet Fiber Package" />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button type="button" onClick={closeModal} className="btn-secondary">Cancel</button>
                  <button type="submit" className="btn-primary">Add Expense</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
