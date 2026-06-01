import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getEmployees, createEmployee, updateEmployee, addAttendance, getBranches } from '../../api'
import { formatCurrency, formatDate } from '../../utils'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'

export default function Employees() {
  const queryClient = useQueryClient()
  const [selectedBranch, setSelectedBranch] = useState('All')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingEmployee, setEditingEmployee] = useState(null)

  // Form states
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [role, setRole] = useState('barista')
  const [salary, setSalary] = useState('')
  const [salaryType, setSalaryType] = useState('monthly')
  const [branch, setBranch] = useState('')
  const [address, setAddress] = useState('')
  const [notes, setNotes] = useState('')

  // Attendance Form
  const [showAttendanceModal, setShowAttendanceModal] = useState(false)
  const [activeEmployee, setActiveEmployee] = useState(null)
  const [attStatus, setAttStatus] = useState('present')
  const [checkIn, setCheckIn] = useState('08:00')
  const [checkOut, setCheckOut] = useState('17:00')

  // Queries
  const { data: employeesRes, isLoading } = useQuery({
    queryKey: ['employees', selectedBranch],
    queryFn: () => getEmployees({ branch: selectedBranch === 'All' ? undefined : selectedBranch })
  })

  const { data: branchesRes } = useQuery({
    queryKey: ['branches'],
    queryFn: getBranches
  })

  // Mutations
  const createMutation = useMutation({
    mutationFn: createEmployee,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] })
      toast.success('Employee profile created!')
      closeCreateModal()
    }
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => updateEmployee(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] })
      toast.success('Employee profile updated!')
      closeCreateModal()
    }
  })

  const attendanceMutation = useMutation({
    mutationFn: ({ id, data }) => addAttendance(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] })
      toast.success('Attendance recorded!')
      closeAttendanceModal()
    }
  })

  const employees = employeesRes?.data || []
  const branches = branchesRes?.data || []

  const openCreateModal = () => {
    setEditingEmployee(null)
    setName('')
    setEmail('')
    setPhone('')
    setRole('barista')
    setSalary('')
    setSalaryType('monthly')
    setBranch(branches[0]?._id || '')
    setAddress('')
    setNotes('')
    setShowCreateModal(true)
  }

  const openEditModal = (emp) => {
    setEditingEmployee(emp)
    setName(emp.name)
    setEmail(emp.email)
    setPhone(emp.phone)
    setRole(emp.role)
    setSalary(emp.salary)
    setSalaryType(emp.salaryType)
    setBranch(emp.branch?._id || emp.branch || '')
    setAddress(emp.address || '')
    setNotes(emp.notes || '')
    setShowCreateModal(true)
  }

  const closeCreateModal = () => {
    setShowCreateModal(false)
    setEditingEmployee(null)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!name || !email || !salary) return toast.error('Name, email, and salary required')
    const payload = { name, email, phone, role, salary: Number(salary), salaryType, branch, address, notes }

    if (editingEmployee) {
      updateMutation.mutate({ id: editingEmployee._id, data: payload })
    } else {
      createMutation.mutate(payload)
    }
  }

  const openAttendanceModal = (emp) => {
    setActiveEmployee(emp)
    setAttStatus('present')
    setCheckIn('08:00')
    setCheckOut('17:00')
    setShowAttendanceModal(true)
  }

  const closeAttendanceModal = () => {
    setShowAttendanceModal(false)
    setActiveEmployee(null)
  }

  const handleAttendanceSubmit = (e) => {
    e.preventDefault()
    attendanceMutation.mutate({
      id: activeEmployee._id,
      data: { date: new Date(), status: attStatus, checkIn, checkOut }
    })
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <select
          value={selectedBranch}
          onChange={e => setSelectedBranch(e.target.value)}
          className="input sm:max-w-xs"
        >
          <option value="All">All Branches</option>
          {branches.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
        </select>
        <button onClick={openCreateModal} className="btn-primary py-2.5">
          ➕ New Employee Profile
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="text-3xl animate-pulse-soft">👤</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {employees.length === 0 ? (
            <div className="col-span-full card py-12 text-center text-coffee-400">
              No employees registered
            </div>
          ) : employees.map(emp => (
            <motion.div layout key={emp._id} className="card flex flex-col justify-between h-56">
              <div>
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h4 className="font-bold text-coffee-950 dark:text-coffee-50">{emp.name}</h4>
                    <p className="text-xs text-coffee-500 capitalize">{emp.role}</p>
                  </div>
                  <span className="badge badge-coffee">
                    {emp.branch?.name || '-'}
                  </span>
                </div>
                <div className="space-y-1 text-xs py-2 border-t border-b border-coffee-50 dark:border-coffee-800">
                  <p className="text-coffee-700 dark:text-coffee-300">
                    <strong className="text-coffee-400">Salary:</strong> {formatCurrency(emp.salary)} / {emp.salaryType}
                  </p>
                  <p className="text-coffee-700 dark:text-coffee-300">
                    <strong className="text-coffee-400">Email:</strong> {emp.email}
                  </p>
                  <p className="text-coffee-700 dark:text-coffee-300">
                    <strong className="text-coffee-400">Hired:</strong> {formatDate(emp.hireDate)}
                  </p>
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-3">
                <button onClick={() => openAttendanceModal(emp)} className="btn-secondary px-3 py-1.5 text-xs">
                  ⏱️ Clock In
                </button>
                <button onClick={() => openEditModal(emp)} className="btn-primary px-3 py-1.5 text-xs">
                  Edit Profile
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Profile Form Modal */}
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
                {editingEmployee ? '📝 Edit Profile' : '➕ Create Employee Profile'}
              </h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Full Name</label>
                    <input type="text" value={name} onChange={e => setName(e.target.value)} className="input" placeholder="Lina Barista" />
                  </div>
                  <div>
                    <label className="label">Email Address</label>
                    <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="input" placeholder="lina@coffeemaster.dz" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Phone</label>
                    <input type="text" value={phone} onChange={e => setPhone(e.target.value)} className="input" placeholder="0550000004" />
                  </div>
                  <div>
                    <label className="label">Job Role</label>
                    <select value={role} onChange={e => setRole(e.target.value)} className="input">
                      {['barista', 'cashier', 'manager', 'cleaner', 'supervisor', 'other'].map(r => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Salary (DZD)</label>
                    <input type="number" value={salary} onChange={e => setSalary(e.target.value)} className="input" placeholder="45000" />
                  </div>
                  <div>
                    <label className="label">Salary Type</label>
                    <select value={salaryType} onChange={e => setSalaryType(e.target.value)} className="input">
                      <option value="monthly">Monthly</option>
                      <option value="daily">Daily</option>
                      <option value="hourly">Hourly</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Branch</label>
                    <select value={branch} onChange={e => setBranch(e.target.value)} className="input">
                      {branches.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="label">Home Address</label>
                    <input type="text" value={address} onChange={e => setAddress(e.target.value)} className="input" placeholder="e.g. Algiers" />
                  </div>
                </div>

                <div>
                  <label className="label">Notes / Preferences</label>
                  <input type="text" value={notes} onChange={e => setNotes(e.target.value)} className="input" placeholder="Prefers morning shifts..." />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button type="button" onClick={closeCreateModal} className="btn-secondary">Cancel</button>
                  <button type="submit" className="btn-primary">Save Profile</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Attendance Modal */}
      <AnimatePresence>
        {showAttendanceModal && activeEmployee && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={closeAttendanceModal} />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-coffee-900 rounded-3xl p-6 w-full max-w-md relative z-10 shadow-2xl"
            >
              <h3 className="font-bold text-lg mb-4 text-coffee-950 dark:text-coffee-100">
                ⏱️ Record Attendance: {activeEmployee.name}
              </h3>
              <form onSubmit={handleAttendanceSubmit} className="space-y-4">
                <div>
                  <label className="label">Shift Status</label>
                  <div className="grid grid-cols-4 gap-2">
                    {['present', 'absent', 'late', 'halfday'].map(st => (
                      <button
                        type="button"
                        key={st}
                        onClick={() => setAttStatus(st)}
                        className={`py-2 rounded-xl text-xs font-semibold capitalize border ${
                          attStatus === st
                            ? 'bg-coffee-800 text-white border-transparent'
                            : 'border-coffee-200 dark:border-coffee-700 hover:bg-coffee-50'
                        }`}
                      >
                        {st}
                      </button>
                    ))}
                  </div>
                </div>

                {attStatus !== 'absent' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="label">Check In Time</label>
                      <input type="text" value={checkIn} onChange={e => setCheckIn(e.target.value)} className="input" placeholder="e.g. 08:00" />
                    </div>
                    <div>
                      <label className="label">Check Out Time</label>
                      <input type="text" value={checkOut} onChange={e => setCheckOut(e.target.value)} className="input" placeholder="e.g. 17:00" />
                    </div>
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-2">
                  <button type="button" onClick={closeAttendanceModal} className="btn-secondary">Cancel</button>
                  <button type="submit" className="btn-primary">Clock In</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
