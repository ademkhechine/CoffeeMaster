const mongoose = require('mongoose');

const poItemSchema = new mongoose.Schema({
  ingredient: { type: mongoose.Schema.Types.ObjectId, ref: 'Ingredient', required: true },
  name: { type: String, required: true },
  quantity: { type: Number, required: true, min: 0 },
  costPerUnit: { type: Number, required: true, min: 0 },
  total: { type: Number, required: true, min: 0 }
});

const poSchema = new mongoose.Schema({
  poNumber: { type: String, unique: true },
  supplier: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier', required: true },
  items: [poItemSchema],
  totalAmount: { type: Number, required: true, min: 0 },
  status: { type: String, enum: ['draft', 'pending', 'validated', 'cancelled'], default: 'draft' },
  paymentStatus: { type: String, enum: ['unpaid', 'partially_paid', 'paid'], default: 'unpaid' },
  branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  notes: { type: String, default: '' }
}, { timestamps: true });

poSchema.pre('save', async function (next) {
  if (!this.poNumber) {
    const count = await mongoose.model('PurchaseOrder').countDocuments();
    this.poNumber = `PO-${String(count + 1).padStart(5, '0')}`;
  }
  next();
});

module.exports = mongoose.model('PurchaseOrder', poSchema);
