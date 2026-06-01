import axios from 'axios'
import { useAuthStore } from '../store'
import toast from 'react-hot-toast'

const api = axios.create({
  baseURL: '/api',
  timeout: 15000,
})

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const msg = err.response?.data?.error || 'Something went wrong'
    if (err.response?.status === 401) {
      useAuthStore.getState().logout()
      window.location.href = '/login'
    } else if (err.response?.status !== 404) {
      toast.error(msg)
    }
    return Promise.reject(err)
  }
)

// Auth
export const login = (data) => api.post('/auth/login', data)
export const getMe = () => api.get('/auth/me')
export const changePassword = (data) => api.put('/auth/change-password', data)

// Branches
export const getBranches = () => api.get('/branches')
export const getBranch = (id) => api.get(`/branches/${id}`)
export const createBranch = (data) => api.post('/branches', data)
export const updateBranch = (id, data) => api.put(`/branches/${id}`, data)
export const deleteBranch = (id) => api.delete(`/branches/${id}`)

// Products
export const getProducts = (params) => api.get('/products', { params })
export const createProduct = (data) => api.post('/products', data)
export const updateProduct = (id, data) => api.put(`/products/${id}`, data)
export const deleteProduct = (id) => api.delete(`/products/${id}`)

// Ingredients
export const getIngredients = (params) => api.get('/ingredients', { params })
export const createIngredient = (data) => api.post('/ingredients', data)
export const updateIngredient = (id, data) => api.put(`/ingredients/${id}`, data)
export const adjustStock = (id, data) => api.patch(`/ingredients/${id}/adjust`, data)
export const deleteIngredient = (id) => api.delete(`/ingredients/${id}`)
export const getLowStock = (params) => api.get('/ingredients/low-stock', { params })
export const getExpiring = (params) => api.get('/ingredients/expiring', { params })

// Recipes
export const getRecipes = () => api.get('/recipes')
export const getRecipeByProduct = (productId) => api.get(`/recipes/product/${productId}`)
export const saveRecipe = (data) => api.post('/recipes', data)
export const deleteRecipe = (id) => api.delete(`/recipes/${id}`)

// Orders
export const createOrder = (data) => api.post('/orders', data)
export const getOrders = (params) => api.get('/orders', { params })
export const getOrder = (id) => api.get(`/orders/${id}`)
export const updateOrderStatus = (id, status) => api.patch(`/orders/${id}/status`, { status })
export const cancelOrder = (id) => api.patch(`/orders/${id}/cancel`)

// Customers
export const getCustomers = (params) => api.get('/customers', { params })
export const createCustomer = (data) => api.post('/customers', data)
export const getCustomer = (id) => api.get(`/customers/${id}`)
export const updateCustomer = (id, data) => api.put(`/customers/${id}`, data)
export const adjustPoints = (id, data) => api.patch(`/customers/${id}/points`, data)

// Employees
export const getEmployees = (params) => api.get('/employees', { params })
export const createEmployee = (data) => api.post('/employees', data)
export const getEmployee = (id) => api.get(`/employees/${id}`)
export const updateEmployee = (id, data) => api.put(`/employees/${id}`, data)
export const addAttendance = (id, data) => api.post(`/employees/${id}/attendance`, data)

// Expenses
export const getExpenses = (params) => api.get('/expenses', { params })
export const createExpense = (data) => api.post('/expenses', data)
export const updateExpense = (id, data) => api.put(`/expenses/${id}`, data)
export const deleteExpense = (id) => api.delete(`/expenses/${id}`)
export const getExpensesByCategory = (params) => api.get('/expenses/by-category', { params })

// Users
export const getUsers = (params) => api.get('/users', { params })
export const createUser = (data) => api.post('/users', data)
export const updateUser = (id, data) => api.put(`/users/${id}`, data)
export const deleteUser = (id) => api.delete(`/users/${id}`)

// Profile
export const updateProfile = (data) => api.put('/auth/profile', data)

// Analytics
export const getDashboard = (params) => api.get('/analytics/dashboard', { params })
export const getRevenueChart = (params) => api.get('/analytics/revenue-chart', { params })
export const getPeakHours = (params) => api.get('/analytics/peak-hours', { params })
export const getForecast = (params) => api.get('/analytics/forecast', { params })
export const getProductProfitability = (params) => api.get('/analytics/product-profitability', { params })

// Reports
export const downloadSalesPDF = (params) => api.get('/reports/sales/pdf', { params, responseType: 'blob' })
export const downloadSalesExcel = (params) => api.get('/reports/sales/excel', { params, responseType: 'blob' })
export const downloadExpensesExcel = (params) => api.get('/reports/expenses/excel', { params, responseType: 'blob' })

// Notifications
export const getNotifications = (params) => api.get('/notifications', { params })
export const markNotificationRead = (id) => api.patch(`/notifications/${id}/read`)
export const markAllRead = (params) => api.patch('/notifications/read-all', null, { params })

// Tables
export const getTables = (params) => api.get('/tables', { params })
export const createTable = (data) => api.post('/tables', data)
export const updateTable = (id, data) => api.put(`/tables/${id}`, data)
export const deleteTable = (id) => api.delete(`/tables/${id}`)
export const seatTable = (id, data) => api.post(`/tables/${id}/seat`, data || {})
export const vacateTable = (id) => api.post(`/tables/${id}/vacate`)
export const readyTable = (id) => api.post(`/tables/${id}/ready`)
export const reserveTable = (id, data) => api.post(`/tables/${id}/reserve`, data)

// Order PDF Receipt
export const downloadOrderReceipt = (id) => api.get(`/orders/${id}/receipt`, { responseType: 'blob' })

// Suppliers
export const getSuppliers = (params) => api.get('/suppliers', { params })
export const createSupplier = (data) => api.post('/suppliers', data)
export const updateSupplier = (id, data) => api.put(`/suppliers/${id}`, data)
export const deleteSupplier = (id) => api.delete(`/suppliers/${id}`)
export const paySupplierDebt = (id, amount) => api.post(`/suppliers/${id}/pay-debt`, { amount })

// Purchase Orders
export const getPurchaseOrders = (params) => api.get('/purchase-orders', { params })
export const createPurchaseOrder = (data) => api.post('/purchase-orders', data)
export const validatePurchaseOrder = (id) => api.post(`/purchase-orders/${id}/validate`)
export const cancelPurchaseOrder = (id) => api.delete(`/purchase-orders/${id}`)

// Shifts / Cash Drawer
export const getActiveShift = () => api.get('/shifts/active')
export const openShift = (openingCash) => api.post('/shifts/open', { openingCash })
export const closeShift = (data) => api.post('/shifts/close', data)
export const getShiftHistory = (params) => api.get('/shifts/history', { params })

export default api
