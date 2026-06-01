const express = require('express');
const Ingredient = require('../models/Ingredient');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/roles');
const { generateStockNotifications } = require('../services/notificationService');

const router = express.Router();

router.get('/', protect, async (req, res, next) => {
  try {
    const { branch, lowStock, category } = req.query;
    const filter = { isActive: true };
    if (branch) filter.branch = branch;
    if (category) filter.category = category;
    let ingredients = await Ingredient.find(filter).populate('branch', 'name').sort({ name: 1 });
    if (lowStock === 'true') {
      ingredients = ingredients.filter(i => i.isLowStock);
    }
    res.json(ingredients);
  } catch (err) { next(err); }
});

router.post('/', protect, authorize('admin', 'manager'), async (req, res, next) => {
  try {
    const ingredient = await Ingredient.create(req.body);
    res.status(201).json(ingredient);
  } catch (err) { next(err); }
});

router.get('/low-stock', protect, async (req, res, next) => {
  try {
    const { branch } = req.query;
    const filter = { isActive: true };
    if (branch) filter.branch = branch;
    const all = await Ingredient.find(filter);
    const lowStock = all.filter(i => i.isLowStock);
    res.json(lowStock);
  } catch (err) { next(err); }
});

router.get('/expiring', protect, async (req, res, next) => {
  try {
    const { branch } = req.query;
    const filter = { isActive: true };
    if (branch) filter.branch = branch;
    const all = await Ingredient.find(filter);
    const expiring = all.filter(i => i.isExpiringSoon);
    res.json(expiring);
  } catch (err) { next(err); }
});

router.get('/:id', protect, async (req, res, next) => {
  try {
    const ingredient = await Ingredient.findById(req.params.id).populate('movements.performedBy', 'name');
    if (!ingredient) return res.status(404).json({ error: 'Ingredient not found.' });
    res.json(ingredient);
  } catch (err) { next(err); }
});

router.put('/:id', protect, authorize('admin', 'manager'), async (req, res, next) => {
  try {
    const ingredient = await Ingredient.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!ingredient) return res.status(404).json({ error: 'Ingredient not found.' });
    res.json(ingredient);
  } catch (err) { next(err); }
});

// PATCH /api/ingredients/:id/adjust - stock adjustment
router.patch('/:id/adjust', protect, authorize('admin', 'manager'), async (req, res, next) => {
  try {
    const { type, quantity, note } = req.body;
    const ingredient = await Ingredient.findById(req.params.id);
    if (!ingredient) return res.status(404).json({ error: 'Ingredient not found.' });
    if (type === 'in') ingredient.quantity += Number(quantity);
    else if (type === 'out') ingredient.quantity = Math.max(0, ingredient.quantity - Number(quantity));
    else ingredient.quantity = Number(quantity);
    ingredient.movements.push({ type, quantity: Number(quantity), note, performedBy: req.user._id });
    await ingredient.save();
    await generateStockNotifications(ingredient);
    res.json(ingredient);
  } catch (err) { next(err); }
});

router.delete('/:id', protect, authorize('admin'), async (req, res, next) => {
  try {
    await Ingredient.findByIdAndUpdate(req.params.id, { isActive: false });
    res.json({ message: 'Ingredient deactivated.' });
  } catch (err) { next(err); }
});

module.exports = router;
