const express = require('express');
const Order = require('../models/Order');
const Customer = require('../models/Customer');
const Product = require('../models/Product');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/roles');
const { deductIngredients } = require('../services/stockService');
const Table = require('../models/Table');

const router = express.Router();

router.post('/', protect, async (req, res, next) => {
  try {
    const { items, subtotal, discountAmount, discountPercent, taxAmount, total,
      paymentMethod, customer: customerId, notes, loyaltyPointsUsed, table, tableNumber } = req.body;
    const orderData = {
      items, subtotal,
      discountAmount: discountAmount || 0, discountPercent: discountPercent || 0,
      taxAmount: taxAmount || 0, total, paymentMethod: paymentMethod || 'cash',
      cashier: req.user._id, branch: req.user.branch?._id || req.body.branch,
      notes: notes || '', loyaltyPointsUsed: loyaltyPointsUsed || 0,
      table: table || null, tableNumber: tableNumber || null
    };
    if (customerId) {
      orderData.customer = customerId;
      const pointsEarned = Math.floor(total / 100);
      orderData.loyaltyPointsEarned = pointsEarned;
      const customer = await Customer.findById(customerId);
      if (customer) {
        customer.loyaltyPoints = (customer.loyaltyPoints || 0) + pointsEarned - (loyaltyPointsUsed || 0);
        customer.totalSpent = (customer.totalSpent || 0) + total;
        customer.visitCount = (customer.visitCount || 0) + 1;
        await customer.save();
      }
    }
    const order = await Order.create(orderData);
    await deductIngredients(items);

    // Increment totalSold counter on each product
    await Promise.all(
      items.map(item =>
        Product.findByIdAndUpdate(item.product, { $inc: { totalSold: item.quantity } })
      )
    );

    if (table) {
      await Table.findByIdAndUpdate(table, {
        status: 'occupied',
        currentOrder: order._id,
        seatedAt: new Date()
      });
    }
    await order.populate([
      { path: 'cashier', select: 'name' },
      { path: 'customer', select: 'name phone loyaltyPoints' },
      { path: 'branch', select: 'name' }
    ]);

    // Emit Socket.io real-time order creation event to kitchen and dashboard
    const io = req.app.get('io');
    if (io) {
      io.to('kitchen').emit('order:new', order);
      io.emit('order:created', order);
      if (table) {
        io.emit('table:updated');
      }
    }

    res.status(201).json(order);
  } catch (err) { next(err); }
});

router.get('/', protect, async (req, res, next) => {
  try {
    const { branch, status, from, to, limit = 50, page = 1 } = req.query;
    const filter = {};
    if (branch) filter.branch = branch;
    if (status) {
      if (status.includes(',')) {
        filter.status = { $in: status.split(',') };
      } else {
        filter.status = status;
      }
    }
    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = new Date(from);
      if (to) filter.createdAt.$lte = new Date(to);
    }
    const total = await Order.countDocuments(filter);
    const orders = await Order.find(filter)
      .populate('cashier', 'name').populate('customer', 'name phone').populate('branch', 'name')
      .sort({ createdAt: -1 }).limit(Number(limit)).skip((Number(page) - 1) * Number(limit));
    res.json({ orders, total, page: Number(page), pages: Math.ceil(total / limit) });
  } catch (err) { next(err); }
});

router.get('/:id', protect, async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('cashier', 'name').populate('customer', 'name phone email loyaltyPoints')
      .populate('branch', 'name address phone').populate('items.product', 'name category image');
    if (!order) return res.status(404).json({ error: 'Order not found.' });
    res.json(order);
  } catch (err) { next(err); }
});

router.patch('/:id/cancel', protect, authorize('admin', 'manager'), async (req, res, next) => {
  try {
    const order = await Order.findByIdAndUpdate(req.params.id, { status: 'cancelled' }, { new: true });
    if (!order) return res.status(404).json({ error: 'Order not found.' });

    // Emit Socket.io real-time update event
    const io = req.app.get('io');
    if (io) io.emit('order:updated', order);

    res.json(order);
  } catch (err) { next(err); }
});

router.patch('/:id/status', protect, async (req, res, next) => {
  try {
    const { status } = req.body;
    const order = await Order.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!order) return res.status(404).json({ error: 'Order not found.' });

    // Auto-update table state if this order is linked to one
    if (order.table && (status === 'completed' || status === 'cancelled')) {
      await Table.findByIdAndUpdate(order.table, {
        status: status === 'completed' ? 'cleaning' : 'available',
        currentOrder: null,
        seatedAt: null
      });
    }

    // Emit Socket.io real-time status update event
    const io = req.app.get('io');
    if (io) {
      io.emit('order:updated', order);
      if (order.table) {
        io.emit('table:updated');
      }
    }

    res.json(order);
  } catch (err) { next(err); }
});

// GET branded PDF receipt for a single order
router.get('/:id/receipt', protect, async (req, res, next) => {
  try {
    const PDFDocument = require('pdfkit');
    const order = await Order.findById(req.params.id)
      .populate('cashier', 'name')
      .populate('customer', 'name phone loyaltyPoints tier')
      .populate('branch', 'name address phone');
    if (!order) return res.status(404).json({ error: 'Order not found.' });

    const doc = new PDFDocument({ margin: 40, size: [226, 700], autoFirstPage: true });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="receipt-${order.orderNumber}.pdf"`);
    doc.pipe(res);

    const W = 226 - 80; // usable width
    const brown = '#6F4E37';
    const darkBrown = '#3E2723';
    const lightGray = '#888888';
    const black = '#1a1a1a';

    // ── Header ──────────────────────────────────────────────
    doc.rect(0, 0, 226, 70).fill(darkBrown);
    doc.fillColor('#FFFFFF').fontSize(18).font('Helvetica-Bold')
       .text('☕ CoffeeMaster', 40, 16, { width: W, align: 'center' });
    doc.fontSize(8).font('Helvetica')
       .text(order.branch?.name || 'Main Branch', 40, 38, { width: W, align: 'center' });
    doc.fontSize(7)
       .text(order.branch?.address || 'Rue du Lac Turkana, Les Berges du Lac, Tunis', 40, 50, { width: W, align: 'center' });
    doc.text(order.branch?.phone ? `Tel: ${order.branch.phone}` : 'Tel: +216 71 860 120', 40, 60, { width: W, align: 'center' });

    // ── Divider ──────────────────────────────────────────────
    let y = 82;
    const dash = () => {
      doc.moveTo(40, y).lineTo(186, y).dash(2, { space: 3 }).strokeColor('#cccccc').stroke().undash();
      y += 10;
    };

    dash();

    // ── Order Meta ──────────────────────────────────────────
    doc.fillColor(black).fontSize(8).font('Helvetica-Bold').text('ORDER', 40, y);
    doc.font('Helvetica').fillColor(brown).text(order.orderNumber, 100, y, { width: 86, align: 'right' });
    y += 13;
    doc.fillColor(black).font('Helvetica-Bold').text('DATE', 40, y);
    doc.font('Helvetica').fillColor(lightGray)
       .text(new Date(order.createdAt).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }), 100, y, { width: 86, align: 'right' });
    y += 13;
    doc.fillColor(black).font('Helvetica-Bold').text('CASHIER', 40, y);
    doc.font('Helvetica').fillColor(lightGray).text(order.cashier?.name || '—', 100, y, { width: 86, align: 'right' });
    y += 13;
    doc.fillColor(black).font('Helvetica-Bold').text('PAYMENT', 40, y);
    doc.font('Helvetica').fillColor(lightGray).text((order.paymentMethod || 'cash').toUpperCase(), 100, y, { width: 86, align: 'right' });
    y += 13;
    if (order.customer) {
      doc.fillColor(black).font('Helvetica-Bold').text('CUSTOMER', 40, y);
      doc.font('Helvetica').fillColor(brown).text(order.customer.name, 100, y, { width: 86, align: 'right' });
      y += 13;
    }
    y += 4;
    dash();

    // ── Line Items ──────────────────────────────────────────
    doc.fillColor(lightGray).fontSize(7).font('Helvetica-Bold')
       .text('ITEM', 40, y).text('QTY', 116, y).text('SUBTOTAL', 148, y, { width: 38, align: 'right' });
    y += 14;

    order.items.forEach(item => {
      const lineTotal = (item.price * item.quantity).toLocaleString('fr-TN', { minimumFractionDigits: 3, maximumFractionDigits: 3 });
      doc.fillColor(black).fontSize(8).font('Helvetica')
         .text(item.name, 40, y, { width: 70, lineBreak: false });
      doc.text(`x${item.quantity}`, 116, y, { width: 26, align: 'center' });
      doc.fillColor(brown).font('Helvetica-Bold')
         .text(`${lineTotal} TND`, 140, y, { width: 46, align: 'right' });
      y += 14;
      // sub-price per unit
      doc.fillColor(lightGray).fontSize(7).font('Helvetica')
         .text(`${(item.price).toLocaleString('fr-TN', { minimumFractionDigits: 3, maximumFractionDigits: 3 })} TND each`, 40, y);
      y += 12;
    });

    y += 4;
    dash();

    // ── Totals ──────────────────────────────────────────────
    const row = (label, value, bold = false, color = black) => {
      doc.fillColor(lightGray).fontSize(8).font('Helvetica').text(label, 40, y);
      doc.fillColor(color).font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(bold ? 9 : 8)
         .text(value, 100, y, { width: 86, align: 'right' });
      y += 14;
    };
    row('Subtotal', `${order.subtotal.toLocaleString('fr-TN', { minimumFractionDigits: 3, maximumFractionDigits: 3 })} TND`);
    if (order.discountAmount > 0) row(`Discount (${order.discountPercent}%)`, `-${order.discountAmount.toLocaleString('fr-TN', { minimumFractionDigits: 3, maximumFractionDigits: 3 })} TND`, false, '#e53e3e');
    if (order.taxAmount > 0)  row('Tax', `${order.taxAmount.toLocaleString('fr-TN', { minimumFractionDigits: 3, maximumFractionDigits: 3 })} TND`);
    y += 2;
    doc.rect(36, y - 4, 154, 1).fill('#e8d5c4');
    y += 6;
    doc.fillColor(darkBrown).fontSize(11).font('Helvetica-Bold')
       .text('TOTAL', 40, y);
    doc.fillColor(brown).fontSize(13).font('Helvetica-Bold')
       .text(`${order.total.toLocaleString('fr-TN', { minimumFractionDigits: 3, maximumFractionDigits: 3 })} TND`, 100, y, { width: 86, align: 'right' });
    y += 22;

    // ── Loyalty ─────────────────────────────────────────────
    if (order.customer && order.loyaltyPointsEarned) {
      dash();
      doc.rect(36, y, 154, 32).fillColor('#fdf6ec').fill();
      doc.fillColor(brown).fontSize(8).font('Helvetica-Bold')
         .text('🎁 LOYALTY POINTS', 40, y + 6, { width: W, align: 'center' });
      doc.fillColor(darkBrown).fontSize(7).font('Helvetica')
         .text(`+${order.loyaltyPointsEarned} pts earned this visit`, 40, y + 18, { width: W, align: 'center' });
      y += 40;
    }

    y += 6;
    dash();

    // ── Footer ──────────────────────────────────────────────
    doc.fillColor(lightGray).fontSize(7).font('Helvetica')
       .text('Thank you for your visit! ☕', 40, y, { width: W, align: 'center' });
    y += 12;
    doc.text('We hope to see you again soon.', 40, y, { width: W, align: 'center' });
    y += 16;
    doc.fillColor('#cccccc').fontSize(6)
       .text(`Printed: ${new Date().toLocaleString('en-GB')}`, 40, y, { width: W, align: 'center' });

    doc.end();
  } catch (err) { next(err); }
});

module.exports = router;
