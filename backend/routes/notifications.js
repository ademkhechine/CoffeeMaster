const express = require('express');
const Notification = require('../models/Notification');
const { protect } = require('../middleware/auth');
const router = express.Router();

router.get('/', protect, async (req, res, next) => {
  try {
    const { branch, isRead } = req.query;
    const filter = {};
    if (branch) filter.branch = branch;
    if (isRead !== undefined) filter.isRead = isRead === 'true';
    const notifications = await Notification.find(filter).sort({ createdAt: -1 }).limit(50);
    const unreadCount = await Notification.countDocuments({ ...filter, isRead: false });
    res.json({ notifications, unreadCount });
  } catch (err) { next(err); }
});

router.patch('/:id/read', protect, async (req, res, next) => {
  try {
    await Notification.findByIdAndUpdate(req.params.id, { isRead: true });
    res.json({ message: 'Marked as read.' });
  } catch (err) { next(err); }
});

router.patch('/read-all', protect, async (req, res, next) => {
  try {
    const { branch } = req.query;
    const filter = { isRead: false };
    if (branch) filter.branch = branch;
    await Notification.updateMany(filter, { isRead: true });
    res.json({ message: 'All marked as read.' });
  } catch (err) { next(err); }
});

router.delete('/:id', protect, async (req, res, next) => {
  try {
    await Notification.findByIdAndDelete(req.params.id);
    res.json({ message: 'Notification deleted.' });
  } catch (err) { next(err); }
});

module.exports = router;
