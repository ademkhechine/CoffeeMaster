import { useEffect, useState, useRef, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getOrders, updateOrderStatus } from '../../api'
import { useAuthStore } from '../../store'
import { motion, AnimatePresence } from 'framer-motion'
import { io } from 'socket.io-client'
import toast from 'react-hot-toast'
import { getSocketUrl } from '../../utils'

const STATUS_FLOW = { pending: 'preparing', preparing: 'ready' }
const STATUS_META = {
  pending:   { label: 'New',       grad: 'from-amber-500 to-orange-500',  border: 'border-amber-400',   icon: '🔔' },
  preparing: { label: 'Preparing', grad: 'from-blue-500 to-indigo-600',   border: 'border-blue-400',    icon: '🔥' },
  ready:     { label: 'Ready!',    grad: 'from-emerald-500 to-teal-500',  border: 'border-emerald-400', icon: '✅' },
}
const urgency = (mins) => {
  if (mins < 5)  return { cls: 'text-emerald-400', dot: 'bg-emerald-400',           label: 'On time'  }
  if (mins < 10) return { cls: 'text-amber-400',   dot: 'bg-amber-400 animate-pulse', label: 'Due soon' }
  return               { cls: 'text-red-400 animate-pulse', dot: 'bg-red-500 animate-ping', label: 'LATE!' }
}

function LiveClock() {
  const [t, setT] = useState(new Date())
  useEffect(() => { const id = setInterval(() => setT(new Date()), 1000); return () => clearInterval(id) }, [])
  return (
    <div className="text-right hidden sm:block">
      <p className="font-mono text-xl font-bold text-white tracking-widest">
        {t.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
      </p>
      <p className="text-gray-400 text-xs">{t.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}</p>
    </div>
  )
}

function ElapsedTimer({ createdAt }) {
  const [elapsed, setElapsed] = useState(0)
  useEffect(() => {
    const base = new Date(createdAt).getTime()
    const upd = () => setElapsed(Math.floor((Date.now() - base) / 60000))
    upd(); const id = setInterval(upd, 10000); return () => clearInterval(id)
  }, [createdAt])
  const u = urgency(elapsed)
  return (
    <div className="flex items-center gap-1.5">
      <span className={`w-2 h-2 rounded-full ${u.dot}`} />
      <span className={`font-mono text-sm font-bold ${u.cls}`}>{elapsed}m</span>
      <span className={`text-xs ${u.cls} hidden sm:inline`}>{u.label}</span>
    </div>
  )
}

function OrderCard({ order, onAdvance, advancing }) {
  const meta = STATUS_META[order.status] || STATUS_META.pending
  const next = STATUS_FLOW[order.status]
  const [doneItems, setDoneItems] = useState(new Set())
  const elapsed = Math.floor((Date.now() - new Date(order.createdAt)) / 60000)
  const allDone = order.items?.every((_, i) => doneItems.has(i))

  const toggleItem = (i) => setDoneItems(prev => {
    const s = new Set(prev); s.has(i) ? s.delete(i) : s.add(i); return s
  })

  return (
    <motion.div layout
      initial={{ opacity: 0, scale: 0.92, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.88, y: -20 }}
      transition={{ type: 'spring', stiffness: 300, damping: 28 }}
      className={`relative flex flex-col rounded-2xl border-2 ${meta.border} bg-gray-900 shadow-2xl overflow-hidden
        ${elapsed >= 10 ? 'ring-2 ring-red-500/50' : ''}`}
    >
      <div className={`h-1 bg-gradient-to-r ${meta.grad}`} />
      <div className={`bg-gradient-to-r ${meta.grad} px-4 py-3 flex items-center justify-between gap-2`}>
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="text-2xl">{meta.icon}</span>
          <div className="min-w-0">
            <p className="font-black text-white text-sm truncate">
              {order.tableNumber ? `🪑 Table ${order.tableNumber}` : '🚶 Walk-in'}
            </p>
            <p className="text-white/70 text-xs font-mono">
              #{order.orderNumber || order._id?.slice(-6).toUpperCase()}
            </p>
          </div>
        </div>
        <div className="text-right shrink-0">
          <ElapsedTimer createdAt={order.createdAt} />
          <p className="text-white/70 text-xs">{order.items?.length} items</p>
        </div>
      </div>

      <div className="flex-1 p-4 space-y-2 overflow-y-auto max-h-60">
        {(order.items || []).map((item, i) => {
          const done = doneItems.has(i)
          return (
            <motion.button key={i} onClick={() => toggleItem(i)} whileTap={{ scale: 0.97 }}
              className={`w-full flex items-center gap-3 p-2.5 rounded-xl transition-all text-left
                ${done ? 'bg-emerald-900/40 opacity-60' : 'bg-gray-800 hover:bg-gray-700'}`}>
              <span className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-all
                ${done ? 'bg-emerald-500 border-emerald-500' : 'border-gray-500'}`}>
                {done && <span className="text-white text-xs font-bold">✓</span>}
              </span>
              <span className={`w-7 h-7 rounded-lg flex items-center justify-center font-black text-sm shrink-0
                ${done ? 'bg-emerald-700 text-emerald-200' : 'bg-amber-500 text-white'}`}>
                {item.quantity}
              </span>
              <span className={`font-semibold text-sm ${done ? 'text-gray-500 line-through' : 'text-white'}`}>
                {item.name}
              </span>
              {item.notes && <span className="ml-auto text-amber-300 text-xs italic shrink-0">"{item.notes}"</span>}
            </motion.button>
          )
        })}
      </div>

      {order.notes && (
        <div className="mx-4 mb-3 px-3 py-2 bg-yellow-900/30 border border-yellow-600/30 rounded-xl">
          <p className="text-yellow-300 text-xs">📝 {order.notes}</p>
        </div>
      )}

      {order.status !== 'ready' && order.items?.length > 0 && (
        <div className="mx-4 mb-3">
          <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
            <motion.div className="h-full bg-emerald-500 rounded-full"
              animate={{ width: `${(doneItems.size / order.items.length) * 100}%` }}
              transition={{ type: 'spring', stiffness: 200 }} />
          </div>
          <p className="text-xs text-gray-500 mt-1 text-right">{doneItems.size}/{order.items.length} items checked</p>
        </div>
      )}

      <div className="p-3 pt-0">
        {next ? (
          <motion.button whileTap={{ scale: 0.96 }}
            onClick={() => onAdvance(order._id, next)}
            disabled={advancing === order._id}
            className={`w-full py-3 rounded-xl font-bold text-white text-sm transition-all disabled:opacity-40
              ${next === 'preparing'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:brightness-110 shadow-lg shadow-blue-900/30'
                : allDone
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:brightness-110 shadow-lg shadow-emerald-900/30 animate-pulse'
                  : 'bg-gray-700 hover:bg-gray-600'}`}>
            {advancing === order._id
              ? <span className="flex items-center justify-center gap-2"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Updating…</span>
              : next === 'preparing' ? '🔥 Start Preparing'
              : allDone ? '✅ Mark Ready — All Done!'
              : `✅ Mark Ready (${doneItems.size}/${order.items?.length} checked)`}
          </motion.button>
        ) : (
          <div className="w-full py-2.5 rounded-xl text-center text-emerald-400 text-sm font-bold border border-emerald-600/40 bg-emerald-900/20 flex items-center justify-center gap-2">
            <motion.span animate={{ scale: [1,1.3,1] }} transition={{ repeat: Infinity, duration: 1.5 }}>✅</motion.span>
            Ready for Pickup
          </div>
        )}
      </div>
    </motion.div>
  )
}

function KDSColumn({ title, icon, colorCls, orders, onAdvance, advancing, emptyMsg }) {
  return (
    <div className="flex flex-col gap-3 min-h-0">
      <div className={`flex items-center justify-between px-4 py-3 rounded-2xl ${colorCls}`}>
        <div className="flex items-center gap-2">
          <span className="text-xl">{icon}</span>
          <span className="font-bold text-white text-sm">{title}</span>
        </div>
        <span className="bg-white/20 text-white font-black text-sm px-3 py-0.5 rounded-full">{orders.length}</span>
      </div>
      <div className="flex flex-col gap-4 overflow-y-auto flex-1 pr-1">
        <AnimatePresence mode="popLayout">
          {orders.length === 0 ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-16 text-gray-600 text-center">
              <span className="text-4xl mb-2">☕</span>
              <p className="text-sm font-medium">{emptyMsg}</p>
            </motion.div>
          ) : orders.map(o => (
            <OrderCard key={o._id} order={o} onAdvance={onAdvance} advancing={advancing} />
          ))}
        </AnimatePresence>
      </div>
    </div>
  )
}

export default function Kitchen() {
  const { token } = useAuthStore()
  const qc = useQueryClient()
  const [advancing, setAdvancing] = useState(null)
  const [view, setView] = useState('columns')
  const [muted, setMuted] = useState(false)
  const socketRef = useRef(null)
  const audioCtxRef = useRef(null)

  const playPing = useCallback(() => {
    if (muted) return
    try {
      if (!audioCtxRef.current) audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)()
      const ctx = audioCtxRef.current
      const osc = ctx.createOscillator(); const gain = ctx.createGain()
      osc.connect(gain); gain.connect(ctx.destination)
      osc.frequency.setValueAtTime(880, ctx.currentTime)
      osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.3)
      gain.gain.setValueAtTime(0.4, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5)
      osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.5)
    } catch {}
  }, [muted])

  useEffect(() => {
    const socket = io(getSocketUrl(), { auth: { token } })
    socketRef.current = socket
    socket.emit('join-kitchen')
    const refresh = () => qc.invalidateQueries({ queryKey: ['kitchen-orders'] })
    socket.on('order:new', () => {
      playPing()
      toast('🔔 New order in!', { icon: '🆕', style: { background: '#1a1a1a', color: '#fff', border: '1px solid #f59e0b' }, duration: 4000 })
      refresh()
    })
    socket.on('order:created', () => { playPing(); refresh() })
    socket.on('order:updated', refresh)
    return () => socket.disconnect()
  }, [token, qc, playPing])

  const { data, isLoading } = useQuery({
    queryKey: ['kitchen-orders'],
    queryFn: () => getOrders({ status: 'pending,preparing,ready', limit: 60 }),
    refetchInterval: 20000,
  })

  const allOrders = (data?.data?.orders || data?.data || [])
    .filter(o => ['pending', 'preparing', 'ready'].includes(o.status))
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))

  const byStatus = {
    pending:   allOrders.filter(o => o.status === 'pending'),
    preparing: allOrders.filter(o => o.status === 'preparing'),
    ready:     allOrders.filter(o => o.status === 'ready'),
  }
  const lateCount = allOrders.filter(o =>
    o.status !== 'ready' && Math.floor((Date.now() - new Date(o.createdAt)) / 60000) >= 10
  ).length

  const { mutate: advance } = useMutation({
    mutationFn: ({ id, status }) => updateOrderStatus(id, status),
    onMutate: ({ id }) => setAdvancing(id),
    onSuccess: (_, { status }) => {
      qc.invalidateQueries({ queryKey: ['kitchen-orders'] })
      setAdvancing(null)
      socketRef.current?.emit('order:status-changed')
      if (status === 'ready')
        toast.success('✅ Order ready — notify cashier!', { style: { background: '#065f46', color: '#fff' } })
    },
    onError: () => setAdvancing(null),
  })

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* Top bar */}
      <div className="bg-gray-900 border-b border-gray-800 px-5 py-3 flex items-center justify-between gap-4 flex-wrap shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-xl shadow-lg shadow-amber-900/40">☕</div>
          <div>
            <h1 className="text-lg font-black text-white">Kitchen Display</h1>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-emerald-400 text-xs font-medium">Live</span>
              {lateCount > 0 && (
                <span className="ml-2 bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full animate-pulse">
                  ⚠️ {lateCount} LATE
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex gap-2">
            {[
              { label: 'Pending',   val: byStatus.pending.length,   cls: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
              { label: 'Preparing', val: byStatus.preparing.length, cls: 'bg-blue-500/20 text-blue-300 border-blue-500/30' },
              { label: 'Ready',     val: byStatus.ready.length,     cls: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
            ].map(({ label, val, cls }) => (
              <div key={label} className={`border rounded-xl px-3 py-1 text-center min-w-[58px] ${cls}`}>
                <p className="font-black text-xl leading-tight">{val}</p>
                <p className="text-xs font-medium leading-tight">{label}</p>
              </div>
            ))}
          </div>
          <div className="flex gap-1 bg-gray-800 p-1 rounded-xl">
            {[['columns','⊞ Columns'],['grid','⊟ Grid']].map(([v,l]) => (
              <button key={v} onClick={() => setView(v)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${view===v ? 'bg-amber-500 text-white' : 'text-gray-400 hover:text-white'}`}>
                {l}
              </button>
            ))}
          </div>
          <button onClick={() => setMuted(m => !m)}
            title={muted ? 'Unmute' : 'Mute alerts'}
            className={`p-2 rounded-xl transition-all ${muted ? 'bg-red-900/40 text-red-400' : 'bg-gray-800 text-gray-400 hover:text-white'}`}>
            {muted ? '🔇' : '🔔'}
          </button>
          <LiveClock />
        </div>
      </div>

      {/* Main content */}
      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="w-14 h-14 border-4 border-gray-700 border-t-amber-500 rounded-full animate-spin" />
            <p className="text-gray-500 animate-pulse">Loading orders…</p>
          </div>
        </div>
      ) : view === 'columns' ? (
        <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4 p-5 overflow-hidden min-h-0">
          <KDSColumn title="New Orders" icon="🔔" colorCls="bg-amber-600/30 border border-amber-500/20"
            orders={byStatus.pending} onAdvance={(id,s) => advance({id,status:s})} advancing={advancing} emptyMsg="No pending orders" />
          <KDSColumn title="Preparing" icon="🔥" colorCls="bg-blue-700/30 border border-blue-500/20"
            orders={byStatus.preparing} onAdvance={(id,s) => advance({id,status:s})} advancing={advancing} emptyMsg="Nothing in progress" />
          <KDSColumn title="Ready for Pickup" icon="✅" colorCls="bg-emerald-700/30 border border-emerald-500/20"
            orders={byStatus.ready} onAdvance={(id,s) => advance({id,status:s})} advancing={advancing} emptyMsg="No orders ready" />
        </div>
      ) : (
        <div className="flex-1 p-5 overflow-y-auto">
          {allOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 gap-3 text-gray-600">
              <span className="text-6xl">☕</span>
              <p className="text-lg font-bold">Kitchen is clear</p>
              <p className="text-sm">Waiting for new orders…</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4">
              <AnimatePresence mode="popLayout">
                {allOrders.map(o => (
                  <OrderCard key={o._id} order={o} advancing={advancing} onAdvance={(id,s) => advance({id,status:s})} />
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      )}

      {/* Status legend */}
      <div className="bg-gray-900 border-t border-gray-800 px-5 py-2 flex items-center justify-between text-xs text-gray-500 shrink-0 flex-wrap gap-2">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400 inline-block"/>0–5m: On time</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block"/>5–10m: Due soon</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500 inline-block"/>10m+: LATE</span>
        </div>
        <span>Tap item rows to check off individual items</span>
      </div>
    </div>
  )
}
