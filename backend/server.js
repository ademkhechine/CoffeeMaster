const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config();

const connectDB = require('./config/db');
const errorHandler = require('./middleware/errorHandler');

// Routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const branchRoutes = require('./routes/branches');
const productRoutes = require('./routes/products');
const ingredientRoutes = require('./routes/ingredients');
const recipeRoutes = require('./routes/recipes');
const orderRoutes = require('./routes/orders');
const customerRoutes = require('./routes/customers');
const employeeRoutes = require('./routes/employees');
const expenseRoutes = require('./routes/expenses');
const analyticsRoutes = require('./routes/analytics');
const reportRoutes = require('./routes/reports');
const notificationRoutes = require('./routes/notifications');
const tableRoutes = require('./routes/tables');
const reservationRoutes = require('./routes/reservations');
const supplierRoutes = require('./routes/suppliers');
const purchaseOrderRoutes = require('./routes/purchase-orders');
const shiftRoutes = require('./routes/shifts');

const app = express();
const httpServer = http.createServer(app);

// Socket.io — real-time KDS & order updates
const io = new Server(httpServer, {
  cors: { origin: process.env.FRONTEND_URL || 'http://localhost:3000', methods: ['GET', 'POST'] }
});
io.on('connection', (socket) => {
  socket.on('join-kitchen', () => socket.join('kitchen'));
  socket.on('join-cashier', () => socket.join('cashier'));
});
// Attach io to app so routes can emit
app.set('io', io);

// Connect Database
connectDB();

// Security
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: { error: 'Too many requests, please try again later.' }
});
app.use('/api/', limiter);

// CORS
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body Parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Static files (product images)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/branches', branchRoutes);
app.use('/api/products', productRoutes);
app.use('/api/ingredients', ingredientRoutes);
app.use('/api/recipes', recipeRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/tables', tableRoutes);
app.use('/api/reservations', reservationRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/purchase-orders', purchaseOrderRoutes);
app.use('/api/shifts', shiftRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'CoffeeMaster API is running', timestamp: new Date() });
});

// Error Handler
app.use(errorHandler);

// Start cron jobs
require('./cron/scheduler');

const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
  console.log(`☕ CoffeeMaster API running on http://localhost:${PORT}`);
});
