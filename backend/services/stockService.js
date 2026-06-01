const Recipe = require('../models/Recipe');
const Ingredient = require('../models/Ingredient');
const { generateStockNotifications } = require('./notificationService');

/**
 * Deduct ingredients from stock based on ordered items.
 * Each item maps to a Recipe; quantities are deducted proportionally.
 */
const deductIngredients = async (items) => {
  for (const item of items) {
    try {
      const recipe = await Recipe.findOne({ product: item.product }).populate('ingredients.ingredient');
      if (!recipe) continue;
      for (const ri of recipe.ingredients) {
        const needed = ri.quantity * item.quantity;
        const ingredient = await Ingredient.findById(ri.ingredient._id || ri.ingredient);
        if (!ingredient) continue;
        ingredient.quantity = Math.max(0, ingredient.quantity - needed);
        ingredient.movements.push({
          type: 'out',
          quantity: needed,
          note: `Auto-deducted from order`,
          date: new Date()
        });
        await ingredient.save();
        await generateStockNotifications(ingredient);
      }
    } catch (err) {
      console.error(`Stock deduction error for product ${item.product}:`, err.message);
    }
  }
};

module.exports = { deductIngredients };
