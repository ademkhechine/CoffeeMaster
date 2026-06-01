const mongoose = require('mongoose');

const reservationSchema = new mongoose.Schema({
  customerName:  { type: String, required: true, trim: true },
  phone:         { type: String, required: true },
  email:         { type: String, default: '' },
  date:          { type: Date, required: true },
  time:          { type: String, required: true },   // e.g. "19:30"
  partySize:     { type: Number, required: true, min: 1, max: 20 },
  table:         { type: mongoose.Schema.Types.ObjectId, ref: 'Table' },
  branch:        { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
  status:        { type: String, enum: ['pending', 'confirmed', 'seated', 'cancelled', 'no-show'], default: 'pending' },
  notes:         { type: String, default: '' },
  createdBy:     { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

// Index for quick date lookups
reservationSchema.index({ date: 1, branch: 1 });
reservationSchema.index({ status: 1 });

module.exports = mongoose.model('Reservation', reservationSchema);
