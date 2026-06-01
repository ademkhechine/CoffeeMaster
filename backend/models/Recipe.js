const mongoose = require('mongoose');

const recipeIngredientSchema = new mongoose.Schema({
  ingredient: { type: mongoose.Schema.Types.ObjectId, ref: 'Ingredient', required: true },
  quantity: { type: Number, required: true, min: 0 },
});

const recipeSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true, unique: true },
  ingredients: [recipeIngredientSchema],
  instructions: { type: String, default: '' },
  yield: { type: Number, default: 1 }, // number of servings
}, { timestamps: true });

module.exports = mongoose.model('Recipe', recipeSchema);
