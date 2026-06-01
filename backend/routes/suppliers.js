const express = require('express');
const Supplier = require('../models/Supplier');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/roles');

const router = express.Router();

// GET /api/suppliers
router.get('/', protect, async (req, res, next) => {
  try {
    const { branch } = req.query;
    const filter = {};
    if (branch) filter.branch = branch;
    else if (req.user.role !== 'admin' && req.user.branch) {
      filter.branch = req.user.branch;
    }
    const suppliers = await Supplier.find(filter).sort({ name: 1 });
    res.json({ data: suppliers });
  } catch (err) { next(err); }
});

// POST /api/suppliers
router.post('/', protect, authorize('admin', 'manager'), async (req, res, next) => {
  try {
    const { name, email, phone, address, branch } = req.body;
    const targetBranch = branch || req.user.branch;
    const supplier = await Supplier.create({
      name,
      email,
      phone,
      address,
      branch: targetBranch,
      outstandingBalance: 0
    });
    res.status(201).json({ data: supplier });
  } catch (err) { next(err); }
});

// PUT /api/suppliers/:id
router.put('/:id', protect, authorize('admin', 'manager'), async (req, res, next) => {
  try {
    const supplier = await Supplier.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!supplier) return res.status(404).json({ error: 'Supplier not found.' });
    res.json({ data: supplier });
  } catch (err) { next(err); }
});

// POST /api/suppliers/:id/pay-debt
router.post('/:id/pay-debt', protect, authorize('admin', 'manager'), async (req, res, next) => {
  try {
    const { amount } = req.body;
    if (!amount || amount <= 0) return res.status(400).json({ error: 'Valid payment amount is required.' });
    const supplier = await Supplier.findById(req.params.id);
    if (!supplier) return res.status(404).json({ error: 'Supplier not found.' });

    supplier.outstandingBalance = Math.max(0, supplier.outstandingBalance - Number(amount));
    await supplier.save();
    res.json({ data: supplier });
  } catch (err) { next(err); }
});

// DELETE /api/suppliers/:id
router.delete('/:id', protect, authorize('admin', 'manager'), async (req, res, next) => {
  try {
    const supplier = await Supplier.findByIdAndUpdate(req.params.id, { isActive: false });
    if (!supplier) return res.status(404).json({ error: 'Supplier not found.' });
    res.json({ message: 'Supplier deactivated.' });
  } catch (err) { next(err); }
});

module.exports = router;
