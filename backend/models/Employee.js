const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  date: { type: Date, required: true },
  checkIn: { type: String },
  checkOut: { type: String },
  status: { type: String, enum: ['present', 'absent', 'late', 'halfday'], default: 'present' },
  hoursWorked: { type: Number, default: 0 },
});

const scheduleSchema = new mongoose.Schema({
  day: { type: String, enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] },
  startTime: { type: String },
  endTime: { type: String },
  isOff: { type: Boolean, default: false },
});

const employeeSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  phone: { type: String, default: '' },
  role: { type: String, enum: ['barista', 'cashier', 'manager', 'cleaner', 'supervisor', 'other'], default: 'barista' },
  salary: { type: Number, required: true, min: 0 },
  salaryType: { type: String, enum: ['monthly', 'daily', 'hourly'], default: 'monthly' },
  branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },
  hireDate: { type: Date, default: Date.now },
  address: { type: String, default: '' },
  nationalId: { type: String, default: '' },
  bankAccount: { type: String, default: '' },
  schedule: [scheduleSchema],
  attendance: [attendanceSchema],
  isActive: { type: Boolean, default: true },
  photo: { type: String, default: '' },
  performanceRating: { type: Number, default: 0, min: 0, max: 5 },
  notes: { type: String, default: '' },
}, { timestamps: true });

module.exports = mongoose.model('Employee', employeeSchema);
