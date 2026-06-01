import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getBranches, createBranch, updateBranch, deleteBranch } from '../../api'
import { motion, AnimatePresence } from 'framer-motion'
import { FiPlus, FiEdit2, FiTrash2, FiMapPin, FiPhone, FiMail, FiToggleLeft, FiToggleRight, FiX, FiCheck } from 'react-icons/fi'
import { MdStorefront } from 'react-icons/md'
import toast from 'react-hot-toast'

const EMPTY = { name: '', address: '', phone: '', email: '', isActive: true }

export default function Branches() {
  const qc = useQueryClient()
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY)

  const { data, isLoading } = useQuery({ queryKey: ['branches'], queryFn: getBranches })
  const branches = data?.data || []

  const { mutate: save, isPending: saving } = useMutation({
    mutationFn: (body) => editing ? updateBranch(editing._id, body) : createBranch(body),
    onSuccess: () => {
      qc.invalidateQueries(['branches'])
      toast.success(editing ? 'Branch updated!' : 'Branch created!')
      closeModal()
    }
  })

  const { mutate: remove } = useMutation({
    mutationFn: deleteBranch,
    onSuccess: () => { qc.invalidateQueries(['branches']); toast.success('Branch deleted') }
  })

  function openCreate() { setEditing(null); setForm(EMPTY); setModal(true) }
  function openEdit(b) { setEditing(b); setForm({ name: b.name, address: b.address, phone: b.phone, email: b.email, isActive: b.isActive }); setModal(true) }
  function closeModal() { setModal(false); setEditing(null); setForm(EMPTY) }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!form.name.trim() || !form.address.trim()) return toast.error('Name and address are required')
    save(form)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-coffee-900 dark:text-coffee-50">Branch Management</h1>
          <p className="text-coffee-500 dark:text-coffee-400 text-sm mt-1">Manage your coffee shop locations</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
          onClick={openCreate}
          className="btn-primary flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium"
        >
          <FiPlus /> Add Branch
        </motion.button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Total Branches', value: branches.length, color: 'from-amber-500 to-orange-600' },
          { label: 'Active', value: branches.filter(b => b.isActive).length, color: 'from-emerald-500 to-teal-600' },
          { label: 'Inactive', value: branches.filter(b => !b.isActive).length, color: 'from-red-500 to-rose-600' },
        ].map((s) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            className={`rounded-2xl bg-gradient-to-br ${s.color} p-5 text-white shadow-lg`}>
            <p className="text-sm opacity-80">{s.label}</p>
            <p className="text-3xl font-bold mt-1">{s.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Branch Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array(3).fill(0).map((_, i) => (
            <div key={i} className="card-base p-6 rounded-2xl animate-pulse h-52 bg-coffee-100 dark:bg-coffee-800" />
          ))}
        </div>
      ) : branches.length === 0 ? (
        <div className="card-base rounded-2xl p-16 text-center">
          <MdStorefront className="mx-auto text-6xl text-coffee-300 mb-4" />
          <p className="text-coffee-500 font-medium">No branches yet</p>
          <p className="text-coffee-400 text-sm mt-1">Add your first branch location to get started</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence>
            {branches.map((b) => (
              <motion.div key={b._id}
                initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                className="card-base rounded-2xl p-6 hover:shadow-lg transition-shadow relative group"
              >
                {/* Status badge */}
                <span className={`absolute top-4 right-4 text-xs font-semibold px-2 py-0.5 rounded-full ${
                  b.isActive ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400'
                             : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400'
                }`}>
                  {b.isActive ? 'Active' : 'Inactive'}
                </span>

                <div className="flex items-start gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                    <MdStorefront className="text-amber-600 text-xl" />
                  </div>
                  <div>
                    <h3 className="font-bold text-coffee-900 dark:text-coffee-50">{b.name}</h3>
                  </div>
                </div>

                <div className="space-y-2 text-sm text-coffee-600 dark:text-coffee-400">
                  {b.address && (
                    <div className="flex items-start gap-2">
                      <FiMapPin className="shrink-0 mt-0.5" />
                      <span>{b.address}</span>
                    </div>
                  )}
                  {b.phone && (
                    <div className="flex items-center gap-2">
                      <FiPhone />
                      <span>{b.phone}</span>
                    </div>
                  )}
                  {b.email && (
                    <div className="flex items-center gap-2">
                      <FiMail />
                      <span>{b.email}</span>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2 mt-4 pt-4 border-t border-coffee-100 dark:border-coffee-800">
                  <button onClick={() => openEdit(b)}
                    className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-sm text-coffee-600 dark:text-coffee-400 hover:bg-coffee-100 dark:hover:bg-coffee-800 transition-colors">
                    <FiEdit2 size={14} /> Edit
                  </button>
                  <button onClick={() => { if (confirm(`Delete "${b.name}"?`)) remove(b._id) }}
                    className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                    <FiTrash2 size={14} /> Delete
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Modal */}
      <AnimatePresence>
        {modal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="card-base rounded-2xl p-6 w-full max-w-md shadow-2xl">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-coffee-900 dark:text-coffee-50">
                  {editing ? 'Edit Branch' : 'Add New Branch'}
                </h2>
                <button onClick={closeModal} className="p-2 rounded-lg hover:bg-coffee-100 dark:hover:bg-coffee-800">
                  <FiX />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-coffee-700 dark:text-coffee-300 mb-1">Branch Name *</label>
                  <input className="input-base w-full" placeholder="e.g. Downtown Branch"
                    value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-coffee-700 dark:text-coffee-300 mb-1">Address *</label>
                  <textarea className="input-base w-full resize-none h-20" placeholder="Full address..."
                    value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-coffee-700 dark:text-coffee-300 mb-1">Phone</label>
                    <input className="input-base w-full" placeholder="+213 ..."
                      value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-coffee-700 dark:text-coffee-300 mb-1">Email</label>
                    <input className="input-base w-full" type="email" placeholder="branch@..."
                      value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
                  </div>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm font-medium text-coffee-700 dark:text-coffee-300">Active Status</span>
                  <button type="button" onClick={() => setForm(f => ({ ...f, isActive: !f.isActive }))}
                    className={`text-2xl transition-colors ${form.isActive ? 'text-emerald-500' : 'text-coffee-400'}`}>
                    {form.isActive ? <FiToggleRight /> : <FiToggleLeft />}
                  </button>
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
