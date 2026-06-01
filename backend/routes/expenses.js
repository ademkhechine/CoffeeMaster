const express = require('express');
const Expense = require('../models/Expense');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/roles');
const router = express.Router();

router.get('/', protect, authorize('admin', 'manager'), async (req, res, next) => {
  try {
    const { branch, category, from, to } = req.query;
    const filter = {};
    if (branch) filter.branch = branch;
    if (category) filter.category = category;
    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = new Date(from);
      if (to) filter.date.$lte = new Date(to);
    }
    const expenses = await Expense.find(filter)
      .populate('branch', 'name').populate('addedBy', 'name').sort({ date: -1 });
    const total = expenses.reduce((sum, e) => sum + e.amount, 0);
    res.json({ expenses, total });
  } catch (err) { next(err); }
});

router.post('/', protect, authorize('admin', 'manager'), async (req, res, next) => {
  try {
    const expense = await Expense.create({ ...req.body, addedBy: req.user._id });
    res.status(201).json(expense);
  } catch (err) { next(err); }
});

router.get('/by-category', protect, authorize('admin', 'manager'), async (req, res, next) => {
  try {
    const { branch, from, to } = req.query;
    const match = {};
    if (branch) match.branch = new (require('mongoose').Types.ObjectId)(branch);
    if (from || to) {
      match.date = {};
      if (from) match.date.$gte = new Date(from);
      if (to) match.date.$lte = new Date(to);
    }
    const result = await Expense.aggregate([
      { $match: match },
      { $group: { _id: '$category', total: { $sum: '$amount' }, count: { $sum: 1 } } },
      { $sort: { total: -1 } }
    ]);
    res.json(result);
  } catch (err) { next(err); }
});

router.put('/:id', protect, authorize('admin', 'manager'), async (req, res, next) => {
  try {
    const expense = await Expense.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!expense) return res.status(404).json({ error: 'Expense not found.' });
    res.json(expense);
  } catch (err) { next(err); }
});

router.delete('/:id', protect, authorize('admin', 'manager'), async (req, res, next) => {
  try {
    await Expense.findByIdAndDelete(req.params.id);
    res.json({ message: 'Expense deleted.' });
  } catch (err) { next(err); }
});

module.exports = router;
