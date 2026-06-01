const express = require('express');
const Reservation = require('../models/Reservation');
const Table = require('../models/Table');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/roles');
const router = express.Router();

// GET /api/reservations — list with optional date/branch filter
router.get('/', protect, async (req, res, next) => {
  try {
    const { branch, date, status } = req.query;
    const filter = {};
    if (branch) filter.branch = branch;
    if (status) filter.status = status;
    if (date) {
      const d = new Date(date);
      const next = new Date(d); next.setDate(d.getDate() + 1);
      filter.date = { $gte: d, $lt: next };
    }
    const reservations = await Reservation.find(filter)
      .populate('table', 'number label zone capacity')
      .populate('branch', 'name')
      .populate('createdBy', 'name')
      .sort({ date: 1, time: 1 });
    res.json({ data: reservations });
  } catch (err) { next(err); }
});

// GET /api/reservations/:id
router.get('/:id', protect, async (req, res, next) => {
  try {
    const reservation = await Reservation.findById(req.params.id)
      .populate('table', 'number label zone capacity')
      .populate('branch', 'name');
    if (!reservation) return res.status(404).json({ error: 'Reservation not found.' });
    res.json({ data: reservation });
  } catch (err) { next(err); }
});

// POST /api/reservations — create
router.post('/', protect, async (req, res, next) => {
  try {
    const reservation = await Reservation.create({
      ...req.body,
      createdBy: req.user._id,
    });

    // Auto-mark table as reserved if assigned
    if (reservation.table) {
      await Table.findByIdAndUpdate(reservation.table, { status: 'reserved' });
      const io = req.app.get('io');
      if (io) io.emit('table:updated');
    }

    res.status(201).json({ data: reservation });
  } catch (err) { next(err); }
});

// PUT /api/reservations/:id — update
router.put('/:id', protect, authorize('admin', 'manager', 'cashier'), async (req, res, next) => {
  try {
    const reservation = await Reservation.findByIdAndUpdate(
      req.params.id, req.body, { new: true, runValidators: true }
    ).populate('table', 'number label zone');
    if (!reservation) return res.status(404).json({ error: 'Reservation not found.' });
    
    const io = req.app.get('io');
    if (io) io.emit('table:updated');
    
    res.json({ data: reservation });
  } catch (err) { next(err); }
});

// PATCH /api/reservations/:id/status — update status only
router.patch('/:id/status', protect, async (req, res, next) => {
  try {
    const { status } = req.body;
    const reservation = await Reservation.findByIdAndUpdate(
      req.params.id, { status }, { new: true }
    ).populate('table', 'number label zone');
    if (!reservation) return res.status(404).json({ error: 'Reservation not found.' });

    // When seated → mark table occupied; cancelled → mark table available
    if (reservation.table) {
      if (status === 'seated') {
        await Table.findByIdAndUpdate(reservation.table._id || reservation.table, { status: 'occupied' });
      } else if (status === 'cancelled' || status === 'no-show') {
        await Table.findByIdAndUpdate(reservation.table._id || reservation.table, { status: 'available' });
      }
      const io = req.app.get('io');
      if (io) io.emit('table:updated');
    }

    res.json({ data: reservation });
  } catch (err) { next(err); }
});

// DELETE /api/reservations/:id
router.delete('/:id', protect, authorize('admin', 'manager'), async (req, res, next) => {
  try {
    const reservation = await Reservation.findByIdAndDelete(req.params.id);
    if (!reservation) return res.status(404).json({ error: 'Reservation not found.' });
    if (reservation.table && reservation.status === 'confirmed') {
      await Table.findByIdAndUpdate(reservation.table, { status: 'available' });
    }
    const io = req.app.get('io');
    if (io) io.emit('table:updated');
    res.json({ message: 'Reservation deleted.' });
  } catch (err) { next(err); }
});

module.exports = router;
