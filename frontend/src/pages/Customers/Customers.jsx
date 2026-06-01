import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getCustomers, createCustomer, updateCustomer, adjustPoints } from '../../api'
import { formatCurrency, TIER_COLORS } from '../../utils'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'

export default function Customers() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState(null)
  
  // Form states
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [notes, setNotes] = useState('')

  // Points Form
  const [showPointsModal, setShowPointsModal] = useState(false)
  const [activeCustomer, setActiveCustomer] = useState(null)
  const [pointsChange, setPointsChange] = useState('')
  const [pointsReason, setPointsReason] = useState('')

  // Queries
  const { data: customersRes, isLoading } = useQuery({
    queryKey: ['customers', search],
    queryFn: () => getCustomers({ search })
  })

  // Mutations
  const createMutation = useMutation({
    mutationFn: createCustomer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      toast.success('Customer registered!')
      closeModal()
    }
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => updateCustomer(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      toast.success('Customer details updated!')
      closeModal()
    }
  })

  const pointsMutation = useMutation({
    mutationFn: ({ id, data }) => adjustPoints(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      toast.success('Loyalty points adjusted!')
      closePointsModal()
    }
  })

  const customers = customersRes?.data || []

  const openCreateModal = () => {
    setEditingCustomer(null)
    setName('')
    setPhone('')
    setEmail('')
    setNotes('')
    setShowModal(true)
  }

  const openEditModal = (c) => {
    setEditingCustomer(c)
    setName(c.name)
    setPhone(c.phone)
    setEmail(c.email)
    setNotes(c.notes || '')
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setEditingCustomer(null)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!name) return toast.error('Name is required')
    if (editingCustomer) {
      updateMutation.mutate({ id: editingCustomer._id, data: { name, phone, email, notes } })
    } else {
      createMutation.mutate({ name, phone, email, notes })
    }
  }

  const openPointsModal = (c) => {
    setActiveCustomer(c)
    setPointsChange('')
    setPointsReason('')
    setShowPointsModal(true)
  }

  const closePointsModal = () => {
    setShowPointsModal(false)
    setActiveCustomer(null)
  }

  const handlePointsSubmit = (e) => {
    e.preventDefault()
    if (!pointsChange) return toast.error('Enter valid points value')
    pointsMutation.mutate({
      id: activeCustomer._id,
      data: { points: Number(pointsChange), reason: pointsReason }
    })
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <input
          type="text"
          placeholder="Search by name, phone, or email..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="input sm:max-w-md"
        />
        <button onClick={openCreateModal} className="btn-primary py-2.5">
          ➕ Register Customer
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="text-3xl animate-pulse-soft">👥</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {customers.length === 0 ? (
            <div className="col-span-full card py-12 text-center text-coffee-400">
              No registered loyalty customers found
            </div>
          ) : customers.map(c => (
            <motion.div layout key={c._id} className="card flex flex-col justify-between h-52">
              <div>
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h4 className="font-bold text-coffee-950 dark:text-coffee-50">{c.name}</h4>
                    <p className="text-xs text-coffee-500 font-mono">{c.phone || 'No phone'}</p>
                  </div>
                  <span className={`badge ${TIER_COLORS[c.tier] || 'bg-coffee-100'} font-bold`}>
                    {c.tier}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 py-2 border-t border-b border-coffee-50 dark:border-coffee-800 text-xs">
                  <div className="text-center">
                    <p className="text-coffee-400 font-medium">Visits</p>
                    <p className="font-bold text-sm">{c.visitCount}</p>
                  </div>
                  <div className="text-center border-l border-r border-coffee-50 dark:border-coffee-800">
                    <p className="text-coffee-400 font-medium">Spent</p>
                    <p className="font-bold text-sm text-coffee-800 dark:text-coffee-200 truncate">{formatCurrency(c.totalSpent)}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-coffee-400 font-medium">Points</p>
                    <p className="font-bold text-sm text-latte">{c.loyaltyPoints} pts</p>
                  </div>
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-3">
                <button onClick={() => openPointsModal(c)} className="btn-secondary px-3 py-1.5 text-xs">
                  🎁 Adj Points
                </button>
                <button onClick={() => openEditModal(c)} className="btn-primary px-3 py-1.5 text-xs">
                  Details
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Customer Form Modal */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={closeModal} />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-coffee-900 rounded-3xl p-6 w-full max-w-md relative z-10 shadow-2xl"
            >
              <h3 className="font-bold text-lg mb-4 text-coffee-950 dark:text-coffee-100">
                {editingCustomer ? '📝 Edit Customer' : '➕ Register Loyalty Customer'}
              </h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="label">Full Name</label>
                  <input type="text" value={name} onChange={e => setName(e.target.value)} className="input" placeholder="e.g. Salim Benali" />
                </div>
                <div>
                  <label className="label">Phone Number</label>
                  <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} className="input" placeholder="e.g. 0550112233" />
                </div>
                <div>
                  <label className="label">Email Address</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="input" placeholder="e.g. salim@email.com" />
                </div>
                <div>
                  <label className="label">Customer Notes / Preferences</label>
                  <textarea value={notes} onChange={e => setNotes(e.target.value)} className="input" rows="2" placeholder="Likes extra caramel drizzle, iced coffees..." />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button type="button" onClick={closeModal} className="btn-secondary">Cancel</button>
                  <button type="submit" className="btn-primary">Save Profile</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Adjust Points Modal */}
      <AnimatePresence>
        {showPointsModal && activeCustomer && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={closePointsModal} />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-coffee-900 rounded-3xl p-6 w-full max-w-md relative z-10 shadow-2xl"
            >
              <h3 className="font-bold text-lg mb-4 text-coffee-950 dark:text-coffee-100">
                🎁 Adjust Points: {activeCustomer.name}
              </h3>
              <form onSubmit={handlePointsSubmit} className="space-y-4">
                <div>
                  <label className="label">Points Change (Accepts negative values)</label>
                  <input
                    type="number"
                    value={pointsChange}
                    onChange={e => setPointsChange(e.target.value)}
                    className="input"
                    placeholder="e.g. 50 or -30"
                  />
                </div>
                <div>
                  <label className="label">Reason / Event Name</label>
                  <input
                    type="text"
                    value={pointsReason}
                    onChange={e => setPointsReason(e.target.value)}
                    className="input"
                    placeholder="e.g. Anniversary Gift"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button type="button" onClick={closePointsModal} className="btn-secondary">Cancel</button>
                  <button type="submit" className="btn-primary">Apply Points</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
