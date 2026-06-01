import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getProducts, createProduct, updateProduct, deleteProduct, getBranches } from '../../api'
import { formatCurrency, CATEGORIES, CATEGORY_EMOJIS } from '../../utils'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'

export default function Products() {
  const queryClient = useQueryClient()
  const [filterCat, setFilterCat] = useState('All')
  const [editingProduct, setEditingProduct] = useState(null)
  const [showModal, setShowModal] = useState(false)
  
  // Form states
  const [name, setName] = useState('')
  const [category, setCategory] = useState('Coffee')
  const [price, setPrice] = useState('')
  const [cost, setCost] = useState('')
  const [description, setDescription] = useState('')
  const [branch, setBranch] = useState('')
  const [isAvailable, setIsAvailable] = useState(true)
  const [imageFile, setImageFile] = useState(null)

  // Queries
  const { data: productsRes, isLoading } = useQuery({
    queryKey: ['products'],
    queryFn: () => getProducts()
  })

  const { data: branchesRes } = useQuery({
    queryKey: ['branches'],
    queryFn: getBranches
  })

  // Mutations
  const createMutation = useMutation({
    mutationFn: createProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      toast.success('Product created!')
      closeModal()
    }
  })

  const updateMutation = useMutation({
    type: 'update',
    mutationFn: ({ id, data }) => updateProduct(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      toast.success('Product updated!')
      closeModal()
    }
  })

  const deleteMutation = useMutation({
    mutationFn: deleteProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      toast.success('Product deleted!')
    }
  })

  const products = productsRes?.data || []
  const branches = branchesRes?.data || []

  const filtered = filterCat === 'All' ? products : products.filter(p => p.category === filterCat)

  const openCreateModal = () => {
    setEditingProduct(null)
    setName('')
    setCategory('Coffee')
    setPrice('')
    setCost('')
    setDescription('')
    setBranch(branches[0]?._id || '')
    setIsAvailable(true)
    setImageFile(null)
    setShowModal(true)
  }

  const openEditModal = (p) => {
    setEditingProduct(p)
    setName(p.name)
    setCategory(p.category)
    setPrice(p.price)
    setCost(p.cost)
    setDescription(p.description || '')
    setBranch(p.branch?._id || p.branch || '')
    setIsAvailable(p.isAvailable)
    setImageFile(null)
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setEditingProduct(null)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!name || !price) return toast.error('Please enter name and price')

    const formData = new FormData()
    formData.append('name', name)
    formData.append('category', category)
    formData.append('price', Number(price))
    formData.append('cost', Number(cost || 0))
    formData.append('description', description)
    formData.append('isAvailable', isAvailable)
    if (branch) formData.append('branch', branch)
    if (imageFile) formData.append('image', imageFile)

    if (editingProduct) {
      updateMutation.mutate({ id: editingProduct._id, data: formData })
    } else {
      createMutation.mutate(formData)
    }
  }

  const handleDelete = (id) => {
    if (window.confirm('Delete this product permanently?')) {
      deleteMutation.mutate(id)
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        {/* Category switcher */}
        <div className="flex overflow-x-auto gap-2 pb-1 w-full sm:w-auto scrollbar-none">
          {['All', ...CATEGORIES].map(cat => (
            <button
              key={cat}
              onClick={() => setFilterCat(cat)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold shrink-0 transition-all ${
                filterCat === cat
                  ? 'bg-coffee-800 text-white dark:bg-coffee-700 shadow-md'
                  : 'bg-white dark:bg-coffee-900 text-coffee-700 dark:text-coffee-300 border border-coffee-100 dark:border-coffee-800'
              }`}
            >
              {cat === 'All' ? '🍽️' : CATEGORY_EMOJIS[cat]} {cat}
            </button>
          ))}
        </div>
        <button onClick={openCreateModal} className="btn-primary shrink-0 py-2.5">
          ➕ Add Product
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="text-3xl animate-pulse-soft">☕</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filtered.length === 0 ? (
            <div className="col-span-full card py-12 text-center text-coffee-400">
              No products found in this category
            </div>
          ) : filtered.map(p => (
            <motion.div layout key={p._id} className="card flex gap-4 items-center">
              {p.image ? (
                <img src={p.image} alt={p.name} className="w-20 h-20 rounded-2xl object-cover border border-coffee-100 dark:border-coffee-800" />
              ) : (
                <div className="w-20 h-20 rounded-2xl bg-coffee-50 dark:bg-coffee-950 flex items-center justify-center text-4xl border border-coffee-100 dark:border-coffee-800">
                  {CATEGORY_EMOJIS[p.category] || '☕'}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-coffee-950 dark:text-coffee-50 truncate">{p.name}</h4>
                  <span className={`badge ${p.isAvailable ? 'badge-success' : 'badge-danger'} text-[10px]`}>
                    {p.isAvailable ? 'Active' : 'Disabled'}
                  </span>
                </div>
                <p className="text-xs text-coffee-500 font-semibold mb-1">{p.category}</p>
                <p className="text-sm font-bold text-coffee-900 dark:text-coffee-100">{formatCurrency(p.price)}</p>
                <p className="text-xs text-coffee-400">Cost: {formatCurrency(p.cost)}</p>
              </div>
              <div className="flex flex-col gap-1.5 shrink-0">
                <button onClick={() => openEditModal(p)} className="btn-secondary px-3 py-1.5 text-xs">Edit</button>
                <button onClick={() => handleDelete(p._id)} className="btn-ghost text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 px-3 py-1.5 text-xs">Delete</button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Product Form Modal */}
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
                {editingProduct ? '📝 Edit Product' : '➕ Create Product'}
              </h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Product Name</label>
                    <input type="text" value={name} onChange={e => setName(e.target.value)} className="input" placeholder="e.g. Mocha Latte" />
                  </div>
                  <div>
                    <label className="label">Category</label>
                    <select value={category} onChange={e => setCategory(e.target.value)} className="input">
                      {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Price (Selling TND)</label>
                    <input type="number" value={price} onChange={e => setPrice(e.target.value)} className="input" placeholder="4.500" />
                  </div>
                  <div>
                    <label className="label">Cost (Ingredients TND)</label>
                    <input type="number" value={cost} onChange={e => setCost(e.target.value)} className="input" placeholder="1.200" />
                  </div>
                </div>

                <div>
                  <label className="label">Branch</label>
                  <select value={branch} onChange={e => setBranch(e.target.value)} className="input">
                    {branches.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
                  </select>
                </div>

                <div>
                  <label className="label">Description</label>
                  <textarea value={description} onChange={e => setDescription(e.target.value)} className="input" rows="2" placeholder="Creamy espresso with milk and chocolate..." />
                </div>

                <div className="flex items-center gap-4 py-2 border-t border-b border-coffee-50 dark:border-coffee-800">
                  <div className="flex items-center gap-2">
                    <input type="checkbox" id="available" checked={isAvailable} onChange={e => setIsAvailable(e.target.checked)} className="rounded text-coffee-800 focus:ring-coffee-700" />
                    <label htmlFor="available" className="text-xs font-semibold">Available for Sale</label>
                  </div>
                  <div>
                    <label className="label text-xs">Product Image</label>
                    <input type="file" onChange={e => setImageFile(e.target.files[0])} className="text-xs" accept="image/*" />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button type="button" onClick={closeModal} className="btn-secondary">Cancel</button>
                  <button type="submit" className="btn-primary">Save Product</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
