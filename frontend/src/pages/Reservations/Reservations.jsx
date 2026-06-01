import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '../../store'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import axios from 'axios'
import { useAuthStore as authStore } from '../../store'

// Local axios instance for direct API calls
const apiCall = (method, url, data) => {
  const token = authStore.getState().token
  return axios({ method, url: `/api${url}`, data, headers: { Authorization: `Bearer ${token}` } })
}

const STATUS_COLORS = {
  pending:   'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  confirmed: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
  seated:    'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
  cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
  'no-show': 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
}
const STATUS_ICONS = { pending: '⏳', confirmed: '✅', seated: '🪑', cancelled: '❌', 'no-show': '👻' }
const STATUS_NEXT = { pending: ['confirmed', 'cancelled'], confirmed: ['seated', 'no-show', 'cancelled'], seated: [], cancelled: [], 'no-show': [] }

const EMPTY_FORM = { customerName: '', phone: '', email: '', date: '', time: '', partySize: 2, notes: '', table: '' }

export default function Reservations() {
  const { user } = useAuthStore()
  const qc = useQueryClient()
  const canEdit = ['admin', 'manager', 'cashier'].includes(user?.role)

  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0])
  const [showModal, setShowModal] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [statusFilter, setStatusFilter] = useState('all')

  const branchId = user?.branch?._id || user?.branch

  const { data, isLoading } = useQuery({
    queryKey: ['reservations', selectedDate, branchId],
    queryFn: () => apiCall('get', `/reservations?date=${selectedDate}&branch=${branchId}`).then(r => r.data),
    enabled: !!branchId,
  })
  const reservations = (data?.data || []).filter(r => statusFilter === 'all' || r.status === statusFilter)

  const { data: tablesData } = useQuery({
    queryKey: ['tables'],
    queryFn: () => apiCall('get', '/tables').then(r => r.data),
    enabled: !!branchId,
  })
  const tables = tablesData?.data || []
  const availableTables = tables.filter(t => t.status === 'available' || t.status === 'reserved')

  const { mutate: createRes, isPending: creating } = useMutation({
    mutationFn: (data) => apiCall('post', '/reservations', { ...data, branch: branchId }),
    onSuccess: () => { toast.success('Reservation created! 📅'); qc.invalidateQueries({ queryKey: ['reservations'] }); closeModal() },
  })

  const { mutate: updateRes, isPending: updating } = useMutation({
    mutationFn: ({ id, data }) => apiCall('put', `/reservations/${id}`, data),
    onSuccess: () => { toast.success('Reservation updated!'); qc.invalidateQueries({ queryKey: ['reservations'] }); closeModal() },
  })

  const { mutate: patchStatus } = useMutation({
    mutationFn: ({ id, status }) => apiCall('patch', `/reservations/${id}/status`, { status }),
    onSuccess: () => { toast.success('Status updated!'); qc.invalidateQueries({ queryKey: ['reservations'] }) },
  })

  const { mutate: deleteRes } = useMutation({
    mutationFn: (id) => apiCall('delete', `/reservations/${id}`),
    onSuccess: () => { toast.success('Reservation deleted.'); qc.invalidateQueries({ queryKey: ['reservations'] }) },
  })

  const openCreate = () => { setEditItem(null); setForm(EMPTY_FORM); setShowModal(true) }
  const openEdit = (r) => {
    setEditItem(r)
    setForm({
      customerName: r.customerName, phone: r.phone, email: r.email || '',
      date: r.date?.split('T')[0] || '', time: r.time,
      partySize: r.partySize, notes: r.notes || '', table: r.table?._id || '',
    })
    setShowModal(true)
  }
  const closeModal = () => { setShowModal(false); setEditItem(null); setForm(EMPTY_FORM) }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!form.customerName || !form.phone || !form.date || !form.time) return toast.error('Fill required fields')
    if (editItem) updateRes({ id: editItem._id, data: form })
    else createRes(form)
  }

  const sf = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  const counts = { all: data?.data?.length || 0 }
  for (const s of ['pending','confirmed','seated','cancelled','no-show']) {
    counts[s] = (data?.data || []).filter(r => r.status === s).length
  }

  // Navigate dates
  const changeDate = (days) => {
    const d = new Date(selectedDate)
    d.setDate(d.getDate() + days)
    setSelectedDate(d.toISOString().split('T')[0])
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-coffee-900 dark:text-coffee-50">Reservations</h1>
          <p className="text-coffee-500 text-sm mt-0.5">Manage table bookings and walk-in scheduling</p>
        </div>
        {canEdit && (
          <button onClick={openCreate} className="btn-primary gap-2">
            ➕ New Reservation
          </button>
        )}
      </div>

      {/* Date Navigator */}
      <div className="card flex items-center justify-between gap-4 py-3">
        <button onClick={() => changeDate(-1)} className="btn-secondary px-3 py-2">← Prev</button>
        <div className="text-center">
          <p className="font-bold text-coffee-900 dark:text-coffee-50">
            {new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
          <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)}
            className="text-xs text-coffee-500 border-0 bg-transparent cursor-pointer mt-0.5" />
        </div>
        <button onClick={() => changeDate(1)} className="btn-secondary px-3 py-2">Next →</button>
      </div>

      {/* Status tabs */}
      <div className="flex gap-2 flex-wrap">
        {[['all','All'], ['pending','⏳ Pending'], ['confirmed','✅ Confirmed'], ['seated','🪑 Seated'], ['cancelled','❌ Cancelled'], ['no-show','👻 No-show']].map(([v, l]) => (
          <button key={v} onClick={() => setStatusFilter(v)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${statusFilter === v ? 'bg-amber-500 text-white border-amber-500' : 'bg-white dark:bg-coffee-900 text-coffee-600 dark:text-coffee-400 border-coffee-200 dark:border-coffee-700 hover:border-amber-400'}`}>
            {l} {counts[v] > 0 && <span className="ml-1 opacity-70">({counts[v]})</span>}
          </button>
        ))}
      </div>

      {/* Reservations list */}
      {isLoading ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-8 h-8 border-4 border-coffee-200 border-t-amber-500 rounded-full animate-spin" />
        </div>
      ) : reservations.length === 0 ? (
        <div className="card text-center py-16">
          <p className="text-4xl mb-3">📅</p>
          <p className="font-semibold text-coffee-900 dark:text-coffee-100">No reservations for this day</p>
          <p className="text-coffee-500 text-sm mt-1">Click "+ New Reservation" to add one</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          <AnimatePresence>
            {reservations
              .sort((a, b) => a.time.localeCompare(b.time))
              .map((r) => (
                <motion.div key={r._id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="card hover:shadow-md transition-all space-y-3">
                  {/* Card header */}
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-bold text-coffee-900 dark:text-coffee-50 text-base">{r.customerName}</p>
                      <p className="text-coffee-500 text-sm">{r.phone}</p>
                    </div>
                    <span className={`badge text-xs ${STATUS_COLORS[r.status]}`}>
                      {STATUS_ICONS[r.status]} {r.status}
                    </span>
                  </div>

                  {/* Info grid */}
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex items-center gap-1.5 text-coffee-600 dark:text-coffee-400">
                      <span>🕐</span> <span className="font-semibold">{r.time}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-coffee-600 dark:text-coffee-400">
                      <span>👥</span> <span>{r.partySize} guests</span>
                    </div>
                    {r.table && (
                      <div className="flex items-center gap-1.5 text-coffee-600 dark:text-coffee-400 col-span-2">
                        <span>🪑</span>
                        <span>Table {r.table.number} — {r.table.zone}</span>
                      </div>
                    )}
                  </div>

                  {r.notes && (
                    <p className="text-xs text-coffee-500 italic bg-coffee-50 dark:bg-coffee-800 rounded-lg px-3 py-2">
                      📝 {r.notes}
                    </p>
                  )}

                  {/* Actions */}
                  {canEdit && (
                    <div className="flex flex-wrap gap-2 pt-1 border-t border-coffee-100 dark:border-coffee-800">
                      {STATUS_NEXT[r.status]?.map(next => (
                        <button key={next} onClick={() => patchStatus({ id: r._id, status: next })}
                          className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition-all ${
                            next === 'seated' ? 'bg-emerald-500 text-white hover:bg-emerald-600' :
                            next === 'confirmed' ? 'bg-blue-500 text-white hover:bg-blue-600' :
                            'bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400'
                          }`}>
                          {STATUS_ICONS[next]} {next.charAt(0).toUpperCase() + next.slice(1)}
                        </button>
                      ))}
                      <button onClick={() => openEdit(r)} className="text-xs px-3 py-1.5 rounded-lg font-semibold bg-coffee-100 dark:bg-coffee-800 text-coffee-700 dark:text-coffee-300 hover:bg-coffee-200 dark:hover:bg-coffee-700 ml-auto">
                        ✏️ Edit
                      </button>
                    </div>
                  )}
                </motion.div>
              ))}
          </AnimatePresence>
        </div>
      )}

      {/* Modal */}
      <AnimatePresence>
        {showModal && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 z-40 backdrop-blur-sm" onClick={closeModal} />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
              <div className="bg-white dark:bg-coffee-900 rounded-2xl shadow-2xl w-full max-w-lg pointer-events-auto max-h-[90vh] overflow-y-auto">
                <div className="p-6 border-b border-coffee-100 dark:border-coffee-800 flex items-center justify-between">
                  <h2 className="font-bold text-coffee-900 dark:text-coffee-50 text-lg">
                    {editItem ? '✏️ Edit Reservation' : '📅 New Reservation'}
                  </h2>
                  <button onClick={closeModal} className="text-coffee-400 hover:text-coffee-700 text-xl">✕</button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="sm:col-span-2">
                      <label className="label">Customer Name *</label>
                      <input className="input" value={form.customerName} onChange={sf('customerName')} placeholder="Ahmed Benali" required />
                    </div>
                    <div>
                      <label className="label">Phone *</label>
                      <input className="input" value={form.phone} onChange={sf('phone')} placeholder="0660000000" required />
                    </div>
                    <div>
                      <label className="label">Email</label>
                      <input className="input" type="email" value={form.email} onChange={sf('email')} placeholder="ahmed@email.com" />
                    </div>
                    <div>
                      <label className="label">Date *</label>
                      <input className="input" type="date" value={form.date} onChange={sf('date')} required />
                    </div>
                    <div>
                      <label className="label">Time *</label>
                      <input className="input" type="time" value={form.time} onChange={sf('time')} required />
                    </div>
                    <div>
                      <label className="label">Party Size *</label>
                      <input className="input" type="number" min="1" max="20" value={form.partySize} onChange={sf('partySize')} required />
                    </div>
                    <div>
                      <label className="label">Assign Table</label>
                      <select className="input" value={form.table} onChange={sf('table')}>
                        <option value="">— No table yet —</option>
                        {availableTables.map(t => (
                          <option key={t._id} value={t._id}>
                            Table {t.number} ({t.zone}) — {t.capacity} seats
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="sm:col-span-2">
                      <label className="label">Notes</label>
                      <textarea className="input resize-none" rows={2} value={form.notes} onChange={sf('notes')} placeholder="Birthday celebration, allergies, etc." />
                    </div>
                  </div>
                  <div className="flex gap-3 justify-end pt-2">
                    <button type="button" onClick={closeModal} className="btn-secondary px-5">Cancel</button>
                    <button type="submit" disabled={creating || updating} className="btn-primary px-6">
                      {creating || updating ? '⏳ Saving…' : editItem ? '💾 Update' : '📅 Book Table'}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
