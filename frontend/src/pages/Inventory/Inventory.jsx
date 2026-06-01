import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getIngredients, createIngredient, adjustStock, getBranches } from '../../api'
import { formatDate, STOCK_STATUS } from '../../utils'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'

export default function Inventory() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [selectedBranch, setSelectedBranch] = useState('All')
  const [showAdjustModal, setShowAdjustModal] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [activeIngredient, setActiveIngredient] = useState(null)

  // Adjust Form
  const [adjustType, setAdjustType] = useState('in')
  const [adjustQty, setAdjustQty] = useState('')
  const [adjustNote, setAdjustNote] = useState('')

  // Create Form
  const [name, setName] = useState('')
  const [unit, setUnit] = useState('kg')
  const [quantity, setQuantity] = useState('')
  const [minQuantity, setMinQuantity] = useState('')
  const [costPerUnit, setCostPerUnit] = useState('')
  const [supplier, setSupplier] = useState('')
  const [expirationDate, setExpirationDate] = useState('')
  const [branch, setBranch] = useState('')

  // Queries
  const { data: ingredientsRes, isLoading } = useQuery({
    queryKey: ['ingredients', selectedBranch],
    queryFn: () => getIngredients({ branch: selectedBranch === 'All' ? undefined : selectedBranch })
  })

  const { data: branchesRes } = useQuery({
    queryKey: ['branches'],
    queryFn: getBranches
  })

  // Mutations
  const createMutation = useMutation({
    mutationFn: createIngredient,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ingredients'] })
      toast.success('Ingredient created!')
      closeCreateModal()
    }
  })

  const adjustMutation = useMutation({
    mutationFn: ({ id, data }) => adjustStock(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ingredients'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['low-stock'] })
      toast.success('Stock adjusted successfully!')
      closeAdjustModal()
    }
  })

  const ingredients = ingredientsRes?.data || []
  const branches = branchesRes?.data || []

  const filtered = ingredients.filter(i => i.name.toLowerCase().includes(search.toLowerCase()))

  const openAdjustModal = (ing) => {
    setActiveIngredient(ing)
    setAdjustType('in')
    setAdjustQty('')
    setAdjustNote('')
    setShowAdjustModal(true)
  }

  const closeAdjustModal = () => {
    setShowAdjustModal(false)
    setActiveIngredient(null)
  }

  const handleAdjustSubmit = (e) => {
    e.preventDefault()
    if (!adjustQty || adjustQty <= 0) return toast.error('Enter a valid quantity')
    adjustMutation.mutate({
      id: activeIngredient._id,
      data: { type: adjustType, quantity: Number(adjustQty), note: adjustNote }
    })
  }

  const openCreateModal = () => {
    setName('')
    setUnit('kg')
    setQuantity('')
    setMinQuantity('')
    setCostPerUnit('')
    setSupplier('')
    setExpirationDate('')
    setBranch(branches[0]?._id || '')
    setShowCreateModal(true)
  }

  const closeCreateModal = () => {
    setShowCreateModal(false)
  }

  const handleCreateSubmit = (e) => {
    e.preventDefault()
    if (!name || !quantity) return toast.error('Name and starting quantity required')
    createMutation.mutate({
      name, unit, quantity: Number(quantity), minQuantity: Number(minQuantity || 0),
      costPerUnit: Number(costPerUnit || 0), supplier,
      expirationDate: expirationDate ? new Date(expirationDate) : undefined,
      branch
    })
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <input
            type="text"
            placeholder="Search ingredients..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input sm:max-w-xs"
          />
          <select
            value={selectedBranch}
            onChange={e => setSelectedBranch(e.target.value)}
            className="input sm:max-w-xs"
          >
            <option value="All">All Branches</option>
            {branches.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
          </select>
        </div>
        <button onClick={openCreateModal} className="btn-primary py-2.5">
          ➕ New Ingredient
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="text-3xl animate-pulse-soft">📦</div>
        </div>
      ) : (
        <div className="table-container bg-white dark:bg-coffee-900 shadow-coffee">
          <table className="table">
            <thead>
              <tr>
                <th>Ingredient</th>
                <th>Branch</th>
                <th>Quantity</th>
                <th>Min Limit</th>
                <th>Status</th>
                <th>Expiration Date</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-8 text-coffee-400">No ingredients found</td>
                </tr>
              ) : filtered.map(ing => {
                const s = STOCK_STATUS(ing.quantity, ing.minQuantity)
                return (
                  <tr key={ing._id}>
                    <td className="font-semibold text-coffee-950 dark:text-coffee-100">{ing.name}</td>
                    <td>{ing.branch?.name || '-'}</td>
                    <td className="font-mono">{ing.quantity} {ing.unit}</td>
                    <td className="font-mono">{ing.minQuantity} {ing.unit}</td>
                    <td>
                      <span className={`badge ${s.cls}`}>{s.label}</span>
                    </td>
                    <td>{ing.expirationDate ? formatDate(ing.expirationDate) : <span className="text-coffee-400">-</span>}</td>
                    <td className="text-right">
                      <button onClick={() => openAdjustModal(ing)} className="btn-secondary px-3 py-1.5 text-xs">
                        Adjust Stock
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Adjust Stock Modal */}
      <AnimatePresence>
        {showAdjustModal && activeIngredient && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={closeAdjustModal} />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-coffee-900 rounded-3xl p-6 w-full max-w-md relative z-10 shadow-2xl"
            >
              <h3 className="font-bold text-lg mb-4 text-coffee-950 dark:text-coffee-100">
                🔄 Adjust Stock: {activeIngredient.name}
              </h3>
              <form onSubmit={handleAdjustSubmit} className="space-y-4">
                <div>
                  <label className="label">Adjustment Type</label>
                  <div className="grid grid-cols-3 gap-2">
                    {['in', 'out', 'adjustment'].map(t => (
                      <button
                        type="button"
                        key={t}
                        onClick={() => setAdjustType(t)}
                        className={`py-2 rounded-xl text-xs font-semibold capitalize border ${
                          adjustType === t
                            ? 'bg-coffee-800 text-white border-transparent'
                            : 'border-coffee-200 dark:border-coffee-700 hover:bg-coffee-50'
                        }`}
                      >
                        {t === 'in' ? '➕ Stock In' : t === 'out' ? '➖ Stock Out' : '✏️ Set Absolute'}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="label">Quantity ({activeIngredient.unit})</label>
                  <input
                    type="number"
                    value={adjustQty}
                    onChange={e => setAdjustQty(e.target.value)}
                    className="input"
                    placeholder="e.g. 5"
                  />
                </div>

                <div>
                  <label className="label">Adjustment Note</label>
                  <input
                    type="text"
                    value={adjustNote}
                    onChange={e => setAdjustNote(e.target.value)}
                    className="input"
                    placeholder="e.g. Supplier delivery"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button type="button" onClick={closeAdjustModal} className="btn-secondary">Cancel</button>
                  <button type="submit" className="btn-primary">Apply adjustment</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Create Ingredient Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={closeCreateModal} />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-coffee-900 rounded-3xl p-6 w-full max-w-lg relative z-10 shadow-2xl overflow-y-auto max-h-[90vh]"
            >
              <h3 className="font-bold text-lg mb-4 text-coffee-950 dark:text-coffee-100">
                📦 Add New Ingredient
              </h3>
              <form onSubmit={handleCreateSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Name</label>
                    <input type="text" value={name} onChange={e => setName(e.target.value)} className="input" placeholder="e.g. Coffee Beans" />
                  </div>
                  <div>
                    <label className="label">Measurement Unit</label>
                    <select value={unit} onChange={e => setUnit(e.target.value)} className="input">
                      {['kg', 'g', 'L', 'ml', 'pcs', 'box', 'bottle'].map(u => <option key={u} value={u}>{u}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Starting Qty</label>
                    <input type="number" value={quantity} onChange={e => setQuantity(e.target.value)} className="input" placeholder="10" />
                  </div>
                  <div>
                    <label className="label">Min Alert limit</label>
                    <input type="number" value={minQuantity} onChange={e => setMinQuantity(e.target.value)} className="input" placeholder="2" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Cost per unit (DZD)</label>
                    <input type="number" value={costPerUnit} onChange={e => setCostPerUnit(e.target.value)} className="input" placeholder="2500" />
                  </div>
                  <div>
                    <label className="label">Supplier Name</label>
                    <input type="text" value={supplier} onChange={e => setSupplier(e.target.value)} className="input" placeholder="Premium Bean Co." />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Expiration Date</label>
                    <input type="date" value={expirationDate} onChange={e => setExpirationDate(e.target.value)} className="input" />
                  </div>
                  <div>
                    <label className="label">Branch</label>
                    <select value={branch} onChange={e => setBranch(e.target.value)} className="input">
                      {branches.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
                    </select>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button type="button" onClick={closeCreateModal} className="btn-secondary">Cancel</button>
                  <button type="submit" className="btn-primary">Add Ingredient</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
