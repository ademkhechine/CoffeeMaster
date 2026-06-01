import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getTables, createTable, updateTable, deleteTable, seatTable, vacateTable, readyTable, reserveTable } from '../../api'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import { useAuthStore } from '../../store'
import { hasPermission, formatCurrency, getSocketUrl } from '../../utils'
import { io } from 'socket.io-client'

const ZONES = ['Main Hall', 'Garden Terrace', 'Bar', 'Private Room', 'Takeaway']
const ZONE_COLORS = {
  'Main Hall':      { bg: 'bg-amber-50 dark:bg-amber-950/30',  border: 'border-amber-200 dark:border-amber-800', dot: 'bg-amber-400' },
  'Garden Terrace': { bg: 'bg-emerald-50 dark:bg-emerald-950/30', border: 'border-emerald-200 dark:border-emerald-800', dot: 'bg-emerald-400' },
  'Bar':            { bg: 'bg-sky-50 dark:bg-sky-950/30',      border: 'border-sky-200 dark:border-sky-800',    dot: 'bg-sky-400' },
  'Private Room':   { bg: 'bg-purple-50 dark:bg-purple-950/30', border: 'border-purple-200 dark:border-purple-800', dot: 'bg-purple-400' },
  'Takeaway':       { bg: 'bg-rose-50 dark:bg-rose-950/30',    border: 'border-rose-200 dark:border-rose-800',  dot: 'bg-rose-400' },
}

const STATUS_CONFIG = {
  available: { label: 'Available', icon: '✅', ring: 'ring-emerald-400', badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300', card: 'bg-white dark:bg-coffee-900 border-coffee-100 dark:border-coffee-800' },
  occupied:  { label: 'Occupied',  icon: '🔴', ring: 'ring-red-400',     badge: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',         card: 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800' },
  reserved:  { label: 'Reserved',  icon: '🟡', ring: 'ring-amber-400',   badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',  card: 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800' },
  cleaning:  { label: 'Cleaning',  icon: '🧹', ring: 'ring-sky-400',     badge: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300',          card: 'bg-sky-50 dark:bg-sky-950/30 border-sky-200 dark:border-sky-800' },
}

function TableCard({ table, onAction, canManage }) {
  const cfg = STATUS_CONFIG[table.status] || STATUS_CONFIG.available
  const isOccupied = table.status === 'occupied'
  const isReserved = table.status === 'reserved'
  const isCleaning = table.status === 'cleaning'
  const isAvailable = table.status === 'available'

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.02, y: -2 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      className={`relative border-2 rounded-2xl p-4 cursor-pointer select-none transition-all ${cfg.card} ring-2 ring-transparent hover:${cfg.ring}`}
      onClick={() => onAction(table)}
    >
      {/* Top row */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="font-bold text-coffee-900 dark:text-coffee-50 text-base leading-tight">
            {table.label || `Table ${table.number}`}
          </p>
          <p className="text-xs text-coffee-500 mt-0.5">{table.zone}</p>
        </div>
        <span className={`text-xs font-semibold px-2 py-1 rounded-full ${cfg.badge}`}>
          {cfg.icon} {cfg.label}
        </span>
      </div>

      {/* Capacity visual */}
      <div className="flex items-center gap-1 mb-3">
        {Array.from({ length: table.capacity }).map((_, i) => (
          <div
            key={i}
            className={`w-5 h-5 rounded-full border-2 flex items-center justify-center text-[10px]
              ${isOccupied ? 'border-red-400 bg-red-100 dark:bg-red-900/40' :
                isReserved ? 'border-amber-400 bg-amber-100 dark:bg-amber-900/40' :
                'border-coffee-200 dark:border-coffee-700 bg-coffee-50 dark:bg-coffee-800'}`}
          >
            {isOccupied || isReserved ? '👤' : ''}
          </div>
        ))}
        <span className="text-xs text-coffee-500 ml-1">×{table.capacity}</span>
      </div>

      {/* Status info */}
      {isOccupied && table.currentOrder && (
        <div className="text-xs bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-xl px-3 py-2 space-y-0.5">
          <p className="font-semibold">📋 {table.currentOrder.orderNumber}</p>
          <p>{formatCurrency(table.currentOrder.total)}</p>
          {table.seatedAt && (
            <p className="text-red-500 dark:text-red-400">
              ⏱ {Math.floor((Date.now() - new Date(table.seatedAt)) / 60000)} min
            </p>
          )}
        </div>
      )}
      {isReserved && (
        <div className="text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded-xl px-3 py-2">
          <p className="font-semibold">👤 {table.reservedFor}</p>
          {table.reservedAt && <p>{new Date(table.reservedAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</p>}
        </div>
      )}
      {isCleaning && (
        <div className="text-xs bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300 rounded-xl px-3 py-2">
          Being cleaned — tap to mark ready
        </div>
      )}
      {isAvailable && (
        <div className="text-xs text-coffee-400 dark:text-coffee-600 italic">Tap to seat or reserve</div>
      )}
    </motion.div>
  )
}

function ActionModal({ table, onClose, onConfirm, canManage }) {
  const [view, setView] = useState('main') // main | reserve | manage
  const [reservedFor, setReservedFor] = useState('')
  const [reservedAt, setReservedAt] = useState('')
  const [editLabel, setEditLabel] = useState(table.label || '')
  const [editCapacity, setEditCapacity] = useState(table.capacity)
  const [editZone, setEditZone] = useState(table.zone)

  if (!table) return null
  const cfg = STATUS_CONFIG[table.status] || STATUS_CONFIG.available

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        className="relative z-10 bg-white dark:bg-coffee-900 rounded-2xl shadow-2xl w-full max-w-sm border border-coffee-100 dark:border-coffee-800 overflow-hidden"
      >
        {/* Header */}
        <div className="bg-coffee-gradient p-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-white text-lg">{table.label || `Table ${table.number}`}</h3>
              <p className="text-white/70 text-sm">{table.zone} · {table.capacity} seats</p>
            </div>
            <span className={`text-xs font-semibold px-3 py-1 rounded-full bg-white/20 text-white`}>
              {cfg.icon} {cfg.label}
            </span>
          </div>
        </div>

        <div className="p-5 space-y-3">
          {view === 'main' && (
            <>
              {table.status === 'available' && (
                <>
                  <button
                    onClick={() => onConfirm('seat', table._id)}
                    className="btn-primary w-full py-3 flex items-center justify-center gap-2"
                  >
                    🪑 Seat Customers
                  </button>
                  <button
                    onClick={() => setView('reserve')}
                    className="btn-secondary w-full py-3 flex items-center justify-center gap-2"
                  >
                    📅 Reserve Table
                  </button>
                </>
              )}
              {table.status === 'occupied' && (
                <>
                  <div className="bg-red-50 dark:bg-red-950/30 rounded-xl p-3 text-sm text-red-700 dark:text-red-300 space-y-1">
                    <p className="font-semibold">Active Order</p>
                    {table.currentOrder && <>
                      <p>#{table.currentOrder.orderNumber}</p>
                      <p>{formatCurrency(table.currentOrder.total)} · {table.currentOrder.items?.length} items</p>
                    </>}
                    {table.seatedAt && <p className="text-red-500">Seated {Math.floor((Date.now() - new Date(table.seatedAt)) / 60000)} min ago</p>}
                  </div>
                  <button
                    onClick={() => onConfirm('vacate', table._id)}
                    className="w-full py-3 rounded-xl bg-red-500 hover:bg-red-600 text-white font-semibold transition-all flex items-center justify-center gap-2"
                  >
                    🧾 Vacate Table (Paid)
                  </button>
                </>
              )}
              {table.status === 'reserved' && (
                <>
                  <div className="bg-amber-50 dark:bg-amber-950/30 rounded-xl p-3 text-sm text-amber-700 dark:text-amber-300">
                    <p className="font-semibold">Reserved for: {table.reservedFor}</p>
                    {table.reservedAt && <p>At {new Date(table.reservedAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</p>}
                  </div>
                  <button
                    onClick={() => onConfirm('seat', table._id)}
                    className="btn-primary w-full py-3 flex items-center justify-center gap-2"
                  >
                    🪑 Seat Now (Arrived)
                  </button>
                  <button
                    onClick={() => onConfirm('ready', table._id)}
                    className="btn-secondary w-full py-3 flex items-center justify-center gap-2"
                  >
                    ✅ Cancel Reservation
                  </button>
                </>
              )}
              {table.status === 'cleaning' && (
                <button
                  onClick={() => onConfirm('ready', table._id)}
                  className="btn-primary w-full py-3 flex items-center justify-center gap-2"
                >
                  ✅ Mark as Ready
                </button>
              )}
              <button onClick={() => setView('manage')} className="w-full py-2 text-sm text-coffee-500 hover:text-coffee-700 dark:hover:text-coffee-300 transition-colors">
                ⚙️ Edit Table Info
              </button>
            </>
          )}

          {view === 'reserve' && (
            <div className="space-y-3">
              <h4 className="font-semibold text-coffee-900 dark:text-coffee-100">Reserve Table</h4>
              <div>
                <label className="text-xs text-coffee-500 mb-1 block">Customer / Name</label>
                <input
                  className="input w-full"
                  placeholder="e.g. Khaled Bensalem"
                  value={reservedFor}
                  onChange={e => setReservedFor(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs text-coffee-500 mb-1 block">Reserved For Time</label>
                <input
                  type="datetime-local"
                  className="input w-full"
                  value={reservedAt}
                  onChange={e => setReservedAt(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <button className="btn-secondary flex-1 py-2" onClick={() => setView('main')}>Back</button>
                <button
                  className="btn-primary flex-1 py-2"
                  onClick={() => onConfirm('reserve', table._id, { reservedFor: reservedFor || 'Guest', reservedAt })}
                  disabled={!reservedFor}
                >
                  Confirm
                </button>
              </div>
            </div>
          )}

          {view === 'manage' && (
            <div className="space-y-3">
              <h4 className="font-semibold text-coffee-900 dark:text-coffee-100">Edit Table</h4>
              <div>
                <label className="text-xs text-coffee-500 mb-1 block">Label</label>
                <input className="input w-full" value={editLabel} onChange={e => setEditLabel(e.target.value)} placeholder="e.g. Window Seat" />
              </div>
              <div>
                <label className="text-xs text-coffee-500 mb-1 block">Capacity</label>
                <input type="number" min="1" max="20" className="input w-full" value={editCapacity} onChange={e => setEditCapacity(Number(e.target.value))} />
              </div>
              <div>
                <label className="text-xs text-coffee-500 mb-1 block">Zone</label>
                <select className="input w-full" value={editZone} onChange={e => setEditZone(e.target.value)}>
                  {ZONES.map(z => <option key={z}>{z}</option>)}
                </select>
              </div>
              <div className="flex gap-2">
                <button className="btn-secondary flex-1 py-2" onClick={() => setView('main')}>Back</button>
                <button
                  className="btn-primary flex-1 py-2"
                  onClick={() => onConfirm('edit', table._id, { label: editLabel, capacity: editCapacity, zone: editZone })}
                >
                  Save
                </button>
              </div>
              {canManage && (
                <button
                  onClick={() => {
                    if (window.confirm('Are you sure you want to delete this table?')) {
                      onConfirm('delete', table._id)
                    }
                  }}
                  className="w-full py-2 rounded-xl bg-red-50 hover:bg-red-100 dark:bg-red-950/20 text-red-500 font-semibold transition-all text-xs"
                >
                  🗑️ Delete Table
                </button>
              )}
            </div>
          )}

          {view === 'main' && (
            <button onClick={onClose} className="w-full py-2 text-xs text-coffee-400 hover:text-coffee-600 transition-colors">
              Close
            </button>
          )}
        </div>
      </motion.div>
    </div>
  )
}

export default function Tables() {
  const qc = useQueryClient()
  const { user, token } = useAuthStore()
  const branchId = user?.branch?._id || user?.branch
  const canManage = hasPermission(user?.role, 'tables')
  const isAdmin = user?.role === 'admin' || user?.role === 'manager'

  const [activeZone, setActiveZone] = useState('All')
  const [selectedTable, setSelectedTable] = useState(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [newTable, setNewTable] = useState({ number: '', label: '', zone: 'Main Hall', capacity: 2, shape: 'square' })

  // Socket.io for live table status updates
  useEffect(() => {
    if (!token) return
    const socket = io(getSocketUrl(), { auth: { token } })

    const handleUpdate = () => {
      qc.invalidateQueries({ queryKey: ['tables', branchId] })
    }

    socket.on('table:updated', handleUpdate)
    socket.on('order:created', handleUpdate)
    socket.on('order:updated', handleUpdate)

    return () => {
      socket.off('table:updated', handleUpdate)
      socket.off('order:created', handleUpdate)
      socket.off('order:updated', handleUpdate)
      socket.disconnect()
    }
  }, [token, branchId, qc])

  const { data: tablesRes, isLoading } = useQuery({
    queryKey: ['tables', branchId],
    queryFn: () => getTables({ branch: branchId }),
    enabled: !!branchId,
  })

  const tables = tablesRes?.data?.data || []
  const filtered = activeZone === 'All' ? tables : tables.filter(t => t.zone === activeZone)

  const grouped = ZONES.reduce((acc, z) => {
    acc[z] = filtered.filter(t => t.zone === z)
    return acc
  }, {})

  // Stats
  const stats = {
    total: tables.length,
    available: tables.filter(t => t.status === 'available').length,
    occupied: tables.filter(t => t.status === 'occupied').length,
    reserved: tables.filter(t => t.status === 'reserved').length,
    cleaning: tables.filter(t => t.status === 'cleaning').length,
  }

  const mutate = useMutation({
    mutationFn: ({ action, id, data }) => {
      if (action === 'seat') return seatTable(id, data || {})
      if (action === 'vacate') return vacateTable(id)
      if (action === 'ready') return readyTable(id)
      if (action === 'reserve') return reserveTable(id, data)
      if (action === 'edit') return updateTable(id, data)
      if (action === 'delete') return deleteTable(id)
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['tables', branchId] })
      const msgs = { seat: 'Table seated! ☕', vacate: 'Table vacated 🧹', ready: 'Table is ready ✅', reserve: 'Table reserved 📅', edit: 'Table updated ✏️', delete: 'Table removed 🗑️' }
      toast.success(msgs[vars.action] || 'Done!')
      setSelectedTable(null)
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Action failed')
  })

  const addMutation = useMutation({
    mutationFn: createTable,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tables', branchId] })
      toast.success('Table added! 🪑')
      setShowAddModal(false)
      setNewTable({ number: '', label: '', zone: 'Main Hall', capacity: 2, shape: 'square' })
    }
  })

  const handleAction = (action, id, data) => {
    mutate.mutate({ action, id, data })
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: 'Total Tables', value: stats.total, icon: '🪑', color: 'text-coffee-700 dark:text-coffee-300' },
          { label: 'Available', value: stats.available, icon: '✅', color: 'text-emerald-600' },
          { label: 'Occupied', value: stats.occupied, icon: '🔴', color: 'text-red-600' },
          { label: 'Reserved', value: stats.reserved, icon: '🟡', color: 'text-amber-600' },
          { label: 'Cleaning', value: stats.cleaning, icon: '🧹', color: 'text-sky-600' },
        ].map(s => (
          <div key={s.label} className="card p-4">
            <p className="text-2xl mb-1">{s.icon}</p>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-coffee-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Zone filter tabs */}
        <div className="flex flex-wrap gap-2">
          {['All', ...ZONES].map(zone => (
            <button
              key={zone}
              onClick={() => setActiveZone(zone)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                activeZone === zone
                  ? 'bg-coffee-800 text-white dark:bg-coffee-700 shadow-md'
                  : 'bg-white dark:bg-coffee-900 text-coffee-700 dark:text-coffee-300 border border-coffee-100 dark:border-coffee-800 hover:border-coffee-300'
              }`}
            >
              {zone === 'All' ? '🗺️ All Zones' : zone}
              {zone !== 'All' && (
                <span className="ml-1.5 opacity-60">
                  ({tables.filter(t => t.zone === zone).length})
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Add table (admin/manager only) */}
        {isAdmin && (
          <button onClick={() => setShowAddModal(true)} className="btn-primary px-4 py-2 text-sm">
            ＋ Add Table
          </button>
        )}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-xs">
        {Object.entries(STATUS_CONFIG).map(([k, v]) => (
          <span key={k} className={`flex items-center gap-1.5 px-3 py-1 rounded-full ${v.badge}`}>
            {v.icon} {v.label}
          </span>
        ))}
      </div>

      {/* Floor plan zones */}
      {isLoading ? (
        <div className="flex items-center justify-center py-24">
          <div className="w-10 h-10 border-4 border-coffee-200 border-t-coffee-600 rounded-full animate-spin" />
        </div>
      ) : tables.length === 0 ? (
        <div className="card flex flex-col items-center justify-center py-20 text-center">
          <p className="text-5xl mb-4">🪑</p>
          <p className="font-semibold text-coffee-900 dark:text-coffee-100 text-lg">No tables configured</p>
          <p className="text-coffee-500 text-sm mt-1">Add your first table to start managing your floor plan.</p>
          {isAdmin && (
            <button onClick={() => setShowAddModal(true)} className="btn-primary mt-5 px-6 py-2">
              Add First Table
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-8">
          {ZONES.map(zone => {
            const zoneTables = grouped[zone]
            if (zoneTables.length === 0) return null
            const zc = ZONE_COLORS[zone]
            return (
              <div key={zone}>
                {/* Zone header */}
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-3 h-3 rounded-full ${zc.dot}`} />
                  <h2 className="font-bold text-coffee-900 dark:text-coffee-100 text-base">{zone}</h2>
                  <div className="flex-1 h-px bg-coffee-100 dark:bg-coffee-800" />
                  <span className="text-xs text-coffee-500">
                    {zoneTables.filter(t => t.status === 'available').length}/{zoneTables.length} available
                  </span>
                </div>

                {/* Tables grid */}
                <div className={`p-5 rounded-2xl border-2 ${zc.bg} ${zc.border}`}>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4">
                    {zoneTables.map(table => (
                      <TableCard
                        key={table._id}
                        table={table}
                        onAction={setSelectedTable}
                        canManage={canManage}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Action modal */}
      <AnimatePresence>
        {selectedTable && (
          <ActionModal
            table={selectedTable}
            onClose={() => setSelectedTable(null)}
            onConfirm={(action, id, data) => handleAction(action, id, data)}
            canManage={canManage}
          />
        )}
      </AnimatePresence>

      {/* Add table modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowAddModal(false)} />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative z-10 bg-white dark:bg-coffee-900 rounded-2xl shadow-2xl w-full max-w-sm border border-coffee-100 dark:border-coffee-800 overflow-hidden"
            >
              <div className="bg-coffee-gradient p-5">
                <h3 className="font-bold text-white text-lg">Add New Table</h3>
                <p className="text-white/70 text-sm">Configure the new table for your floor plan</p>
              </div>
              <div className="p-5 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-coffee-500 mb-1 block">Table Number *</label>
                    <input className="input w-full" placeholder="e.g. 1, A, 12" value={newTable.number} onChange={e => setNewTable(p => ({ ...p, number: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-xs text-coffee-500 mb-1 block">Label (optional)</label>
                    <input className="input w-full" placeholder="e.g. Window Seat" value={newTable.label} onChange={e => setNewTable(p => ({ ...p, label: e.target.value }))} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-coffee-500 mb-1 block">Capacity</label>
                    <input type="number" min="1" max="20" className="input w-full" value={newTable.capacity} onChange={e => setNewTable(p => ({ ...p, capacity: Number(e.target.value) }))} />
                  </div>
                  <div>
                    <label className="text-xs text-coffee-500 mb-1 block">Shape</label>
                    <select className="input w-full" value={newTable.shape} onChange={e => setNewTable(p => ({ ...p, shape: e.target.value }))}>
                      <option value="square">Square</option>
                      <option value="round">Round</option>
                      <option value="long">Long</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-coffee-500 mb-1 block">Zone</label>
                  <select className="input w-full" value={newTable.zone} onChange={e => setNewTable(p => ({ ...p, zone: e.target.value }))}>
                    {ZONES.map(z => <option key={z}>{z}</option>)}
                  </select>
                </div>
                <div className="flex gap-2 pt-2">
                  <button className="btn-secondary flex-1 py-3" onClick={() => setShowAddModal(false)}>Cancel</button>
                  <button
                    className="btn-primary flex-1 py-3"
                    disabled={!newTable.number || addMutation.isPending}
                    onClick={() => addMutation.mutate({ ...newTable, branch: branchId })}
                  >
                    {addMutation.isPending ? 'Adding…' : 'Add Table'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
