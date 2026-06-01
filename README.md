# ☕ CoffeeMaster — Coffee Shop Management System

A professional, full-stack coffee shop management platform built with **React + Vite**, **Node.js + Express**, and **MongoDB**.

---

## 🚀 Features

| Module | Description |
|--------|-------------|
| 🔐 **Auth & RBAC** | JWT authentication with Admin / Manager / Cashier / Barista roles |
| 📊 **Dashboard** | Live KPIs, revenue charts, low-stock alerts, expiry warnings |
| 🛒 **POS** | Fast order creation, cart management, discounts, receipt printing |
| 📦 **Products** | Full CRUD with image uploads and category filtering |
| 🧪 **Inventory** | Stock tracking, expiry dates, low-stock alerts with auto-notifications |
| 📋 **Recipes** | Map ingredients to products for automatic stock deduction on sale |
| 🧾 **Orders** | Order history, status tracking, cancellation |
| 👥 **Customers** | Loyalty tiers (Bronze/Silver/Gold), points management |
| 👷 **Employees** | Schedules, attendance log, salary management |
| 💸 **Expenses** | Categorized expense tracking (Rent, Utilities, Supplies…) |
| 📈 **Analytics** | Revenue charts, peak-hour heatmaps, demand forecasting |
| 📄 **Reports** | PDF and Excel export for sales and expenses |
| 🏢 **Branches** | Multi-location management |
| ⚙️ **Settings** | Profile, password, theme, and system info |

---

## 🛠️ Tech Stack

**Frontend**
- React 18 + Vite
- Tailwind CSS (coffee design system)
- Zustand (state management)
- TanStack Query (data fetching & caching)
- Chart.js + react-chartjs-2
- Framer Motion (animations)
- React Router DOM v6

**Backend**
- Node.js + Express
- MongoDB + Mongoose
- JWT authentication
- Multer (file uploads)
- PDFKit + ExcelJS (report generation)
- node-cron (scheduled jobs)

---

## ⚡ Quick Start

### Prerequisites
- [Node.js](https://nodejs.org/) v18+ 
- [MongoDB](https://www.mongodb.com/try/download/community) running locally on port 27017

---

### 1. Backend Setup

```bash
cd coffeemaster/backend
npm install
```

**Configure environment** (already set in `.env`):
```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/coffeemaster
JWT_SECRET=coffeemaster_super_secret_jwt_key_2024
JWT_EXPIRES_IN=7d
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
```

**Seed the database with sample data:**
```bash
node config/seed.js
```

**Start the backend server:**
```bash
npm run dev
# Server runs on http://localhost:5000
```

---

### 2. Frontend Setup

```bash
cd coffeemaster/frontend
npm install
npm run dev
# App runs on http://localhost:3000
```

---

## 🔑 Default Login Credentials

After seeding, you can log in with:

| Role | Email | Password |
|------|-------|----------|
| **Admin** | admin@coffeemaster.dz | password123 |
| **Manager** | manager@coffeemaster.dz | password123 |
| **Cashier** | cashier@coffeemaster.dz | password123 |
| **Barista** | barista@coffeemaster.dz | password123 |

---

## 📁 Project Structure

```
coffeemaster/
├── backend/
│   ├── config/
│   │   ├── db.js              # MongoDB connection with retry
│   │   └── seed.js            # Sample data seeder
│   ├── middleware/
│   │   ├── auth.js            # JWT verification
│   │   ├── roles.js           # RBAC authorization
│   │   ├── upload.js          # Multer file handler
│   │   └── errorHandler.js    # Global error handler
│   ├── models/                # 10 Mongoose schemas
│   │   ├── User.js, Branch.js, Product.js, Ingredient.js
│   │   ├── Recipe.js, Order.js, Customer.js, Employee.js
│   │   ├── Expense.js, Notification.js
│   ├── routes/                # 13 Express routers
│   │   ├── auth.js, users.js, branches.js, products.js
│   │   ├── ingredients.js, recipes.js, orders.js, customers.js
│   │   ├── employees.js, expenses.js, analytics.js
│   │   ├── reports.js, notifications.js
│   ├── services/
│   │   ├── stockService.js    # Auto-deduct stock on order
│   │   └── notificationService.js  # Low-stock & expiry alerts
│   ├── cron/
│   │   └── scheduler.js       # Daily 7AM stock scan
│   ├── uploads/               # Product images
│   ├── .env
│   ├── package.json
│   └── server.js
│
└── frontend/
    ├── src/
    │   ├── api/index.js        # Axios client + all API calls
    │   ├── store/index.js      # Zustand stores (auth, cart, theme)
    │   ├── utils/index.js      # Formatters, constants, helpers
    │   ├── components/
    │   │   └── layout/         # Sidebar, Topbar
    │   ├── pages/
    │   │   ├── Auth/Login.jsx
    │   │   ├── Dashboard/Dashboard.jsx
    │   │   ├── POS/POS.jsx
    │   │   ├── Products/Products.jsx
    │   │   ├── Inventory/Inventory.jsx
    │   │   ├── Recipes/Recipes.jsx
    │   │   ├── Orders/Orders.jsx
    │   │   ├── Customers/Customers.jsx
    │   │   ├── Employees/Employees.jsx
    │   │   ├── Expenses/Expenses.jsx
    │   │   ├── Analytics/Analytics.jsx
    │   │   ├── Reports/Reports.jsx
    │   │   ├── Branches/Branches.jsx
    │   │   ├── Users/Users.jsx
    │   │   ├── Settings/Settings.jsx
    │   │   └── NotFound.jsx
    │   ├── App.jsx
    │   ├── main.jsx
    │   └── index.css
    ├── index.html
    ├── package.json
    ├── vite.config.js
    ├── tailwind.config.js
    └── postcss.config.js
```

---

## 📊 Role Permissions

| Feature | Admin | Manager | Cashier | Barista |
|---------|-------|---------|---------|---------|
| Dashboard | ✅ | ✅ | ✅ | ✅ |
| POS | ✅ | ✅ | ✅ | ❌ |
| Products | ✅ | ✅ | 👁️ | 👁️ |
| Inventory | ✅ | ✅ | ❌ | ❌ |
| Recipes | ✅ | ✅ | ❌ | ✅ |
| Orders | ✅ | ✅ | ✅ | 👁️ |
| Customers | ✅ | ✅ | ✅ | ❌ |
| Employees | ✅ | ✅ | ❌ | ❌ |
| Expenses | ✅ | ✅ | ❌ | ❌ |
| Analytics | ✅ | ✅ | ❌ | ❌ |
| Reports | ✅ | ✅ | ❌ | ❌ |
| Branches | ✅ | 👁️ | ❌ | ❌ |
| Users | ✅ | ❌ | ❌ | ❌ |
| Settings | ✅ | ✅ | ✅ | ✅ |

> 👁️ = View only

---

## 🧩 Key Business Logic

### Auto Stock Deduction
When an order is placed via POS:
1. Each product's `Recipe` is loaded
2. Ingredients are deducted proportionally (`quantity × item count`)
3. If an ingredient hits its `minStock` threshold → a low-stock `Notification` is auto-created

### Loyalty Tiers
Customers earn points with every order. Tier upgrades are automatic:
- 🥉 **Bronze**: 0–499 points
- 🥈 **Silver**: 500–1499 points  
- 🥇 **Gold**: 1500+ points

### Demand Forecasting
Analytics uses a **7-day moving average** on historical orders to forecast next-week demand for each product — no external APIs required.

---

## 📝 Notes

- Currency defaults to **TND** (Tunisian Dinar) — change in `utils/index.js`
- Product images are stored in `backend/uploads/`
- The cron job runs at **7:00 AM daily** to scan for expiring/low-stock ingredients
- Dark mode is stored in `localStorage` and persists across sessions
