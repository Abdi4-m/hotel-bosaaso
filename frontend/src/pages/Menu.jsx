import { useEffect, useState } from 'react'
import { ArrowRight, Search } from 'lucide-react'
import FoodCard from '../components/FoodCard'
import api from '../services/api'

const categories = ['All', 'Mains', 'Salads', 'Desserts', 'Breakfast']
const menuGroups = { Mains: ['Cheeseburger', 'Pizza', 'Salmon', 'Alfredo', 'Risotto', 'Fish and Chips', 'Tacos', 'Curry', 'Lobster', 'Ribs', 'Gnocchi', 'Steak', 'Linguine', 'Falafel', 'Pasta', 'Wrap'], Salads: ['Salad'], Desserts: ['Cake', 'Cheesecake', 'Tiramisu', 'Fruit Bowl', 'Crème Brûlée', 'Tart', 'Smoothie'], Breakfast: ['Pancake', 'Benedict', 'Toast'] }
function foodCategory(food) { const title = food.title.toLowerCase(); return Object.entries(menuGroups).find(([, terms]) => terms.some((term) => title.includes(term.toLowerCase())))?.[0] || 'Mains' }

export default function Menu() {
  const [foods, setFoods] = useState([])
  const [category, setCategory] = useState('All')
  const [search, setSearch] = useState('')
  const [error, setError] = useState('')
  useEffect(() => { api.get('/foods').then(({ data }) => setFoods(data)).catch(() => setError('The menu could not be loaded. Please try again in a moment.')) }, [])
  const visibleFoods = foods.filter((food) => (category === 'All' || foodCategory(food) === category) && `${food.title} ${food.description}`.toLowerCase().includes(search.toLowerCase()))

  return <div className="page-enter"><section className="bg-mist/70"><div className="mx-auto max-w-[1440px] px-5 pb-12 pt-14 md:px-10 md:pb-16 md:pt-20"><p className="eyebrow text-[10px] text-citrus">Fresh from our kitchen</p><div className="mt-3 flex flex-col justify-between gap-6 md:flex-row md:items-end"><div><h1 className="font-display text-5xl md:text-7xl">The menu</h1><p className="mt-4 max-w-xl text-sm leading-6 text-ink/60 md:text-base">Seasonal, generous, and best enjoyed around the table.</p></div><div className="relative w-full md:max-w-[280px]"><Search size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-ink/45" /><input aria-label="Search menu" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Find something good" className="w-full rounded-full border border-ink/15 bg-white py-3 pl-11 pr-4 text-sm outline-none transition focus:border-forest" /></div></div></div></section>
    <section className="mx-auto max-w-[1440px] px-5 py-10 md:px-10 md:py-14"><div className="mb-8 flex flex-wrap gap-2" aria-label="Menu categories">{categories.map((item) => <button key={item} onClick={() => setCategory(item)} className={`rounded-full px-5 py-2.5 text-sm font-semibold transition-colors ${category === item ? 'bg-forest text-white' : 'border border-ink/15 bg-white text-ink/70 hover:border-forest hover:text-forest'}`}>{item}</button>)}</div>
      {error ? <p role="alert" className="py-16 text-center text-sm text-ink/60">{error}</p> : <><p className="mb-5 text-xs text-ink/45">{visibleFoods.length} {visibleFoods.length === 1 ? 'dish' : 'dishes'}</p><div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{visibleFoods.map((food) => <FoodCard key={food.id} food={food} />)}</div>{!visibleFoods.length && <div className="py-20 text-center"><p className="font-display text-3xl">Nothing on this page just yet.</p><button onClick={() => { setCategory('All'); setSearch('') }} className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-forest">Show everything <ArrowRight size={15} /></button></div>}</>}
    </section></div>
}