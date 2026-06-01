import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getSuppliers, createSupplier, updateSupplier, deleteSupplier, paySupplierDebt } from '../../api'
import { formatCurrency, formatDateTime } from '../../utils'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'

export default function Suppliers() {
  const queryClient = useQueryClient()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [payModal, setPayModal] = useState(null)
  const [payAmount, setPayAmount] = useState('')

  // Form states
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => getSuppliers()
  })

  const suppliers = data?.data?.data || []

  const saveMutation = useMutation({
    mutationFn: (body) => editing ? updateSupplier(editing._id, body) : createSupplier(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] })
      toast.success(editing ? 'Supplier updated successfully!' : 'Supplier added successfully!')
      closeForm()
    }
  })

  const deleteMutation = useMutation({
    mutationFn: deleteSupplier,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] })
      toast.success('Supplier deactivated.')
    }
  })

  const payMutation = useMutation({
    mutationFn: ({ id, amount }) => paySupplierDebt(id, amount),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] })
      toast.success('Debt payment recorded successfully!')
      setPayModal(null)
      setPayAmount('')
    }
  })

  const openForm = (sup = null) => {
    if (sup) {
      setEditing(sup)
      setName(sup.name)
      setEmail(sup.email || '')
      setPhone(sup.phone || '')
      setAddress(sup.address || '')
    } else {
      setEditing(null)
      setName('')
      setEmail('')
      setPhone('')
      setAddress('')
    }
    setModalOpen(true)
  }

  const closeForm = () => {
    setModalOpen(false)
    setEditing(null)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!name.trim()) return toast.error('Supplier name is required.')
    saveMutation.mutate({ name, email, phone, address })
  }

  const handlePaySubmit = (e) => {
    e.preventDefault()
    const amt = Number(payAmount)
    if (!amt || amt <= 0) return toast.error('Please enter a valid amount.')
    if (amt > payModal.outstandingBalance) return toast.error('Payment exceeds outstanding balance.')
    payMutation.mutate({ id: payModal._id, amount: amt })
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-coffee-950 dark:text-coffee-50">🏪 Suppliers Directory</h2>
          <p className="text-xs text-coffee-500">Manage raw ingredient suppliers, contact logs, and outstanding balances.</p>
        </div>
        <button onClick={() => openForm()} className="btn-primary flex items-center gap-2 py-2 px-4 text-sm font-semibold">
          <span>➕</span> Add New Supplier
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-coffee-600" />
        </div>
      ) : suppliers.length === 0 ? (
        <div className="card text-center p-12 border border-coffee-100 dark:border-coffee-800">
          <span className="text-5xl block mb-4">🏪</span>
          <h3 className="font-semibold text-coffee-800 dark:text-coffee-200">No Suppliers Found</h3>
          <p className="text-xs text-coffee-500 mt-1">Get started by creating your first wholesale vendor profile.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {suppliers.map(sup => sup.isActive !== false && (
            <motion.div
              layout
              key={sup._id}
              className="card border border-coffee-100 dark:border-coffee-850 flex flex-col justify-between hover:shadow-coffee-md transition-all p-5"
            >
              <div>
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-coffee-950 dark:text-coffee-50 text-base">{sup.name}</h3>
                    <span className="text-[10px] text-coffee-400 font-medium">ID: {sup._id.slice(-6).toUpperCase()}</span>
                  </div>
                  {sup.outstandingBalance > 0 ? (
                    <span className="badge badge-danger text-[10px] py-1 px-2.5 font-bold">
                      ⚠️ Debt: {formatCurrency(sup.outstandingBalance)}
                    </span>
                  ) : (
                    <span className="badge badge-success text-[10px] py-1 px-2.5 font-bold">
                      ✅ Clear
                    </span>
                  )}
                </div>

                <div className="mt-4 space-y-2 text-xs text-coffee-600 dark:text-coffee-400">
                  <div className="flex items-center gap-2">
                    <span>📧</span>
                    <span className="truncate">{sup.email || 'No email registered'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span>📞</span>
                    <span>{sup.phone || 'No phone registered'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span>📍</span>
                    <span className="truncate">{sup.address || 'No address registered'}</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-2 mt-6 pt-4 border-t border-coffee-50 dark:border-coffee-800/60">
                {sup.outstandingBalance > 0 && (
                  <button
                    onClick={() => setPayModal(sup)}
                    className="btn-success flex-1 py-1.5 text-xs font-bold"
                  >
                    💸 Pay Debt
                  </button>
                )}
                <button
                  onClick={() => openForm(sup)}
                  className="btn-secondary py-1.5 px-3 text-xs"
                >
                  ✏️ Edit
                </button>
                <button
                  onClick={() => {
                    if (confirm(`Deactivate supplier "${sup.name}"?`)) {
                      deleteMutation.mutate(sup._id)
                    }
                  }}
                  className="btn-danger py-1.5 px-3 text-xs bg-red-50 hover:bg-red-100 text-red-600 border-none"
                >
                  🗑️ Deactivate
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Save Modal */}
      <AnimatePresence>
        {modalOpen && (
          <div className="modal-overlay">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="modal-content max-w-md w-full">
              <h3 className="text-base font-bold text-coffee-950 dark:text-coffee-50 mb-4">
                {editing ? '✏️ Edit Supplier' : '🏪 Add Supplier Profile'}
              </h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="label">Supplier Name *</label>
                  <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. SOTUCHOC Tunis" className="input" required />
                </div>
                <div>
                  <label className="label">Email Address</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="contact@supplier.tn" className="input" />
                </div>
                <div>
                  <label className="label">Phone Number</label>
                  <input type="text" value={phone} onChange={e => setPhone(e.target.value)} placeholder="71-000-000" className="input" />
                </div>
                <div>
                  <label className="label">Physical Address</label>
                  <input type="text" value={address} onChange={e => setAddress(e.target.value)} placeholder="Rue de la Liberté, Tunis" className="input" />
                </div>
                <div className="flex gap-3 justify-end pt-4 border-t border-coffee-100 dark:border-coffee-800">
                  <button type="button" onClick={closeForm} className="btn-secondary py-2 px-4 text-xs font-semibold">Cancel</button>
                  <button type="submit" disabled={saveMutation.isPending} className="btn-primary py-2 px-4 text-xs font-semibold">
                    {saveMutation.isPending ? 'Saving...' : 'Save Supplier'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Pay Debt Modal */}
      <AnimatePresence>
        {payModal && (
          <div className="modal-overlay">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="modal-content max-w-sm w-full">
              <h3 className="text-base font-bold text-coffee-950 dark:text-coffee-50 mb-3">💸 Settle Supplier Debt</h3>
              <p className="text-xs text-coffee-500 mb-4">
                Record a cash or bank payment made to <strong>{payModal.name}</strong> to reduce outstanding balance.
              </p>
              <form onSubmit={handlePaySubmit} className="space-y-4">
                <div className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900 rounded-xl">
                  <span className="text-[10px] uppercase font-bold text-red-500 tracking-wider">Current Outstanding Balance</span>
                  <p className="text-lg font-bold text-red-700 dark:text-red-400 mt-1">{formatCurrency(payModal.outstandingBalance)}</p>
                </div>
                <div>
                  <label className="label">Payment Amount (TND) *</label>
                  <input
                    type="number"
                    step="0.001"
                    min="0.001"
                    max={payModal.outstandingBalance}
                    value={payAmount}
                    onChange={e => setPayAmount(e.target.value)}
                    placeholder="Enter amount to pay"
                    className="input"
                    required
                  />
                </div>
                <div className="flex gap-3 justify-end pt-4 border-t border-coffee-100 dark:border-coffee-800">
                  <button type="button" onClick={() => setPayModal(null)} className="btn-secondary py-2 px-4 text-xs font-semibold">Cancel</button>
                  <button type="submit" disabled={payMutation.isPending} className="btn-success py-2 px-4 text-xs font-bold text-white">
                    {payMutation.isPending ? 'Processing...' : 'Settle Payment'}
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
