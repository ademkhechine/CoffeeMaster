const express = require('express');
const Order = require('../models/Order');
const Expense = require('../models/Expense');
const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/roles');
const router = express.Router();

router.get('/sales/pdf', protect, authorize('admin', 'manager'), async (req, res, next) => {
  try {
    const { from, to, branch } = req.query;
    const filter = { status: 'completed' };
    if (branch) filter.branch = branch;
    if (from || to) { filter.createdAt = {}; if (from) filter.createdAt.$gte = new Date(from); if (to) filter.createdAt.$lte = new Date(to); }
    const orders = await Order.find(filter).populate('cashier', 'name').populate('branch', 'name').sort({ createdAt: -1 });
    const totalRevenue = orders.reduce((s, o) => s + o.total, 0);
    const doc = new PDFDocument({ margin: 40 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="sales-report.pdf"');
    doc.pipe(res);
    doc.fontSize(22).fillColor('#6F4E37').text('CoffeeMaster - Sales Report', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).fillColor('#333').text(`Total Orders: ${orders.length}   |   Total Revenue: ${totalRevenue.toLocaleString('fr-TN', { minimumFractionDigits: 3, maximumFractionDigits: 3 })} TND`);
    doc.moveDown();
    orders.slice(0, 100).forEach(o => {
      doc.fontSize(9).fillColor('#555').text(`${o.orderNumber}  |  ${new Date(o.createdAt).toLocaleDateString()}  |  ${o.cashier?.name || '-'}  |  ${o.total.toLocaleString('fr-TN', { minimumFractionDigits: 3, maximumFractionDigits: 3 })} TND  |  ${o.paymentMethod}`);
    });
    doc.end();
  } catch (err) { next(err); }
});

router.get('/sales/excel', protect, authorize('admin', 'manager'), async (req, res, next) => {
  try {
    const { from, to, branch } = req.query;
    const filter = { status: 'completed' };
    if (branch) filter.branch = branch;
    if (from || to) { filter.createdAt = {}; if (from) filter.createdAt.$gte = new Date(from); if (to) filter.createdAt.$lte = new Date(to); }
    const orders = await Order.find(filter).populate('cashier', 'name').populate('customer', 'name').populate('branch', 'name').sort({ createdAt: -1 });
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Sales');
    sheet.columns = [
      { header: 'Order #', key: 'orderNumber', width: 15 },
      { header: 'Date', key: 'date', width: 22 },
      { header: 'Cashier', key: 'cashier', width: 20 },
      { header: 'Customer', key: 'customer', width: 20 },
      { header: 'Branch', key: 'branch', width: 20 },
      { header: 'Subtotal', key: 'subtotal', width: 15 },
      { header: 'Discount', key: 'discount', width: 15 },
      { header: 'Total', key: 'total', width: 15 },
      { header: 'Payment', key: 'payment', width: 15 },
    ];
    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF6F4E37' } };
    orders.forEach(o => sheet.addRow({
      orderNumber: o.orderNumber, date: new Date(o.createdAt).toLocaleString(),
      cashier: o.cashier?.name || '', customer: o.customer?.name || 'Walk-in',
      branch: o.branch?.name || '', subtotal: o.subtotal, discount: o.discountAmount,
      total: o.total, payment: o.paymentMethod,
    }));
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="sales-report.xlsx"');
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) { next(err); }
});

router.get('/expenses/excel', protect, authorize('admin', 'manager'), async (req, res, next) => {
  try {
    const { from, to, branch } = req.query;
    const filter = {};
    if (branch) filter.branch = branch;
    if (from || to) { filter.date = {}; if (from) filter.date.$gte = new Date(from); if (to) filter.date.$lte = new Date(to); }
    const expenses = await Expense.find(filter).populate('branch', 'name').sort({ date: -1 });
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Expenses');
    sheet.columns = [
      { header: 'Date', key: 'date', width: 20 }, { header: 'Category', key: 'category', width: 20 },
      { header: 'Description', key: 'description', width: 30 }, { header: 'Amount (TND)', key: 'amount', width: 18 },
      { header: 'Branch', key: 'branch', width: 20 }, { header: 'Payment', key: 'payment', width: 15 },
    ];
    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF6F4E37' } };
    expenses.forEach(e => sheet.addRow({
      date: new Date(e.date).toLocaleDateString(), category: e.category,
      description: e.description, amount: e.amount, branch: e.branch?.name || '', payment: e.paymentMethod,
    }));
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="expenses-report.xlsx"');
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) { next(err); }
});

module.exports = router;
