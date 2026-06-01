const mongoose = require('mongoose');

const movementSchema = new mongoose.Schema({
  type: { type: String, enum: ['in', 'out', 'adjustment'], required: true },
  quantity: { type: Number, required: true },
  note: { type: String, default: '' },
  date: { type: Date, default: Date.now },
  performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
});

const ingredientSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  unit: { type: String, enum: ['kg', 'g', 'L', 'ml', 'pcs', 'box', 'bottle'], required: true },
  quantity: { type: Number, required: true, min: 0, default: 0 },
  minQuantity: { type: Number, default: 0 },
  maxQuantity: { type: Number, default: 1000 },
  costPerUnit: { type: Number, default: 0 },
  supplier: { type: String, default: '' },
  expirationDate: { type: Date },
  branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },
  category: { type: String, default: 'General' },
  movements: [movementSchema],
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

// Virtual: low stock alert
ingredientSchema.virtual('isLowStock').get(function () {
  return this.quantity <= this.minQuantity;
});

// Virtual: expiring soon (within 3 days)
ingredientSchema.virtual('isExpiringSoon').get(function () {
  if (!this.expirationDate) return false;
  const diff = (this.expirationDate - new Date()) / (1000 * 60 * 60 * 24);
  return diff <= 3 && diff >= 0;
});

ingredientSchema.set('toJSON', { virtuals: true });
ingredientSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Ingredient', ingredientSchema);
