const mongoose = require('mongoose');

const tableSchema = new mongoose.Schema({
  number: { type: String, required: true, trim: true },
  label: { type: String, trim: true },
  zone: { type: String, enum: ['Main Hall', 'Garden Terrace', 'Bar', 'Private Room', 'Takeaway'], default: 'Main Hall' },
  capacity: { type: Number, required: true, default: 2, min: 1, max: 20 },
  status: { type: String, enum: ['available', 'occupied', 'reserved', 'cleaning'], default: 'available' },
  currentOrder: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', default: null },
  reservedFor: { type: String, default: null },
  reservedAt: { type: Date, default: null },
  seatedAt: { type: Date, default: null },
  branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', default: null },
  posX: { type: Number, default: 0 },
  posY: { type: Number, default: 0 },
  shape: { type: String, enum: ['square', 'round', 'long'], default: 'square' },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('Table', tableSchema);
