const mongoose = require('mongoose');

const branchSchema = new mongoose.Schema({
  name:        { type: String, required: true, trim: true },
  address:     { type: String, required: true },
  phone:       { type: String, default: '' },
  email:       { type: String, default: '' },
  website:     { type: String, default: '' },
  description: { type: String, default: '' },
  logo:        { type: String, default: '' },       // URL or base64
  coverImage:  { type: String, default: '' },
  manager:     { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  openTime:    { type: String, default: '07:00' },
  closeTime:   { type: String, default: '22:00' },
  isActive:    { type: Boolean, default: true },
  currency:    { type: String, default: 'DZD' },
  taxRate:     { type: Number, default: 0, min: 0, max: 100 },  // % e.g. 19
  wifiPassword:{ type: String, default: '' },
  socialMedia: {
    instagram: { type: String, default: '' },
    facebook:  { type: String, default: '' },
    tiktok:    { type: String, default: '' },
  },
  receiptFooter: { type: String, default: 'Thank you for your visit! ☕' },
}, { timestamps: true });

module.exports = mongoose.model('Branch', branchSchema);
