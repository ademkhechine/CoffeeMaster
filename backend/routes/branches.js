const express = require('express');
const Branch = require('../models/Branch');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/roles');

const router = express.Router();

router.get('/', protect, async (req, res, next) => {
  try {
    const branches = await Branch.find().populate('manager', 'name email');
    res.json(branches);
  } catch (err) { next(err); }
});

router.post('/', protect, authorize('admin'), async (req, res, next) => {
  try {
    const branch = await Branch.create(req.body);
    res.status(201).json(branch);
  } catch (err) { next(err); }
});

router.get('/:id', protect, async (req, res, next) => {
  try {
    const branch = await Branch.findById(req.params.id).populate('manager', 'name email');
    if (!branch) return res.status(404).json({ error: 'Branch not found.' });
    res.json(branch);
  } catch (err) { next(err); }
});

router.put('/:id', protect, authorize('admin', 'manager'), async (req, res, next) => {
  try {
    const branch = await Branch.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!branch) return res.status(404).json({ error: 'Branch not found.' });
    res.json(branch);
  } catch (err) { next(err); }
});

router.delete('/:id', protect, authorize('admin'), async (req, res, next) => {
  try {
    await Branch.findByIdAndUpdate(req.params.id, { isActive: false });
    res.json({ message: 'Branch deactivated.' });
  } catch (err) { next(err); }
});

module.exports = router;
