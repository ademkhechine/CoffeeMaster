const express = require('express');
const Customer = require('../models/Customer');
const Order = require('../models/Order');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/roles');
const router = express.Router();

router.get('/', protect, async (req, res, next) => {
  try {
    const { branch, tier, search } = req.query;
    const filter = { isActive: true };
    if (branch) filter.branch = branch;
    if (tier) filter.tier = tier;
    if (search) filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { phone: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } }
    ];
    const customers = await Customer.find(filter).sort({ totalSpent: -1 });
    res.json(customers);
  } catch (err) { next(err); }
});

router.post('/', protect, async (req, res, next) => {
  try {
    const customer = await Customer.create(req.body);
    res.status(201).json(customer);
  } catch (err) { next(err); }
});

router.get('/:id', protect, async (req, res, next) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) return res.status(404).json({ error: 'Customer not found.' });
    const orders = await Order.find({ customer: req.params.id })
      .populate('branch', 'name').sort({ createdAt: -1 }).limit(20);
    res.json({ customer, orders });
  } catch (err) { next(err); }
});

router.put('/:id', protect, async (req, res, next) => {
  try {
    const customer = await Customer.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!customer) return res.status(404).json({ error: 'Customer not found.' });
    res.json(customer);
  } catch (err) { next(err); }
});

router.delete('/:id', protect, authorize('admin', 'manager'), async (req, res, next) => {
  try {
    await Customer.findByIdAndUpdate(req.params.id, { isActive: false });
    res.json({ message: 'Customer deactivated.' });
  } catch (err) { next(err); }
});

// PATCH /api/customers/:id/points - manual loyalty adjustment
router.patch('/:id/points', protect, authorize('admin', 'manager'), async (req, res, next) => {
  try {
    const { points, reason } = req.body;
    const customer = await Customer.findById(req.params.id);
    if (!customer) return res.status(404).json({ error: 'Customer not found.' });
    customer.loyaltyPoints = Math.max(0, customer.loyaltyPoints + Number(points));
    await customer.save();
    res.json(customer);
  } catch (err) { next(err); }
});

module.exports = router;
