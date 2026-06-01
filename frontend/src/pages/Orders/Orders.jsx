import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getOrders, cancelOrder, getBranches, downloadOrderReceipt, updateOrderStatus } from '../../api'
import { formatCurrency, formatDateTime, downloadBlob } from '../../utils'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'

const STATUS_COLORS = {
  pending:   'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800/35',
  preparing: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800/35',
  ready:     'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/35',
  completed: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300 border border-green-200 dark:border-green-800/35',
  cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300 border border-red-200 dark:border-red-800/35',
  refunded:  'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300 border border-gray-200 dark:border-gray-700/35',
}

export default function Orders() {
  const queryClient = useQueryClient()
  const [selectedOrder, setSelectedOrder] = useState(null)
  
  // Filtering states
  const [branch, setBranch] = useState('')
  const [status, setStatus] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  // Queries
  const { data: ordersRes, isLoading } = useQuery({
    queryKey: ['orders', branch, status, from, to],
    queryFn: () => getOrders({ branch, status, from, to, limit: 100 })
  })

  const { data: branchesRes } = useQuery({
    queryKey: ['branches'],
    queryFn: getBranches
  })

  // Mutations
  const cancelMutation = useMutation({
    mutationFn: cancelOrder,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      toast.success('Order cancelled successfully!')
      setSelectedOrder(null)
    }
  })

  const completeMutation = useMutation({
    mutationFn: (id) => updateOrderStatus(id, 'completed'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      toast.success('Order marked as completed!')
      setSelectedOrder(null)
    }
  })

  const orders = ordersRes?.data?.orders || []
  const branches = branchesRes?.data || []

  const handleCancelOrder = (id) => {
    if (window.confirm('Are you sure you want to cancel this order?')) {
      cancelMutation.mutate(id)
    }
  }

  const handleCompleteOrder = (id) => {
    completeMutation.mutate(id)
  }

  const handleDownloadReceipt = async (e, orderId) => {
    e.stopPropagation()
    try {
      const res = await downloadOrderReceipt(orderId)
      downloadBlob(res.data, `receipt-${orderId}.pdf`)
      toast.success('Receipt downloaded! 📄')
    } catch {
      toast.error('Could not download receipt')
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Filtering area */}
      <div className="card grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 p-4 border border-coffee-100">
        <div>
          <label className="label text-[10px]">Filter by Branch</label>
          <select value={branch} onChange={e => setBranch(e.target.value)} className="input text-xs py-1.5">
            <option value="">All Branches</option>
            {branches.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
          </select>
        </div>
        <div>
          <label className="label text-[10px]">Filter by Status</label>
          <select value={status} onChange={e => setStatus(e.target.value)} className="input text-xs py-1.5">
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="preparing">Preparing</option>
            <option value="ready">Ready</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
        <div>
          <label className="label text-[10px]">Date From</label>
          <input type="date" value={from} onChange={e => setFrom(e.target.value)} className="input text-xs py-1.5" />
        </div>
        <div>
          <label className="label text-[10px]">Date To</label>
          <input type="date" value={to} onChange={e => setTo(e.target.value)} className="input text-xs py-1.5" />
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="text-3xl animate-pulse-soft">📋</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Orders list */}
          <div className="lg:col-span-8 table-container bg-white dark:bg-coffee-900 shadow-coffee h-[calc(100vh-18rem)] overflow-y-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Order #</th>
                  <th>Date</th>
                  <th>Branch</th>
                  <th>Total</th>
                  <th>Status</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {orders.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="text-center py-8 text-coffee-400">No orders found</td>
                  </tr>
                ) : orders.map(o => (
                  <tr key={o._id} className="cursor-pointer" onClick={() => setSelectedOrder(o)}>
                    <td className="font-mono font-semibold text-coffee-950 dark:text-coffee-100">{o.orderNumber}</td>
                    <td>{formatDateTime(o.createdAt)}</td>
                    <td>{o.branch?.name || '-'}</td>
                    <td className="font-bold">{formatCurrency(o.total)}</td>
                    <td>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${STATUS_COLORS[o.status] || 'bg-gray-100 text-gray-800'}`}>
                        {o.status}
                      </span>
                    </td>
                    <td className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={(e) => handleDownloadReceipt(e, o._id)}
                          className="btn-ghost text-coffee-600 dark:text-coffee-300 hover:bg-coffee-50 dark:hover:bg-coffee-800 px-2 py-1.5 text-xs"
                          title="Download PDF Receipt"
                        >
                          📄 PDF
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); setSelectedOrder(o); }} className="btn-secondary px-3 py-1.5 text-xs">
                          View
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Sidebar details */}
          <div className="lg:col-span-4 card h-[calc(100vh-18rem)] flex flex-col p-4">
            {selectedOrder ? (
              <div className="flex flex-col h-full space-y-4">
                <div className="border-b border-coffee-100 dark:border-coffee-800 pb-3 flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-sm text-coffee-950 dark:text-coffee-50">{selectedOrder.orderNumber}</h3>
                    <p className="text-[10px] text-coffee-500">{formatDateTime(selectedOrder.createdAt)}</p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    {['pending', 'preparing', 'ready', 'completed'].includes(selectedOrder.status) && (
                      <button
                        onClick={() => handleCancelOrder(selectedOrder._id)}
                        disabled={cancelMutation.isPending}
                        className="btn-ghost text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 text-xs py-1 px-2.5 font-semibold rounded-lg"
                      >
                        Cancel
                      </button>
                    )}
                    {['pending', 'preparing', 'ready'].includes(selectedOrder.status) && (
                      <button
                        onClick={() => handleCompleteOrder(selectedOrder._id)}
                        disabled={completeMutation.isPending}
                        className="btn-primary text-xs py-1 px-3 font-semibold rounded-lg"
                      >
                        ✓ Complete
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex-grow overflow-y-auto space-y-2 pr-1 text-xs">
                  <p className="font-semibold text-coffee-700 dark:text-coffee-300">Items Ordered</p>
                  {selectedOrder.items?.map((item, i) => (
                    <div key={i} className="flex justify-between py-1 border-b border-coffee-50 dark:border-coffee-800/40">
                      <div>
                        <p className="font-semibold">{item.name}</p>
                        <p className="text-[10px] text-coffee-500">Qty: {item.quantity} x {formatCurrency(item.price)}</p>
                      </div>
                      <span className="font-bold">{formatCurrency(item.price * item.quantity)}</span>
                    </div>
                  ))}

                  <div className="pt-3 border-t border-coffee-100 dark:border-coffee-800 space-y-1.5 text-right">
                    <div className="flex justify-between">
                      <span className="text-coffee-500">Subtotal</span>
                      <span>{formatCurrency(selectedOrder.subtotal)}</span>
                    </div>
                    {selectedOrder.discountAmount > 0 && (
                      <div className="flex justify-between">
                        <span className="text-coffee-500">Discount ({selectedOrder.discountPercent}%)</span>
                        <span>-{formatCurrency(selectedOrder.discountAmount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-bold text-coffee-950 dark:text-coffee-50 pt-1 border-t border-dashed border-coffee-200 dark:border-coffee-800">
                      <span>Total</span>
                      <span>{formatCurrency(selectedOrder.total)}</span>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-coffee-100 dark:border-coffee-800 space-y-1">
                    <p className="text-[10px] text-coffee-500"><strong className="text-coffee-700 dark:text-coffee-300">Payment:</strong> {selectedOrder.paymentMethod.toUpperCase()}</p>
                    <p className="text-[10px] text-coffee-500"><strong className="text-coffee-700 dark:text-coffee-300">Cashier:</strong> {selectedOrder.cashier?.name}</p>
                    {selectedOrder.customer && (
                      <p className="text-[10px] text-coffee-500"><strong className="text-coffee-700 dark:text-coffee-300">Customer:</strong> {selectedOrder.customer?.name} ({selectedOrder.customer?.phone})</p>
                    )}
                    {selectedOrder.tableNumber && (
                      <p className="text-[10px] text-coffee-500"><strong className="text-coffee-700 dark:text-coffee-300">Table:</strong> Table {selectedOrder.tableNumber}</p>
                    )}
                    {selectedOrder.notes && (
                      <p className="text-[10px] text-coffee-500"><strong className="text-coffee-700 dark:text-coffee-300">Notes:</strong> {selectedOrder.notes}</p>
                    )}
                  </div>

                  <button
                    onClick={(e) => handleDownloadReceipt(e, selectedOrder._id)}
                    className="w-full mt-3 py-2.5 rounded-xl bg-coffee-800 hover:bg-coffee-900 text-white text-xs font-semibold flex items-center justify-center gap-2 transition-all"
                  >
                    📄 Download PDF Receipt
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex-grow flex flex-col items-center justify-center text-coffee-400 py-12">
                <span className="text-4xl">📋</span>
                <p className="mt-2 text-xs">Select an order on the left to view full receipt detail</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
