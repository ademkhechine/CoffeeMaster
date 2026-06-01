import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getPurchaseOrders, createPurchaseOrder, validatePurchaseOrder, cancelPurchaseOrder, getSuppliers, getIngredients } from '../../api'
import { formatCurrency, formatDate } from '../../utils'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'

export default function PurchaseOrders() {
  const queryClient = useQueryClient()
  const [createModal, setCreateModal] = useState(false)
  const [detailsModal, setDetailsModal] = useState(null)

  // PO Form states
  const [supplier, setSupplier] = useState('')
  const [notes, setNotes] = useState('')
  const [items, setItems] = useState([])

  // Add Item states
  const [selectedIngredient, setSelectedIngredient] = useState('')
  const [qty, setQty] = useState('')
  const [cost, setCost] = useState('')

  const { data: posData, isLoading: posLoading } = useQuery({
    queryKey: ['purchase-orders'],
    queryFn: () => getPurchaseOrders()
  })

  const { data: suppliersData } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => getSuppliers()
  })

  const { data: ingredientsData } = useQuery({
    queryKey: ['ingredients'],
    queryFn: () => getIngredients()
  })

  const pos = posData?.data?.data || []
  const suppliers = suppliersData?.data?.data || []
  const ingredients = ingredientsData?.data?.data || []

  const saveMutation = useMutation({
    mutationFn: createPurchaseOrder,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] })
      toast.success('Purchase order created in pending status!')
      closeCreate()
    }
  })

  const validateMutation = useMutation({
    mutationFn: validatePurchaseOrder,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] })
      queryClient.invalidateQueries({ queryKey: ['ingredients'] })
      queryClient.invalidateQueries({ queryKey: ['suppliers'] })
      toast.success('Procurement completed! Stock replenished and supplier outstanding balance updated.')
      setDetailsModal(null)
    }
  })

  const cancelMutation = useMutation({
    mutationFn: cancelPurchaseOrder,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] })
      toast.success('Purchase order cancelled.')
      setDetailsModal(null)
    }
  })

  const closeCreate = () => {
    setCreateModal(false)
    setSupplier('')
    setNotes('')
    setItems([])
    setSelectedIngredient('')
    setQty('')
    setCost('')
  }

  const handleAddItem = () => {
    if (!selectedIngredient) return toast.error('Please select an ingredient.')
    const quantity = Number(qty)
    const costPerUnit = Number(cost)
    if (!quantity || quantity <= 0) return toast.error('Please enter a valid quantity.')
    if (!costPerUnit || costPerUnit <= 0) return toast.error('Please enter a valid cost per unit.')

    const ing = ingredients.find(i => i._id === selectedIngredient)
    if (!ing) return

    // Prevent duplicates
    if (items.some(i => i.ingredient === selectedIngredient)) {
      return toast.error('Ingredient already added to order list.')
    }

    setItems([...items, {
      ingredient: selectedIngredient,
      name: ing.name,
      unit: ing.unit,
      quantity,
      costPerUnit,
      total: quantity * costPerUnit
    }])

    setSelectedIngredient('')
    setQty('')
    setCost('')
  }

  const handleRemoveItem = (index) => {
    setItems(items.filter((_, idx) => idx !== index))
  }

  const handlePOModelSubmit = (e) => {
    e.preventDefault()
    if (!supplier) return toast.error('Please select a supplier.')
    if (!items.length) return toast.error('Please add at least one procurement item.')

    saveMutation.mutate({
      supplier,
      items: items.map(i => ({
        ingredient: i.ingredient,
        name: i.name,
        quantity: i.quantity,
        costPerUnit: i.costPerUnit
      })),
      notes
    })
  }

  const totalAmount = items.reduce((sum, item) => sum + item.total, 0)

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-coffee-950 dark:text-coffee-50">📋 Procurement & Purchase Orders</h2>
          <p className="text-xs text-coffee-500">Manage raw ingredient orders, receive stock, and monitor replenishment logs.</p>
        </div>
        <button onClick={() => setCreateModal(true)} className="btn-primary flex items-center gap-2 py-2 px-4 text-sm font-semibold">
          <span>➕</span> New Purchase Order
        </button>
      </div>

      {posLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-coffee-600" />
        </div>
      ) : pos.length === 0 ? (
        <div className="card text-center p-12 border border-coffee-100 dark:border-coffee-800">
          <span className="text-5xl block mb-4">📋</span>
          <h3 className="font-semibold text-coffee-800 dark:text-coffee-200">No Purchase Orders</h3>
          <p className="text-xs text-coffee-500 mt-1 font-medium">Create POs to buy inventory items from wholesale vendors.</p>
        </div>
      ) : (
        <div className="card border border-coffee-100 dark:border-coffee-850 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="table-auto w-full text-left border-collapse">
              <thead>
                <tr className="bg-coffee-50 dark:bg-coffee-800/40 text-[10px] uppercase font-bold text-coffee-600 dark:text-coffee-400 border-b border-coffee-100 dark:border-coffee-800">
                  <th className="p-4">PO Number</th>
                  <th className="p-4">Supplier</th>
                  <th className="p-4">Total Amount</th>
                  <th className="p-4">Order Date</th>
                  <th className="p-4">Procured By</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-coffee-50 dark:divide-coffee-800/60 text-xs">
                {pos.map(po => (
                  <tr key={po._id} className="hover:bg-coffee-50/30 dark:hover:bg-coffee-800/10 transition-colors">
                    <td className="p-4 font-bold text-coffee-950 dark:text-coffee-50">{po.poNumber}</td>
                    <td className="p-4 font-medium text-coffee-800 dark:text-coffee-300">{po.supplier?.name || 'Unknown'}</td>
                    <td className="p-4 font-semibold">{formatCurrency(po.totalAmount)}</td>
                    <td className="p-4 text-coffee-500">{formatDate(po.createdAt)}</td>
                    <td className="p-4 text-coffee-500">{po.createdBy?.name || 'System'}</td>
                    <td className="p-4">
                      {po.status === 'validated' ? (
                        <span className="badge badge-success text-[10px] py-1 px-2.5 font-bold">✅ Completed</span>
                      ) : po.status === 'cancelled' ? (
                        <span className="badge badge-danger text-[10px] py-1 px-2.5 font-bold">❌ Cancelled</span>
                      ) : (
                        <span className="badge badge-warning text-[10px] py-1 px-2.5 font-bold">⏳ Pending Intake</span>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => setDetailsModal(po)}
                        className="btn-secondary py-1 px-3 text-[11px]"
                      >
                        📂 Details & Action
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create Modal */}
      <AnimatePresence>
        {createModal && (
          <div className="modal-overlay">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="modal-content max-w-2xl w-full">
              <h3 className="text-base font-bold text-coffee-950 dark:text-coffee-50 mb-3">📋 Create Purchase Order</h3>
              <form onSubmit={handlePOModelSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Wholesale Supplier *</label>
                    <select value={supplier} onChange={e => setSupplier(e.target.value)} className="input" required>
                      <option value="">Select Supplier</option>
                      {suppliers.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="label">Procurement Notes</label>
                    <input type="text" value={notes} onChange={e => setNotes(e.target.value)} placeholder="e.g. Urgent stock replenishment" className="input" />
                  </div>
                </div>

                <div className="border-t border-coffee-100 dark:border-coffee-800 pt-4 mt-4">
                  <h4 className="font-semibold text-xs text-coffee-800 dark:text-coffee-200 mb-3">➕ Add Ingredient Item</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end bg-coffee-50/55 dark:bg-coffee-900/30 p-3 rounded-xl border border-coffee-100/50 dark:border-coffee-800/40">
                    <div className="sm:col-span-2">
                      <label className="label">Ingredient *</label>
                      <select value={selectedIngredient} onChange={e => setSelectedIngredient(e.target.value)} className="input">
                        <option value="">Select Ingredient</option>
                        {ingredients.map(i => <option key={i._id} value={i._id}>{i.name} ({i.unit})</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="label">Quantity *</label>
                      <input type="number" value={qty} onChange={e => setQty(e.target.value)} placeholder="Qty" className="input" />
                    </div>
                    <div>
                      <label className="label">Cost Per Unit (TND) *</label>
                      <input type="number" step="0.001" value={cost} onChange={e => setCost(e.target.value)} placeholder="Cost" className="input" />
                    </div>
                  </div>
                  <button type="button" onClick={handleAddItem} className="btn-secondary w-full py-2 mt-3 text-xs font-semibold">
                    ➕ Add Item to PO
                  </button>
                </div>

                {/* Items Cart */}
                {items.length > 0 && (
                  <div className="border border-coffee-100 dark:border-coffee-800 rounded-xl overflow-hidden mt-4">
                    <table className="table-auto w-full text-left text-xs">
                      <thead className="bg-coffee-50 dark:bg-coffee-800/40 font-bold text-coffee-600 dark:text-coffee-400">
                        <tr>
                          <th className="p-3">Ingredient</th>
                          <th className="p-3">Procure Qty</th>
                          <th className="p-3">Unit Cost</th>
                          <th className="p-3">Total Cost</th>
                          <th className="p-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-coffee-50 dark:divide-coffee-800/60">
                        {items.map((item, idx) => (
                          <tr key={idx}>
                            <td className="p-3 font-semibold text-coffee-950 dark:text-coffee-50">{item.name}</td>
                            <td className="p-3">{item.quantity} {item.unit}</td>
                            <td className="p-3">{formatCurrency(item.costPerUnit)}</td>
                            <td className="p-3 font-bold">{formatCurrency(item.total)}</td>
                            <td className="p-3 text-right">
                              <button type="button" onClick={() => handleRemoveItem(idx)} className="text-red-500 hover:text-red-700 text-xs">
                                🗑️ Remove
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div className="p-3 bg-coffee-50/50 dark:bg-coffee-800/25 border-t border-coffee-100 dark:border-coffee-800 flex justify-between items-center">
                      <span className="font-bold text-coffee-800 dark:text-coffee-200">PO Grand Total:</span>
                      <span className="text-sm font-bold text-coffee-950 dark:text-coffee-55">{formatCurrency(totalAmount)}</span>
                    </div>
                  </div>
                )}

                <div className="flex gap-3 justify-end pt-4 border-t border-coffee-100 dark:border-coffee-800">
                  <button type="button" onClick={closeCreate} className="btn-secondary py-2 px-4 text-xs font-semibold">Cancel</button>
                  <button type="submit" disabled={saveMutation.isPending} className="btn-primary py-2 px-4 text-xs font-semibold">
                    {saveMutation.isPending ? 'Submitting...' : 'Submit Draft PO'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Details & Actions Modal */}
      <AnimatePresence>
        {detailsModal && (
          <div className="modal-overlay">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="modal-content max-w-lg w-full">
              <div className="flex justify-between items-center mb-4 border-b border-coffee-100 dark:border-coffee-800 pb-3">
                <div>
                  <h3 className="text-base font-bold text-coffee-950 dark:text-coffee-50">PO Details: {detailsModal.poNumber}</h3>
                  <p className="text-[10px] text-coffee-500 font-medium">Created on {formatDate(detailsModal.createdAt)} by {detailsModal.createdBy?.name || 'System'}</p>
                </div>
                {detailsModal.status === 'validated' ? (
                  <span className="badge badge-success text-[10px]">Validated Intake</span>
                ) : detailsModal.status === 'cancelled' ? (
                  <span className="badge badge-danger text-[10px]">Cancelled PO</span>
                ) : (
                  <span className="badge badge-warning text-[10px]">Pending Actions</span>
                )}
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-coffee-400 font-bold block">SUPPLIER</span>
                    <span className="font-semibold text-coffee-900 dark:text-coffee-200">{detailsModal.supplier?.name}</span>
                  </div>
                  <div>
                    <span className="text-coffee-400 font-bold block">PO TOTAL AMOUNT</span>
                    <span className="font-bold text-coffee-950 dark:text-coffee-100">{formatCurrency(detailsModal.totalAmount)}</span>
                  </div>
                </div>

                {detailsModal.notes && (
                  <div className="p-3 bg-coffee-50 dark:bg-coffee-900/30 border border-coffee-100/50 dark:border-coffee-800/40 rounded-xl text-xs">
                    <span className="font-bold text-coffee-500 block mb-1">NOTES:</span>
                    <span className="text-coffee-800 dark:text-coffee-300">{detailsModal.notes}</span>
                  </div>
                )}

                <div className="border border-coffee-100 dark:border-coffee-800 rounded-xl overflow-hidden">
                  <table className="table-auto w-full text-left text-xs">
                    <thead className="bg-coffee-50 dark:bg-coffee-800/40 font-bold text-coffee-500 dark:text-coffee-450">
                      <tr>
                        <th className="p-3">Ingredient</th>
                        <th className="p-3">Procure Qty</th>
                        <th className="p-3">Cost Per Unit</th>
                        <th className="p-3 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-coffee-50 dark:divide-coffee-800/60">
                      {detailsModal.items.map((item, idx) => (
                        <tr key={idx}>
                          <td className="p-3 font-semibold text-coffee-950 dark:text-coffee-50">{item.name}</td>
                          <td className="p-3 font-medium">{item.quantity}</td>
                          <td className="p-3">{formatCurrency(item.costPerUnit)}</td>
                          <td className="p-3 text-right font-bold">{formatCurrency(item.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Verification alerts */}
                {detailsModal.status === 'pending' && (
                  <div className="p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900 rounded-2xl text-xs text-amber-800 dark:text-amber-300 flex items-start gap-3">
                    <span className="text-lg">ℹ️</span>
                    <div>
                      <strong className="font-bold block mb-1">Stock Intake Verification</strong>
                      Validating this purchase order will immediately add the items to the inventory weight/volume counters, create stock movement entries, and increase the supplier's outstanding balance accounts.
                    </div>
                  </div>
                )}

                <div className="flex gap-2 justify-end pt-4 border-t border-coffee-100 dark:border-coffee-800">
                  <button type="button" onClick={() => setDetailsModal(null)} className="btn-secondary py-2 px-4 text-xs font-semibold">Close</button>
                  {detailsModal.status === 'pending' && (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm('Cancel this pending purchase order?')) {
                            cancelMutation.mutate(detailsModal._id)
                          }
                        }}
                        className="btn-danger py-2 px-4 text-xs bg-red-50 hover:bg-red-100 text-red-600 border-none font-semibold"
                      >
                        🚫 Cancel PO
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm('Validate raw stock intake? This increases inventory and registers debt.')) {
                            validateMutation.mutate(detailsModal._id)
                          }
                        }}
                        className="btn-success py-2 px-4 text-xs font-bold text-white"
                      >
                        ✅ Validate Intake
                      </button>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
