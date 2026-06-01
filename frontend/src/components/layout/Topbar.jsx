import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getNotifications, markNotificationRead, markAllRead, getBranch } from '../../api'
import { useNotificationStore, useAuthStore } from '../../store'
import { formatDateTime } from '../../utils'
import { motion, AnimatePresence } from 'framer-motion'

export default function Topbar({ onMenuClick, title }) {
  const { user, logout } = useAuthStore()
  const [showNotifs, setShowNotifs] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [clock, setClock] = useState(new Date())
  const { notifications, unreadCount, setNotifications, markRead } = useNotificationStore()
  const navigate = useNavigate()

  useEffect(() => {
    const t = setInterval(() => setClock(new Date()), 60000)
    return () => clearInterval(t)
  }, [])

  const branchId = user?.branch?._id || user?.branch
  const { data: branchRes } = useQuery({
    queryKey: ['branch', branchId],
    queryFn: () => getBranch(branchId),
    enabled: !!branchId,
    staleTime: 5 * 60 * 1000,
  })
  const branch = branchRes?.data || branchRes || null

  useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const res = await getNotifications({ isRead: false })
      setNotifications(res.data.notifications, res.data.unreadCount)
      return res.data
    },
    refetchInterval: 30000,
  })

  const handleMarkRead = async (id) => {
    await markNotificationRead(id)
    markRead(id)
  }

  const severityIcon = { info: 'ℹ️', warning: '⚠️', danger: '🚨', success: '✅' }

  return (
    <header className="h-16 bg-white dark:bg-coffee-900 border-b border-coffee-100 dark:border-coffee-800
                       flex items-center justify-between px-6 sticky top-0 z-10 shadow-sm">
      <div className="flex items-center gap-4">
        <button
          onClick={onMenuClick}
          className="lg:hidden btn-ghost p-2 rounded-xl"
          aria-label="Toggle sidebar"
        >
          ☰
        </button>
        <h2 className="font-semibold text-coffee-900 dark:text-coffee-100 text-lg">{title}</h2>
      </div>

      <div className="flex items-center gap-3">
        {/* Live Clock */}
        <span className="hidden md:block text-xs font-mono text-coffee-400 dark:text-coffee-600">
          {clock.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
        </span>

        {/* Branch badge with logo */}
        {user?.branch && (
          <div className="hidden sm:flex items-center gap-2 badge badge-coffee text-xs px-3 py-1.5">
            {branch?.logo
              ? <img src={branch.logo} alt="logo" className="w-4 h-4 object-contain rounded" />
              : <span>🏪</span>}
            <span>{user.branch.name || branch?.name}</span>
          </div>
        )}

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => setShowNotifs(!showNotifs)}
            className="relative btn-ghost p-2 rounded-xl"
          >
            🔔
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-xs rounded-full
                               flex items-center justify-center font-bold animate-pulse-soft">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          <AnimatePresence>
            {showNotifs && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowNotifs(false)} />
                <motion.div
                  initial={{ opacity: 0, y: -8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.95 }}
                  className="absolute right-0 top-12 w-80 card shadow-coffee-lg z-20 p-0 overflow-hidden"
                >
                  <div className="flex items-center justify-between p-4 border-b border-coffee-100 dark:border-coffee-800">
                    <span className="font-semibold text-sm">Notifications</span>
                    {unreadCount > 0 && (
                      <button className="text-xs text-coffee-500 hover:text-coffee-800 transition-colors"
                        onClick={() => markAllRead()}>
                        Mark all read
                      </button>
                    )}
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <p className="p-6 text-center text-coffee-400 text-sm">No new notifications</p>
                    ) : notifications.map(n => (
                      <div key={n._id}
                        className="flex gap-3 p-4 hover:bg-coffee-50 dark:hover:bg-coffee-800/50 cursor-pointer border-b border-coffee-50 dark:border-coffee-800/50 transition-colors"
                        onClick={() => handleMarkRead(n._id)}>
                        <span className="text-lg shrink-0">{severityIcon[n.severity] || 'ℹ️'}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-coffee-900 dark:text-coffee-100">{n.title}</p>
                          <p className="text-xs text-coffee-500 mt-0.5 line-clamp-2">{n.message}</p>
                          <p className="text-xs text-coffee-400 mt-1">{formatDateTime(n.createdAt)}</p>
                        </div>
                        {!n.isRead && <div className="w-2 h-2 bg-coffee-600 rounded-full shrink-0 mt-1" />}
                      </div>
                    ))}
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>

        {/* User avatar and menu */}
        <div className="relative">
          <button onClick={() => setShowUserMenu(!showUserMenu)}
            className="w-9 h-9 rounded-full bg-coffee-gradient flex items-center justify-center
                       text-white text-sm font-bold shadow-md hover:shadow-coffee transition-shadow cursor-pointer">
            {user?.name?.[0] || 'U'}
          </button>

          <AnimatePresence>
            {showUserMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowUserMenu(false)} />
                <motion.div
                  initial={{ opacity: 0, y: -8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.95 }}
                  className="absolute right-0 top-12 w-56 card shadow-coffee-lg z-20 p-2 overflow-hidden bg-white dark:bg-coffee-950 border border-coffee-100 dark:border-coffee-800"
                >
                  <div className="px-3 py-2 border-b border-coffee-50 dark:border-coffee-800/60 mb-1">
                    <p className="text-xs font-bold text-coffee-900 dark:text-coffee-100 truncate">{user?.name}</p>
                    <p className="text-[10px] text-coffee-400 capitalize">{user?.role}</p>
                  </div>
                  
                  <button onClick={() => { setShowUserMenu(false); navigate('/settings'); }}
                    className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold hover:bg-coffee-50 dark:hover:bg-coffee-800/40 text-coffee-700 dark:text-coffee-300 transition-colors flex items-center gap-2">
                    <span>⚙️</span> Settings
                  </button>
                  
                  <button onClick={() => { setShowUserMenu(false); logout(); navigate('/login'); }}
                    className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold hover:bg-red-50 dark:hover:bg-red-900/10 text-red-500 hover:text-red-600 transition-colors flex items-center gap-2">
                    <span>🚪</span> Log Out
                  </button>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  )
}
