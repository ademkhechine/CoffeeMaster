const express = require('express');
const Table = require('../models/Table');
const Order = require('../models/Order');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/roles');
const router = express.Router();

// GET all tables
router.get('/', protect, async (req, res, next) => {
  try {
    const { branch, zone, status } = req.query;
    const filter = { isActive: true };
    if (branch) filter.branch = branch;
    if (zone) filter.zone = zone;
    if (status) filter.status = status;
    const tables = await Table.find(filter)
      .populate('currentOrder', 'orderNumber total status items createdAt')
      .populate('branch', 'name')
      .sort({ zone: 1, number: 1 });
    res.json({ data: tables });
  } catch (err) { next(err); }
});

// POST create table
router.post('/', protect, authorize('admin', 'manager'), async (req, res, next) => {
  try {
    const table = await Table.create(req.body);
    const io = req.app.get('io');
    if (io) io.emit('table:updated', table);
    res.status(201).json({ data: table });
  } catch (err) { next(err); }
});

// PUT update table layout/info
router.put('/:id', protect, authorize('admin', 'manager'), async (req, res, next) => {
  try {
    const table = await Table.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!table) return res.status(404).json({ error: 'Table not found.' });
    const io = req.app.get('io');
    if (io) io.emit('table:updated', table);
    res.json({ data: table });
  } catch (err) { next(err); }
});

// DELETE (soft-delete) table
router.delete('/:id', protect, authorize('admin'), async (req, res, next) => {
  try {
    const table = await Table.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
    if (!table) return res.status(404).json({ error: 'Table not found.' });
    const io = req.app.get('io');
    if (io) io.emit('table:updated', table);
    res.json({ message: 'Table removed.' });
  } catch (err) { next(err); }
});

// POST seat a table — link to a new/existing order
router.post('/:id/seat', protect, async (req, res, next) => {
  try {
    const table = await Table.findById(req.params.id);
    if (!table) return res.status(404).json({ error: 'Table not found.' });
    if (table.status === 'occupied') return res.status(400).json({ error: 'Table is already occupied.' });
    table.status = 'occupied';
    table.seatedAt = new Date();
    table.reservedFor = null;
    table.reservedAt = null;
    if (req.body.orderId) {
      table.currentOrder = req.body.orderId;
      await Order.findByIdAndUpdate(req.body.orderId, { table: table._id });
    }
    await table.save();
    await table.populate('currentOrder', 'orderNumber total status items');
    const io = req.app.get('io');
    if (io) io.emit('table:updated', table);
    res.json({ data: table });
  } catch (err) { next(err); }
});

// POST vacate a table — clear after payment
router.post('/:id/vacate', protect, async (req, res, next) => {
  try {
    const table = await Table.findByIdAndUpdate(req.params.id, {
      status: 'cleaning',
      currentOrder: null,
      seatedAt: null,
      reservedFor: null,
      reservedAt: null,
    }, { new: true });
    if (!table) return res.status(404).json({ error: 'Table not found.' });
    const io = req.app.get('io');
    if (io) io.emit('table:updated', table);
    res.json({ data: table });
  } catch (err) { next(err); }
});

router.post('/:id/ready', protect, async (req, res, next) => {
  try {
    const table = await Table.findByIdAndUpdate(req.params.id, {
      status: 'available',
      currentOrder: null,
      seatedAt: null,
      reservedFor: null,
      reservedAt: null
    }, { new: true });
    if (!table) return res.status(404).json({ error: 'Table not found.' });
    
    // Emit Socket.io update event
    const io = req.app.get('io');
    if (io) io.emit('table:updated', table);

    res.json({ data: table });
  } catch (err) { next(err); }
});

// POST reserve a table
router.post('/:id/reserve', protect, async (req, res, next) => {
  try {
    const { reservedFor, reservedAt } = req.body;
    const table = await Table.findById(req.params.id);
    if (!table) return res.status(404).json({ error: 'Table not found.' });
    if (table.status === 'occupied') return res.status(400).json({ error: 'Table is currently occupied.' });
    table.status = 'reserved';
    table.reservedFor = reservedFor || 'Guest';
    table.reservedAt = reservedAt ? new Date(reservedAt) : new Date();
    await table.save();
    
    // Emit Socket.io update event
    const io = req.app.get('io');
    if (io) io.emit('table:updated', table);

    res.json({ data: table });
  } catch (err) { next(err); }
});

module.exports = router;
