import { Check, Leaf, Plus, ShoppingBag } from 'lucide-react'
import { useState } from 'react'
import { useCart } from '../context/useCart'

export default function FoodCard({ food, compact = false }) {
  const { addItem } = useCart()
  const [added, setAdded] = useState(false)
  const available = food.isAvailable !== false

  function addToCart() {
    addItem(food)
    setAdded(true)
    window.setTimeout(() => setAdded(false), 1200)
  }

  return (
    <article className={`group overflow-hidden rounded-[5px] bg-white ${compact ? '' : 'border border-ink/5'}`}>
      <div className="relative block overflow-hidden bg-mist"><img src={food.image} alt={food.title} loading="lazy" className={`w-full object-cover transition-transform duration-700 group-hover:scale-[1.04] ${compact ? 'aspect-[1.25]' : 'aspect-[1.12]'}`} onError={(event) => { event.currentTarget.src = 'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=1000&q=80' }} /><span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-paper/95 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-forest"><Leaf size={12} /> House favorite</span></div>
      <div className="p-4 md:p-5"><div className="flex items-start justify-between gap-3"><div><h3 className="font-display text-xl leading-tight md:text-[22px]">{food.title}</h3><p className="mt-2 line-clamp-2 text-xs leading-5 text-ink/60 md:text-sm">{food.description}</p></div><span className="shrink-0 pt-1 text-sm font-semibold">${Number(food.price).toFixed(2)}</span></div><button type="button" onClick={addToCart} disabled={!available} className="mt-5 inline-flex min-h-10 items-center gap-2 rounded-full bg-forest px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-ink disabled:cursor-not-allowed disabled:bg-ink/30">{!available ? <Leaf size={14} /> : added ? <Check size={14} /> : <Plus size={14} />}{!available ? 'Unavailable' : added ? 'Added' : 'Add to cart'}{available && !added && <ShoppingBag size={14} />}</button></div>
    </article>
  )
}