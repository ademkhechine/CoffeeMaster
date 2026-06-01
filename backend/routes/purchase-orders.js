const express = require('express');
const PurchaseOrder = require('../models/PurchaseOrder');
const Ingredient = require('../models/Ingredient');
const Supplier = require('../models/Supplier');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/roles');

const router = express.Router();

// GET /api/purchase-orders
router.get('/', protect, async (req, res, next) => {
  try {
    const { branch } = req.query;
    const filter = {};
    if (branch) filter.branch = branch;
    else if (req.user.role !== 'admin' && req.user.branch) {
      filter.branch = req.user.branch;
    }
    const pos = await PurchaseOrder.find(filter)
      .populate('supplier', 'name outstandingBalance')
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 });
    res.json({ data: pos });
  } catch (err) { next(err); }
});

// POST /api/purchase-orders
router.post('/', protect, authorize('admin', 'manager'), async (req, res, next) => {
  try {
    const { supplier, items, notes, branch } = req.body;
    const targetBranch = branch || req.user.branch;
    if (!supplier || !items || !items.length) {
      return res.status(400).json({ error: 'Supplier and order items are required.' });
    }

    const calculatedTotal = items.reduce((sum, item) => sum + (item.quantity * item.costPerUnit), 0);

    const po = await PurchaseOrder.create({
      supplier,
      items: items.map(item => ({
        ingredient: item.ingredient,
        name: item.name,
        quantity: Number(item.quantity),
        costPerUnit: Number(item.costPerUnit),
        total: Number(item.quantity) * Number(item.costPerUnit)
      })),
      totalAmount: calculatedTotal,
      branch: targetBranch,
      createdBy: req.user._id,
      notes,
      status: 'pending',
      paymentStatus: 'unpaid'
    });

    const populated = await PurchaseOrder.findById(po._id)
      .populate('supplier', 'name')
      .populate('createdBy', 'name');

    res.status(201).json({ data: populated });
  } catch (err) { next(err); }
});

// POST /api/purchase-orders/:id/validate
router.post('/:id/validate', protect, authorize('admin', 'manager'), async (req, res, next) => {
  try {
    const po = await PurchaseOrder.findById(req.params.id);
    if (!po) return res.status(404).json({ error: 'Purchase order not found.' });
    if (po.status === 'validated') return res.status(400).json({ error: 'Purchase order is already validated.' });

    // 1. Process each item: Increase stock and log movements
    for (const item of po.items) {
      const ingredient = await Ingredient.findById(item.ingredient);
      if (ingredient) {
        ingredient.quantity += item.quantity;
        // Adjust costPerUnit to reflect new purchase cost
        ingredient.costPerUnit = item.costPerUnit;
        // Log movement
        ingredient.movements.push({
          type: 'in',
          quantity: item.quantity,
          note: `Procurement intake (PO: ${po.poNumber})`,
          performedBy: req.user._id
        });
        await ingredient.save();
      }
    }

    // 2. Increase supplier's outstanding balance
    const supplier = await Supplier.findById(po.supplier);
    if (supplier) {
      supplier.outstandingBalance += po.totalAmount;
      await supplier.save();
    }

    // 3. Complete PO status
    po.status = 'validated';
    await po.save();

    const populated = await PurchaseOrder.findById(po._id)
      .populate('supplier', 'name outstandingBalance')
      .populate('createdBy', 'name');

    res.json({ data: populated });
  } catch (err) { next(err); }
});

// DELETE /api/purchase-orders/:id
router.delete('/:id', protect, authorize('admin', 'manager'), async (req, res, next) => {
  try {
    const po = await PurchaseOrder.findById(req.params.id);
    if (!po) return res.status(404).json({ error: 'Purchase order not found.' });
    if (po.status === 'validated') return res.status(400).json({ error: 'Cannot delete/cancel a validated purchase order.' });

    po.status = 'cancelled';
    await po.save();
    res.json({ message: 'Purchase order cancelled.' });
  } catch (err) { next(err); }
});

module.exports = router;
