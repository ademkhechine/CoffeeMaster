const express = require('express');
const Shift = require('../models/Shift');
const Order = require('../models/Order');
const Expense = require('../models/Expense');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/roles');

const router = express.Router();

// GET /api/shifts/active
router.get('/active', protect, async (req, res, next) => {
  try {
    const shift = await Shift.findOne({
      cashier: req.user._id,
      status: 'open'
    });
    if (!shift) return res.json({ data: null });

    // Live calculate totals in active shift
    const orders = await Order.find({
      cashier: req.user._id,
      branch: req.user.branch,
      status: 'completed',
      createdAt: { $gte: shift.openingTime }
    });

    const cashSales = orders.filter(o => o.paymentMethod === 'cash').reduce((sum, o) => sum + o.total, 0);
    const cardSales = orders.filter(o => o.paymentMethod === 'card').reduce((sum, o) => sum + o.total, 0);

    const expenses = await Expense.find({
      branch: req.user.branch,
      createdAt: { $gte: shift.openingTime }
    });
    const expensesPaid = expenses.reduce((sum, e) => sum + e.amount, 0);

    const expectedCash = shift.openingCash + cashSales - expensesPaid;

    res.json({
      data: {
        _id: shift._id,
        shiftNumber: shift.shiftNumber,
        openingCash: shift.openingCash,
        openingTime: shift.openingTime,
        status: shift.status,
        cashSales,
        cardSales,
        expensesPaid,
        expectedCash
      }
    });
  } catch (err) { next(err); }
});

// POST /api/shifts/open
router.post('/open', protect, async (req, res, next) => {
  try {
    const { openingCash } = req.body;
    if (openingCash === undefined || openingCash < 0) {
      return res.status(400).json({ error: 'Valid opening cash amount is required.' });
    }

    const existing = await Shift.findOne({ cashier: req.user._id, status: 'open' });
    if (existing) return res.status(400).json({ error: 'You already have an active open shift.' });

    const shift = await Shift.create({
      cashier: req.user._id,
      branch: req.user.branch,
      openingCash: Number(openingCash),
      status: 'open'
    });

    res.status(201).json({ data: shift });
  } catch (err) { next(err); }
});

// POST /api/shifts/close
router.post('/close', protect, async (req, res, next) => {
  try {
    const { actualCash, notes } = req.body;
    if (actualCash === undefined || actualCash < 0) {
      return res.status(400).json({ error: 'Valid actual closing cash is required.' });
    }

    const shift = await Shift.findOne({ cashier: req.user._id, status: 'open' });
    if (!shift) return res.status(404).json({ error: 'No active open shift found for this user.' });

    // Calculate completed cash/card orders since shift opening
    const orders = await Order.find({
      cashier: req.user._id,
      branch: req.user.branch,
      status: 'completed',
      createdAt: { $gte: shift.openingTime }
    });

    const cashSales = orders.filter(o => o.paymentMethod === 'cash').reduce((sum, o) => sum + o.total, 0);
    const cardSales = orders.filter(o => o.paymentMethod === 'card').reduce((sum, o) => sum + o.total, 0);

    // Calculate cash expenses registered since shift opening
    const expenses = await Expense.find({
      branch: req.user.branch,
      createdAt: { $gte: shift.openingTime }
    });
    const expensesPaid = expenses.reduce((sum, e) => sum + e.amount, 0);

    const expectedCash = shift.openingCash + cashSales - expensesPaid;
    const variance = Number(actualCash) - expectedCash;

    shift.status = 'closed';
    shift.closingTime = new Date();
    shift.cashSales = cashSales;
    shift.cardSales = cardSales;
    shift.expensesPaid = expensesPaid;
    shift.expectedCash = expectedCash;
    shift.actualCash = Number(actualCash);
    shift.variance = variance;
    shift.notes = notes || '';

    await shift.save();
    res.json({ data: shift });
  } catch (err) { next(err); }
});

// GET /api/shifts/history
router.get('/history', protect, authorize('admin', 'manager'), async (req, res, next) => {
  try {
    const { branch } = req.query;
    const filter = { status: 'closed' };
    if (branch) filter.branch = branch;
    else if (req.user.role !== 'admin' && req.user.branch) {
      filter.branch = req.user.branch;
    }
    const shifts = await Shift.find(filter)
      .populate('cashier', 'name')
      .sort({ closingTime: -1 });
    res.json({ data: shifts });
  } catch (err) { next(err); }
});

module.exports = router;
