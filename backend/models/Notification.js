const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['low_stock', 'expiry', 'high_sales', 'low_sales', 'new_order', 'system', 'custom'],
    required: true
  },
  title: { type: String, required: true },
  message: { type: String, required: true },
  severity: { type: String, enum: ['info', 'warning', 'danger', 'success'], default: 'info' },
  isRead: { type: Boolean, default: false },
  branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },
  relatedId: { type: mongoose.Schema.Types.ObjectId },
  relatedModel: { type: String },
}, { timestamps: true });

module.exports = mongoose.model('Notification', notificationSchema);
