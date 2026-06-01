import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getProducts, getIngredients, getRecipeByProduct, saveRecipe } from '../../api'
import { formatCurrency, CATEGORY_EMOJIS } from '../../utils'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'

export default function Recipes() {
  const queryClient = useQueryClient()
  const [selectedProduct, setSelectedProduct] = useState(null)
  
  // Recipe Form States
  const [recipeIngredients, setRecipeIngredients] = useState([])
  const [instructions, setInstructions] = useState('')
  const [servingYield, setServingYield] = useState(1)

  // Current Input States
  const [selectedIng, setSelectedIng] = useState('')
  const [ingQty, setIngQty] = useState('')

  // Queries
  const { data: productsRes, isLoading: productsLoading } = useQuery({
    queryKey: ['products'],
    queryFn: () => getProducts()
  })

  const { data: ingredientsRes } = useQuery({
    queryKey: ['ingredients'],
    queryFn: () => getIngredients()
  })

  const { data: activeRecipeRes, refetch: refetchRecipe } = useQuery({
    queryKey: ['recipe', selectedProduct?._id],
    queryFn: () => getRecipeByProduct(selectedProduct._id),
    enabled: !!selectedProduct,
    onSuccess: (res) => {
      if (res.data) {
        setRecipeIngredients(res.data.ingredients.map(ri => ({
          ingredient: ri.ingredient,
          quantity: ri.quantity
        })))
        setInstructions(res.data.instructions || '')
        setServingYield(res.data.yield || 1)
      } else {
        resetForm()
      }
    },
    onError: () => {
      resetForm()
    }
  })

  const products = productsRes?.data || []
  const ingredients = ingredientsRes?.data || []

  const resetForm = () => {
    setRecipeIngredients([])
    setInstructions('')
    setServingYield(1)
    setSelectedIng('')
    setIngQty('')
  }

  // Mutations
  const recipeMutation = useMutation({
    mutationFn: saveRecipe,
    onSuccess: () => {
      toast.success('Recipe saved successfully!')
      queryClient.invalidateQueries({ queryKey: ['recipe', selectedProduct?._id] })
    }
  })

  const addIngredientToRecipe = () => {
    if (!selectedIng || !ingQty || ingQty <= 0) return toast.error('Please select ingredient and enter quantity')
    const ingObj = ingredients.find(i => i._id === selectedIng)
    if (!ingObj) return

    // Check duplicate
    if (recipeIngredients.some(ri => ri.ingredient._id === selectedIng || ri.ingredient === selectedIng)) {
      return toast.error('Ingredient already added to recipe')
    }

    setRecipeIngredients([...recipeIngredients, { ingredient: ingObj, quantity: Number(ingQty) }])
    setSelectedIng('')
    setIngQty('')
  }

  const removeIngredientFromRecipe = (id) => {
    setRecipeIngredients(recipeIngredients.filter(ri => ri.ingredient._id !== id && ri.ingredient !== id))
  }

  const handleSave = (e) => {
    e.preventDefault()
    if (!selectedProduct) return toast.error('Please select a product first')
    if (recipeIngredients.length === 0) return toast.error('Please add at least one ingredient')

    recipeMutation.mutate({
      product: selectedProduct._id,
      ingredients: recipeIngredients.map(ri => ({
        ingredient: ri.ingredient._id || ri.ingredient,
        quantity: ri.quantity
      })),
      instructions,
      yield: Number(servingYield)
    })
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fade-in">
      {/* Products selection */}
      <div className="lg:col-span-4 card h-[calc(100vh-10rem)] flex flex-col p-4">
        <h3 className="font-bold text-base text-coffee-950 dark:text-coffee-100 mb-3">Select Product</h3>
        {productsLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <span className="text-xl animate-pulse-soft">☕</span>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {products.map(p => (
              <button
                key={p._id}
                onClick={() => { setSelectedProduct(p); resetForm(); }}
                className={`w-full text-left p-3 rounded-xl border flex items-center gap-3 transition-all ${
                  selectedProduct?._id === p._id
                    ? 'bg-coffee-800 text-white border-transparent shadow-md'
                    : 'border-coffee-100 dark:border-coffee-800 hover:bg-coffee-50 dark:hover:bg-coffee-900/50'
                }`}
              >
                <span className="text-2xl">{CATEGORY_EMOJIS[p.category] || '☕'}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-xs truncate">{p.name}</p>
                  <p className="text-[10px] opacity-75">{p.category} · {formatCurrency(p.price)}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Recipe Builder */}
      <div className="lg:col-span-8 card h-[calc(100vh-10rem)] flex flex-col p-4 border border-coffee-200">
        {selectedProduct ? (
          <form onSubmit={handleSave} className="flex flex-col h-full space-y-4">
            <div className="flex justify-between items-center border-b border-coffee-100 dark:border-coffee-800 pb-3">
              <div>
                <h2 className="font-bold text-base text-coffee-950 dark:text-coffee-50">
                  📖 Recipe Builder: {selectedProduct.name}
                </h2>
                <p className="text-xs text-coffee-500">Configure ingredient deduction rates</p>
              </div>
              <button type="submit" disabled={recipeMutation.isPending} className="btn-primary py-2">
                Save Recipe
              </button>
            </div>

            {/* Selector inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end bg-coffee-50 dark:bg-coffee-900/40 p-3 rounded-xl border border-coffee-100 dark:border-coffee-800">
              <div className="sm:col-span-6">
                <label className="label text-[10px]">Select Ingredient</label>
                <select value={selectedIng} onChange={e => setSelectedIng(e.target.value)} className="input text-xs py-1.5">
                  <option value="">-- Choose Ingredient --</option>
                  {ingredients.map(i => <option key={i._id} value={i._id}>{i.name} ({i.unit})</option>)}
                </select>
              </div>
              <div className="sm:col-span-4">
                <label className="label text-[10px]">Qty used</label>
                <input
                  type="number"
                  step="any"
                  value={ingQty}
                  onChange={e => setIngQty(e.target.value)}
                  className="input text-xs py-1.5"
                  placeholder="e.g. 20"
                />
              </div>
              <div className="sm:col-span-2">
                <button type="button" onClick={addIngredientToRecipe} className="btn-primary w-full text-xs py-2">
                  Add +
                </button>
              </div>
            </div>

            {/* List of recipe ingredients */}
            <div className="flex-1 overflow-y-auto space-y-2">
              <p className="text-xs font-semibold text-coffee-700 dark:text-coffee-300">Recipe Ingredients</p>
              {recipeIngredients.length === 0 ? (
                <div className="py-8 text-center text-coffee-400 text-xs border border-dashed border-coffee-200 dark:border-coffee-800 rounded-xl">
                  No ingredients configured. Add some above.
                </div>
              ) : recipeIngredients.map(ri => (
                <div key={ri.ingredient._id || ri.ingredient} className="flex justify-between items-center p-3 border border-coffee-100 dark:border-coffee-800 rounded-xl bg-white dark:bg-coffee-950 shadow-sm">
                  <span className="text-xs font-semibold">{ri.ingredient.name}</span>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs text-coffee-600">{ri.quantity} {ri.ingredient.unit}</span>
                    <button type="button" onClick={() => removeIngredientFromRecipe(ri.ingredient._id || ri.ingredient)} className="text-red-500 hover:text-red-700 text-xs">Remove</button>
                  </div>
                </div>
              ))}
            </div>

            {/* Text details */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-coffee-100 dark:border-coffee-800 pt-3">
              <div className="sm:col-span-1">
                <label className="label">Servings Yield</label>
                <input type="number" min="1" value={servingYield} onChange={e => setServingYield(e.target.value)} className="input" />
              </div>
              <div className="sm:col-span-2">
                <label className="label">Preparation Steps / Instructions</label>
                <input type="text" value={instructions} onChange={e => setInstructions(e.target.value)} className="input" placeholder="e.g. Grind beans, brew espresso shot, froth milk..." />
              </div>
            </div>
          </form>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-coffee-400 py-12">
            <span className="text-5xl">📖</span>
            <p className="mt-2 text-sm">Please select a product on the left to configure recipe</p>
          </div>
        )}
      </div>
    </div>
  )
}
