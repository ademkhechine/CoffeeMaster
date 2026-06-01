const express = require('express');
const Recipe = require('../models/Recipe');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/roles');

const router = express.Router();

router.get('/', protect, async (req, res, next) => {
  try {
    const recipes = await Recipe.find()
      .populate('product', 'name category price image')
      .populate('ingredients.ingredient', 'name unit quantity');
    res.json(recipes);
  } catch (err) { next(err); }
});

router.post('/', protect, authorize('admin', 'manager'), async (req, res, next) => {
  try {
    const existing = await Recipe.findOne({ product: req.body.product });
    if (existing) {
      existing.ingredients = req.body.ingredients;
      existing.instructions = req.body.instructions;
      existing.yield = req.body.yield || 1;
      await existing.save();
      return res.json(existing);
    }
    const recipe = await Recipe.create(req.body);
    res.status(201).json(recipe);
  } catch (err) { next(err); }
});

router.get('/product/:productId', protect, async (req, res, next) => {
  try {
    const recipe = await Recipe.findOne({ product: req.params.productId })
      .populate('product', 'name category price image')
      .populate('ingredients.ingredient', 'name unit quantity minQuantity');
    if (!recipe) return res.status(404).json({ error: 'Recipe not found for this product.' });
    res.json(recipe);
  } catch (err) { next(err); }
});

router.put('/:id', protect, authorize('admin', 'manager'), async (req, res, next) => {
  try {
    const recipe = await Recipe.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!recipe) return res.status(404).json({ error: 'Recipe not found.' });
    res.json(recipe);
  } catch (err) { next(err); }
});

router.delete('/:id', protect, authorize('admin', 'manager'), async (req, res, next) => {
  try {
    await Recipe.findByIdAndDelete(req.params.id);
    res.json({ message: 'Recipe deleted.' });
  } catch (err) { next(err); }
});

module.exports = router;
