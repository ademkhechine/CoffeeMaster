import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getUsers, createUser, updateUser, deleteUser, getBranches } from '../../api'
import { motion, AnimatePresence } from 'framer-motion'
import { FiPlus, FiEdit2, FiTrash2, FiUser, FiShield, FiX, FiCheck, FiSearch } from 'react-icons/fi'
import toast from 'react-hot-toast'
import { useAuthStore } from '../../store'

const ROLES = ['admin', 'manager', 'cashier', 'barista']
const ROLE_COLORS = {
  admin: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400',
  manager: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400',
  cashier: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400',
  barista: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400',
}
const ROLE_GRADIENT = {
  admin: 'from-purple-500 to-violet-600',
  manager: 'from-blue-500 to-cyan-600',
  cashier: 'from-emerald-500 to-teal-600',
  barista: 'from-amber-500 to-orange-600',
}

const EMPTY = { name: '', email: '', password: '', role: 'cashier', branch: '', isActive: true }

export default function Users() {
  const qc = useQueryClient()
  const { user: me } = useAuthStore()
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')

  const { data, isLoading } = useQuery({ queryKey: ['users'], queryFn: getUsers })
  const { data: bData } = useQuery({ queryKey: ['branches'], queryFn: getBranches })
  const users = data?.data?.data || []
  const branches = bData?.data?.data || []

  const { mutate: save, isPending: saving } = useMutation({
    mutationFn: (body) => editing ? updateUser(editing._id, body) : createUser(body),
    onSuccess: () => {
      qc.invalidateQueries(['users'])
      toast.success(editing ? 'User updated!' : 'User created!')
      closeModal()
    }
  })

  const { mutate: remove } = useMutation({
    mutationFn: deleteUser,
    onSuccess: () => { qc.invalidateQueries(['users']); toast.success('User deleted') }
  })

  function openCreate() { setEditing(null); setForm(EMPTY); setModal(true) }
  function openEdit(u) {
    setEditing(u)
    setForm({ name: u.name, email: u.email, password: '', role: u.role, branch: u.branch?._id || '', isActive: u.isActive })
    setModal(true)
  }
  function closeModal() { setModal(false); setEditing(null); setForm(EMPTY) }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!form.name || !form.email) return toast.error('Name and email required')
    if (!editing && !form.password) return toast.error('Password required for new user')
    const body = { ...form }
    if (!body.password) delete body.password
    save(body)
  }

  const filtered = users.filter(u => {
    const matchSearch = u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase())
    const matchRole = roleFilter === 'all' || u.role === roleFilter
    return matchSearch && matchRole
  })

  const roleCounts = ROLES.reduce((acc, r) => ({ ...acc, [r]: users.filter(u => u.role === r).length }), {})

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-coffee-900 dark:text-coffee-50">User Management</h1>
          <p className="text-coffee-500 dark:text-coffee-400 text-sm mt-1">Control roles and access permissions</p>
        </div>
        <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
          onClick={openCreate}
          className="btn-primary flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium">
          <FiPlus /> Add User
        </motion.button>
      </div>

      {/* Role Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {ROLES.map(role => (
          <motion.button key={role} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            onClick={() => setRoleFilter(prev => prev === role ? 'all' : role)}
            className={`rounded-2xl bg-gradient-to-br ${ROLE_GRADIENT[role]} p-4 text-white shadow-lg transition-transform hover:scale-105 ${roleFilter === role ? 'ring-4 ring-white/40' : ''}`}>
            <FiShield className="text-xl mb-2 opacity-80" />
            <p className="text-xs opacity-80 capitalize">{role}</p>
            <p className="text-2xl font-bold">{roleCounts[role] || 0}</p>
          </motion.button>
        ))}
      </div>

      {/* Filters */}
      <div className="card-base rounded-2xl p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-coffee-400" />
          <input className="input-base w-full pl-9" placeholder="Search by name or email..."
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="input-base sm:w-40" value={roleFilter} onChange={e => setRoleFilter(e.target.value)}>
          <option value="all">All Roles</option>
          {ROLES.map(r => <option key={r} value={r} className="capitalize">{r}</option>)}
        </select>
      </div>

      {/* Users Table */}
      <div className="card-base rounded-2xl overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center">
            <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-16 text-center">
            <FiUser className="mx-auto text-5xl text-coffee-300 mb-3" />
            <p className="text-coffee-500">No users found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-coffee-100 dark:border-coffee-800">
                  {['User', 'Role', 'Branch', 'Status', 'Actions'].map(h => (
                    <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-coffee-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <AnimatePresence>
                  {filtered.map((u) => (
                    <motion.tr key={u._id}
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      className="border-b border-coffee-50 dark:border-coffee-800/50 hover:bg-coffee-50 dark:hover:bg-coffee-800/30 transition-colors">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${ROLE_GRADIENT[u.role]} flex items-center justify-center text-white font-bold text-sm`}>
                            {u.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-coffee-900 dark:text-coffee-100">{u.name} {u._id === me?._id && <span className="text-xs text-amber-500">(You)</span>}</p>
                            <p className="text-coffee-500 text-xs">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${ROLE_COLORS[u.role]}`}>{u.role}</span>
                      </td>
                      <td className="px-5 py-3 text-coffee-600 dark:text-coffee-400">
                        {u.branch?.name || <span className="text-coffee-400">—</span>}
                      </td>
                      <td className="px-5 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${u.isActive
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                          : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                          {u.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex gap-2">
                          <button onClick={() => openEdit(u)}
                            className="p-1.5 rounded-lg hover:bg-coffee-100 dark:hover:bg-coffee-700 text-coffee-500 transition-colors">
                            <FiEdit2 size={14} />
                          </button>
                          {u._id !== me?._id && (
                            <button onClick={() => { if (confirm(`Delete "${u.name}"?`)) remove(u._id) }}
                              className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 transition-colors">
                              <FiTrash2 size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      <AnimatePresence>
        {modal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="card-base rounded-2xl p-6 w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-coffee-900 dark:text-coffee-50">{editing ? 'Edit User' : 'Add New User'}</h2>
                <button onClick={closeModal} className="p-2 rounded-lg hover:bg-coffee-100 dark:hover:bg-coffee-800"><FiX /></button>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-coffee-700 dark:text-coffee-300 mb-1">Full Name *</label>
                  <input className="input-base w-full" placeholder="John Doe"
                    value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-coffee-700 dark:text-coffee-300 mb-1">Email *</label>
                  <input className="input-base w-full" type="email" placeholder="john@coffeemaster.com"
                    value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-coffee-700 dark:text-coffee-300 mb-1">
                    Password {editing && <span className="text-coffee-400 font-normal">(leave blank to keep current)</span>}
                  </label>
                  <input className="input-base w-full" type="password" placeholder="••••••••"
                    value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-coffee-700 dark:text-coffee-300 mb-1">Role *</label>
                    <select className="input-base w-full" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
                      {ROLES.map(r => <option key={r} value={r} className="capitalize">{r}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-coffee-700 dark:text-coffee-300 mb-1">Branch</label>
                    <select className="input-base w-full" value={form.branch} onChange={e => setForm(f => ({ ...f, branch: e.target.value }))}>
                      <option value="">No branch</option>
                      {branches.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
                    </select>
                  </div>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm font-medium text-coffee-700 dark:text-coffee-300">Active Account</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only" checked={form.isActive}
                      onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))} />
                    <div className={`w-11 h-6 rounded-full transition-colors ${form.isActive ? 'bg-emerald-500' : 'bg-coffee-300'}`}>
                      <div className={`w-5 h-5 bg-white rounded-full shadow-sm transition-transform mt-0.5 ml-0.5 ${form.isActive ? 'translate-x-5' : 'translate-x-0'}`} />
                    </div>
                  </label>
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={closeModal}
                    className="flex-1 py-2 rounded-xl border border-coffee-200 dark:border-coffee-700 text-coffee-600 dark:text-coffee-400 hover:bg-coffee-50 dark:hover:bg-coffee-800 transition-colors">
                    Cancel
                  </button>
                  <button type="submit" disabled={saving}
                    className="flex-1 btn-primary py-2 rounded-xl font-medium flex items-center justify-center gap-2">
                    <FiCheck /> {saving ? 'Saving...' : editing ? 'Update' : 'Create'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
