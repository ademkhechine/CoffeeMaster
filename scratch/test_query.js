require('dotenv').config();
const mongoose = require('mongoose');
const Order = require('../backend/models/Order');
const connectDB = require('../backend/config/db');

const test = async () => {
  await connectDB();
  console.log('Connected to DB');
  
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 14);
  const match = { status: 'completed', createdAt: { $gte: startDate } };
  
  const groupBy = { 
    year: { $year: '$createdAt' }, 
    month: { $month: '$createdAt' }, 
    day: { $dayOfMonth: '$createdAt' } 
  };
  
  const data = await Order.aggregate([
    { $match: match },
    { $group: { _id: groupBy, revenue: { $sum: '$total' }, orders: { $sum: 1 } } },
    { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
  ]);
  
  console.log('Data returned:', JSON.stringify(data.slice(0, 5), null, 2));
  process.exit(0);
};

test().catch(err => { console.error(err); process.exit(1); });
