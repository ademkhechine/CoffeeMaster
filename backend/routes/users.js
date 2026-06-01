const express = require('express');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/roles');

const router = express.Router();

// GET /api/users
router.get('/', protect, authorize('admin', 'manager'), async (req, res, next) => {
  try {
    const { role, branch, isActive } = req.query;
    const filter = {};
    if (role) filter.role = role;
    if (branch) filter.branch = branch;
    if (isActive !== undefined) filter.isActive = isActive === 'true';
    const users = await User.find(filter).populate('branch', 'name').sort({ createdAt: -1 });
    res.json({ data: users });
  } catch (err) { next(err); }
});

// POST /api/users
router.post('/', protect, authorize('admin'), async (req, res, next) => {
  try {
    const { name, email, password, role, branch, phone } = req.body;
    const hashedPassword = await bcrypt.hash(password, 12);
    const user = await User.create({ name, email, password: hashedPassword, role, branch, phone });
    await user.populate('branch', 'name');
    res.status(201).json({ data: user });
  } catch (err) { next(err); }
});

// GET /api/users/:id
router.get('/:id', protect, authorize('admin', 'manager'), async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).populate('branch', 'name');
    if (!user) return res.status(404).json({ error: 'User not found.' });
    res.json({ data: user });
  } catch (err) { next(err); }
});

// PUT /api/users/:id
router.put('/:id', protect, authorize('admin'), async (req, res, next) => {
  try {
    const { password, ...rest } = req.body;
    if (password) rest.password = await bcrypt.hash(password, 12);
    const user = await User.findByIdAndUpdate(req.params.id, rest, { new: true, runValidators: true }).populate('branch', 'name');
    if (!user) return res.status(404).json({ error: 'User not found.' });
    res.json({ data: user });
  } catch (err) { next(err); }
});

// DELETE /api/users/:id
router.delete('/:id', protect, authorize('admin'), async (req, res, next) => {
  try {
    await User.findByIdAndUpdate(req.params.id, { isActive: false });
    res.json({ message: 'User deactivated.' });
  } catch (err) { next(err); }
});

module.exports = router;
