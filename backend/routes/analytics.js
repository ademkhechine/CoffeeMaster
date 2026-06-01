const express = require('express');
const Order = require('../models/Order');
const Expense = require('../models/Expense');
const Product = require('../models/Product');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/roles');
const router = express.Router();

// GET /api/analytics/dashboard
router.get('/dashboard', protect, async (req, res, next) => {
  try {
    const { branch } = req.query;
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(now); weekStart.setDate(now.getDate() - 7);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const branchFilter = branch ? { branch } : {};
    const base = { status: 'completed', ...branchFilter };

    const [todayOrders, weekOrders, monthOrders, totalOrders] = await Promise.all([
      Order.find({ ...base, createdAt: { $gte: todayStart } }),
      Order.find({ ...base, createdAt: { $gte: weekStart } }),
      Order.find({ ...base, createdAt: { $gte: monthStart } }),
      Order.find({ ...base })
    ]);

    const revenue = {
      today: todayOrders.reduce((s, o) => s + o.total, 0),
      week: weekOrders.reduce((s, o) => s + o.total, 0),
      month: monthOrders.reduce((s, o) => s + o.total, 0),
      total: totalOrders.reduce((s, o) => s + o.total, 0),
    };

    const monthExpenses = await Expense.aggregate([
      { $match: { date: { $gte: monthStart }, ...branchFilter } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    const totalExpenses = monthExpenses[0]?.total || 0;

    // Best sellers
    const productSales = {};
    monthOrders.forEach(o => {
      o.items.forEach(item => {
        const id = item.product?.toString() || item.name;
        if (!productSales[id]) productSales[id] = { name: item.name, qty: 0, revenue: 0 };
        productSales[id].qty += item.quantity;
        productSales[id].revenue += item.price * item.quantity;
      });
    });
    const bestSellers = Object.values(productSales).sort((a, b) => b.qty - a.qty).slice(0, 5);

    res.json({
      data: {
        revenue,
        orders: { today: todayOrders.length, week: weekOrders.length, month: monthOrders.length },
        profit: { month: revenue.month - totalExpenses },
        totalExpenses,
        bestSellers
      }
    });
  } catch (err) { next(err); }
});

// GET /api/analytics/revenue-chart
router.get('/revenue-chart', protect, async (req, res, next) => {
  try {
    const { branch, period = 'daily', days = 30 } = req.query;
    const startDate = new Date(); startDate.setDate(startDate.getDate() - Number(days));
    const match = { status: 'completed', createdAt: { $gte: startDate } };
    if (branch) match.branch = new (require('mongoose').Types.ObjectId)(branch);
    const groupBy = period === 'monthly'
      ? { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } }
      : { year: { $year: '$createdAt' }, month: { $month: '$createdAt' }, day: { $dayOfMonth: '$createdAt' } };
    const data = await Order.aggregate([
      { $match: match },
      { $group: { _id: groupBy, revenue: { $sum: '$total' }, orders: { $sum: 1 } } },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
    ]);
    res.json({ data });
  } catch (err) { next(err); }
});

// GET /api/analytics/peak-hours
router.get('/peak-hours', protect, async (req, res, next) => {
  try {
    const { branch, days = 30 } = req.query;
    const startDate = new Date(); startDate.setDate(startDate.getDate() - Number(days));
    const match = { status: 'completed', createdAt: { $gte: startDate } };
    if (branch) match.branch = new (require('mongoose').Types.ObjectId)(branch);
    const data = await Order.aggregate([
      { $match: match },
      { $group: { _id: { hour: { $hour: '$createdAt' } }, orders: { $sum: 1 }, revenue: { $sum: '$total' } } },
      { $sort: { '_id.hour': 1 } }
    ]);
    res.json({ data });
  } catch (err) { next(err); }
});

// GET /api/analytics/forecast
router.get('/forecast', protect, async (req, res, next) => {
  try {
    const { branch, days = 7 } = req.query;
    const startDate = new Date(); startDate.setDate(startDate.getDate() - 60);
    const match = { status: 'completed', createdAt: { $gte: startDate } };
    if (branch) match.branch = new (require('mongoose').Types.ObjectId)(branch);
    const historicalData = await Order.aggregate([
      { $match: match },
      { $group: { _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' }, day: { $dayOfMonth: '$createdAt' } }, revenue: { $sum: '$total' } } },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
    ]);
    if (historicalData.length < 7) return res.json({ forecast: [], message: 'Not enough data' });
    // Moving average forecast
    const recent = historicalData.slice(-14).map(d => d.revenue);
    const avg = recent.reduce((s, v) => s + v, 0) / recent.length;
    const trend = (recent[recent.length - 1] - recent[0]) / recent.length;
    const forecast = [];
    for (let i = 1; i <= Number(days); i++) {
      const date = new Date(); date.setDate(date.getDate() + i);
      forecast.push({
        date: date.toISOString().split('T')[0],
        predicted: Math.max(0, Math.round(avg + trend * i))
      });
    }
    res.json({ forecast });
  } catch (err) { next(err); }
});

// GET /api/analytics/product-profitability
router.get('/product-profitability', protect, async (req, res, next) => {
  try {
    const { branch, days = 30 } = req.query;
    const startDate = new Date(); startDate.setDate(startDate.getDate() - Number(days));
    const match = { status: 'completed', createdAt: { $gte: startDate } };
    if (branch) match.branch = new (require('mongoose').Types.ObjectId)(branch);
    const data = await Order.aggregate([
      { $match: match },
      { $unwind: '$items' },
      { $group: { _id: { product: '$items.product', name: '$items.name' }, totalQty: { $sum: '$items.quantity' }, totalRevenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } } } },
      { $sort: { totalRevenue: -1 } },
      { $limit: 10 }
    ]);
    res.json({ data });
  } catch (err) { next(err); }
});

module.exports = router;
