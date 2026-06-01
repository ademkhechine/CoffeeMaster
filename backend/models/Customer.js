const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  phone: { type: String, default: '', trim: true },
  email: { type: String, default: '', lowercase: true, trim: true },
  loyaltyPoints: { type: Number, default: 0 },
  totalSpent: { type: Number, default: 0 },
  visitCount: { type: Number, default: 0 },
  tier: { type: String, enum: ['Bronze', 'Silver', 'Gold', 'Platinum'], default: 'Bronze' },
  birthdate: { type: Date },
  address: { type: String, default: '' },
  notes: { type: String, default: '' },
  branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

// Auto-update tier based on total spent
customerSchema.pre('save', function (next) {
  if (this.totalSpent >= 50000) this.tier = 'Platinum';
  else if (this.totalSpent >= 20000) this.tier = 'Gold';
  else if (this.totalSpent >= 5000) this.tier = 'Silver';
  else this.tier = 'Bronze';
  next();
});

module.exports = mongoose.model('Customer', customerSchema);
