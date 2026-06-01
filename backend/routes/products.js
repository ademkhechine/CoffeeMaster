const express = require('express');
const Product = require('../models/Product');
const upload = require('../middleware/upload');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/roles');

const router = express.Router();

router.get('/', protect, async (req, res, next) => {
  try {
    const { category, branch, isAvailable } = req.query;
    const filter = {};
    if (category) filter.category = category;
    if (branch) filter.branch = branch;
    if (isAvailable !== undefined) filter.isAvailable = isAvailable === 'true';
    const products = await Product.find(filter).populate('branch', 'name').sort({ category: 1, name: 1 });
    res.json(products);
  } catch (err) { next(err); }
});

router.post('/', protect, authorize('admin', 'manager'), upload.single('image'), async (req, res, next) => {
  try {
    const data = { ...req.body };
    if (req.file) data.image = `/uploads/${req.file.filename}`;
    const product = await Product.create(data);
    res.status(201).json(product);
  } catch (err) { next(err); }
});

router.get('/:id', protect, async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id).populate('branch', 'name');
    if (!product) return res.status(404).json({ error: 'Product not found.' });
    res.json(product);
  } catch (err) { next(err); }
});

router.put('/:id', protect, authorize('admin', 'manager'), upload.single('image'), async (req, res, next) => {
  try {
    const data = { ...req.body };
    if (req.file) data.image = `/uploads/${req.file.filename}`;
    const product = await Product.findByIdAndUpdate(req.params.id, data, { new: true, runValidators: true });
    if (!product) return res.status(404).json({ error: 'Product not found.' });
    res.json(product);
  } catch (err) { next(err); }
});

router.delete('/:id', protect, authorize('admin', 'manager'), async (req, res, next) => {
  try {
    await Product.findByIdAndDelete(req.params.id);
    res.json({ message: 'Product deleted.' });
  } catch (err) { next(err); }
});

// GET /api/products/categories/list
router.get('/categories/list', protect, async (req, res) => {
  res.json(['Coffee', 'Tea', 'Desserts', 'Sandwiches', 'Juices', 'Other']);
});

module.exports = router;
