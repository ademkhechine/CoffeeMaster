const Ingredient = require('../models/Ingredient');
const Notification = require('../models/Notification');

const generateStockNotifications = async (ingredient) => {
  if (ingredient.isLowStock) {
    const existing = await Notification.findOne({
      type: 'low_stock', relatedId: ingredient._id, isRead: false
    });
    if (!existing) {
      await Notification.create({
        type: 'low_stock',
        title: 'Low Stock Alert',
        message: `${ingredient.name} is running low (${ingredient.quantity} ${ingredient.unit} remaining, min: ${ingredient.minQuantity} ${ingredient.unit})`,
        severity: 'warning',
        branch: ingredient.branch,
        relatedId: ingredient._id,
        relatedModel: 'Ingredient'
      });
    }
  }
  if (ingredient.isExpiringSoon) {
    const existing = await Notification.findOne({
      type: 'expiry', relatedId: ingredient._id, isRead: false
    });
    if (!existing) {
      await Notification.create({
        type: 'expiry',
        title: 'Expiry Warning',
        message: `${ingredient.name} expires on ${new Date(ingredient.expirationDate).toLocaleDateString()}`,
        severity: 'danger',
        branch: ingredient.branch,
        relatedId: ingredient._id,
        relatedModel: 'Ingredient'
      });
    }
  }
};

const runDailyStockScan = async () => {
  try {
    const ingredients = await Ingredient.find({ isActive: true });
    for (const ing of ingredients) {
      await generateStockNotifications(ing);
    }
    console.log('✅ Daily stock scan complete.');
  } catch (err) {
    console.error('Stock scan error:', err.message);
  }
};

module.exports = { generateStockNotifications, runDailyStockScan };
