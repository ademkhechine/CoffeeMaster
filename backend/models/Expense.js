const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema({
  category: {
    type: String,
    enum: ['Rent', 'Electricity', 'Water', 'Internet', 'Supplies', 'Salaries', 'Marketing', 'Maintenance', 'Other'],
    required: true
  },
  amount: { type: Number, required: true, min: 0 },
  description: { type: String, default: '' },
  date: { type: Date, default: Date.now },
  branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
  paymentMethod: { type: String, enum: ['cash', 'bank', 'card', 'other'], default: 'cash' },
  receipt: { type: String, default: '' },
  isRecurring: { type: Boolean, default: false },
  addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

module.exports = mongoose.model('Expense', expenseSchema);
