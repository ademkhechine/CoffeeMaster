const express = require('express');
const Employee = require('../models/Employee');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/roles');
const router = express.Router();

router.get('/', protect, authorize('admin', 'manager'), async (req, res, next) => {
  try {
    const { branch, role } = req.query;
    const filter = { isActive: true };
    if (branch) filter.branch = branch;
    if (role) filter.role = role;
    const employees = await Employee.find(filter).populate('branch', 'name').sort({ name: 1 });
    res.json(employees);
  } catch (err) { next(err); }
});

router.post('/', protect, authorize('admin', 'manager'), async (req, res, next) => {
  try {
    const employee = await Employee.create(req.body);
    res.status(201).json(employee);
  } catch (err) { next(err); }
});

router.get('/:id', protect, authorize('admin', 'manager'), async (req, res, next) => {
  try {
    const employee = await Employee.findById(req.params.id).populate('branch', 'name');
    if (!employee) return res.status(404).json({ error: 'Employee not found.' });
    res.json(employee);
  } catch (err) { next(err); }
});

router.put('/:id', protect, authorize('admin', 'manager'), async (req, res, next) => {
  try {
    const employee = await Employee.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!employee) return res.status(404).json({ error: 'Employee not found.' });
    res.json(employee);
  } catch (err) { next(err); }
});

router.delete('/:id', protect, authorize('admin'), async (req, res, next) => {
  try {
    await Employee.findByIdAndUpdate(req.params.id, { isActive: false });
    res.json({ message: 'Employee deactivated.' });
  } catch (err) { next(err); }
});

// POST /api/employees/:id/attendance
router.post('/:id/attendance', protect, authorize('admin', 'manager'), async (req, res, next) => {
  try {
    const employee = await Employee.findById(req.params.id);
    if (!employee) return res.status(404).json({ error: 'Employee not found.' });
    employee.attendance.push(req.body);
    await employee.save();
    res.json(employee);
  } catch (err) { next(err); }
});

module.exports = router;
