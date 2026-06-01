const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  category: {
    type: String,
    enum: ['Coffee', 'Tea', 'Desserts', 'Sandwiches', 'Juices', 'Other'],
    required: true
  },
  price: { type: Number, required: true, min: 0 },
  cost: { type: Number, default: 0, min: 0 },
  image: { type: String, default: '' },
  isAvailable: { type: Boolean, default: true },
  branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },
  sku: { type: String, default: '' },
  taxRate: { type: Number, default: 0 },
  preparationTime: { type: Number, default: 5 }, // minutes
  allergens: [{ type: String }],
  totalSold: { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('Product', productSchema);
