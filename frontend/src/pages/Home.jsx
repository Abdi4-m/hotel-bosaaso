import { useEffect, useState } from 'react'
import { ArrowDown, ArrowRight, ArrowUpRight, MoveRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import FoodCard from '../components/FoodCard'
import RoomCard from '../components/RoomCard'
import api from '../services/api'

const heroImage = 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=2200&q=90'

export default function Home() {
  const [foods, setFoods] = useState([])
  const [rooms, setRooms] = useState([])
  const [error, setError] = useState('')
  useEffect(() => {
    let active = true
    Promise.all([api.get('/foods'), api.get('/rooms')])
      .then(([foodResponse, roomResponse]) => {
        if (!active) return
        if (!Array.isArray(foodResponse.data) || !Array.isArray(roomResponse.data)) {
          throw new Error('The home page data response was invalid.')
        }
        setFoods(foodResponse.data.slice(0, 3))
        setRooms(roomResponse.data.filter((room) => room && !room.isBooked).slice(0, 3))
      })
      .catch((requestError) => {
        if (active) setError(requestError.response?.data?.error || 'The latest menu and room listings could not be loaded.')
      })
    return () => { active = false }
  }, [])

  return <div className="page-enter">
    <section className="relative flex min-h-[620px] items-end overflow-hidden bg-ink md:min-h-[680px]"><img src={heroImage} alt="A warmly lit dining room set for dinner" className="absolute inset-0 h-full w-full object-cover object-center" /><div className="absolute inset-0 bg-ink/50" /><div className="relative mx-auto flex w-full max-w-[1440px] items-end justify-between gap-8 px-5 pb-12 pt-28 text-white md:px-10 md:pb-16"><div className="max-w-3xl"><p className="eyebrow reveal-up text-[10px] text-white/75 md:text-xs">Bosaso · Somalia</p><h1 className="font-display reveal-up delay-1 mt-5 text-5xl leading-[.98] md:text-7xl lg:text-[92px]">Rooms for the<br />good part.</h1><p className="reveal-up delay-2 mt-6 max-w-md text-sm leading-6 text-white/80 md:text-base">A welcoming hotel with a generous table, thoughtful rooms, and nowhere else you need to be.</p><div className="reveal-up delay-3 mt-8 flex flex-wrap gap-3"><Link to="/rooms" className="inline-flex items-center gap-3 rounded-full bg-paper px-6 py-3.5 text-sm font-semibold text-ink transition-colors hover:bg-mist">Find your room <ArrowUpRight size={16} /></Link><Link to="/menu" className="inline-flex items-center gap-3 rounded-full border border-white/50 px-6 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-white/10">See the menu <ArrowUpRight size={16} /></Link></div></div><a href="#welcome" className="mb-1 hidden h-12 w-12 shrink-0 place-items-center rounded-full border border-white/45 text-white transition-transform hover:translate-y-1 md:grid" aria-label="Scroll to discover"><ArrowDown size={19} /></a></div><div className="absolute right-5 top-7 hidden text-right text-[10px] uppercase tracking-[.14em] text-white/70 md:block md:right-10">Rooms · Restaurant · A slower pace</div></section>
    {error && <p role="alert" className="mx-auto mt-5 max-w-[1440px] px-5 text-sm text-red-700 md:px-10">{error}</p>}
    <section id="welcome" className="mx-auto grid max-w-[1440px] gap-8 px-5 py-16 md:grid-cols-[.7fr_1.3fr] md:gap-20 md:px-10 md:py-24"><div><p className="eyebrow text-[10px] text-citrus">A house with a little heart</p><h2 className="font-display mt-4 max-w-sm text-4xl leading-tight md:text-5xl">Good things happen when you book a room.</h2></div><div className="flex flex-col justify-end"><p className="max-w-2xl text-base leading-7 text-ink/65 md:text-lg md:leading-8">Come for supper, book a room, and wake up to the quiet. Hotel Bosaso is a place made for the in-between moments that turn into the ones you remember.</p><Link to="/contact" className="mt-7 inline-flex w-fit items-center gap-2 border-b border-forest/30 pb-1.5 text-sm font-semibold text-forest hover:text-citrus">Come say hello <MoveRight size={16} /></Link></div></section>
    <section className="bg-mist/70"><div className="mx-auto max-w-[1440px] px-5 py-16 md:px-10 md:py-20"><div className="mb-8 flex items-end justify-between gap-5 md:mb-10"><div><p className="eyebrow text-[10px] text-citrus">At the table</p><h2 className="font-display mt-2 text-4xl md:text-5xl">A few good things.</h2></div><Link to="/menu" className="hidden items-center gap-2 pb-1 text-sm font-semibold text-forest hover:text-citrus sm:inline-flex">The whole menu <ArrowRight size={16} /></Link></div><div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{foods.map((food) => <FoodCard key={food.id} food={food} compact />)}</div><Link to="/menu" className="mt-7 inline-flex items-center gap-2 text-sm font-semibold text-forest sm:hidden">The whole menu <ArrowRight size={16} /></Link></div></section>
    <section className="mx-auto max-w-[1440px] px-5 py-16 md:px-10 md:py-20"><div className="mb-8 flex items-end justify-between gap-5 md:mb-10"><div><p className="eyebrow text-[10px] text-citrus">Rooms for the night</p><h2 className="font-display mt-2 text-4xl md:text-5xl">Make yourself at home.</h2></div><Link to="/rooms" className="hidden items-center gap-2 pb-1 text-sm font-semibold text-forest hover:text-citrus sm:inline-flex">Explore all rooms <ArrowRight size={16} /></Link></div><div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{rooms.map((room) => <RoomCard key={room.id} room={room} />)}</div><Link to="/rooms" className="mt-7 inline-flex items-center gap-2 text-sm font-semibold text-forest sm:hidden">Explore all rooms <ArrowRight size={16} /></Link>{!rooms.length && <p className="text-sm text-ink/50">Our rooms are taking a moment to arrive. Please check back shortly.</p>}</section>
    <section className="bg-forest text-white"><div className="mx-auto flex max-w-[1440px] flex-col items-start justify-between gap-8 px-5 py-14 md:flex-row md:items-center md:px-10 md:py-16"><div><p className="eyebrow text-[10px] text-white/55">Your table is waiting</p><h2 className="font-display mt-3 text-4xl md:text-5xl">Come hungry. Leave slower.</h2></div><Link to="/contact?subject=Plan%20a%20visit" className="inline-flex items-center gap-3 rounded-full bg-paper px-6 py-3.5 text-sm font-semibold text-ink transition-colors hover:bg-white">Plan a visit <ArrowUpRight size={16} /></Link></div></section>
  </div>
}