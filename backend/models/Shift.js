const mongoose = require('mongoose');

const shiftSchema = new mongoose.Schema({
  shiftNumber: { type: String, unique: true },
  cashier: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
  status: { type: String, enum: ['open', 'closed'], default: 'open' },
  openingTime: { type: Date, default: Date.now },
  closingTime: { type: Date },
  openingCash: { type: Number, required: true, min: 0 },
  expectedCash: { type: Number, default: 0 },
  actualCash: { type: Number, default: 0 },
  variance: { type: Number, default: 0 },
  cashSales: { type: Number, default: 0 },
  cardSales: { type: Number, default: 0 },
  expensesPaid: { type: Number, default: 0 },
  notes: { type: String, default: '' }
}, { timestamps: true });

shiftSchema.pre('save', async function (next) {
  if (!this.shiftNumber) {
    const count = await mongoose.model('Shift').countDocuments();
    this.shiftNumber = `SFT-${String(count + 1).padStart(5, '0')}`;
  }
  next();
});

module.exports = mongoose.model('Shift', shiftSchema);
