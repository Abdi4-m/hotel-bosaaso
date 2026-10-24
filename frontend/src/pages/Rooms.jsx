import { useEffect, useMemo, useState } from 'react'
import { Bath, BedDouble, CalendarDays, SlidersHorizontal } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import RoomBookingModal from '../components/RoomBookingModal'
import RoomCard from '../components/RoomCard'
import { useAuth } from '../context/useAuth'
import api from '../services/api'

const TODAY = new Date().toISOString().slice(0, 10)

export default function Rooms() {
  const navigate = useNavigate()
  const { isLoggedIn } = useAuth()
  const [rooms, setRooms] = useState([])
  const [checkIn, setCheckIn] = useState('')
  const [checkOut, setCheckOut] = useState('')
  const [bathroom, setBathroom] = useState('all')
  const [family, setFamily] = useState('all')
  const [availability, setAvailability] = useState('all')
  const [minPrice, setMinPrice] = useState(0)
  const [maxPrice, setMaxPrice] = useState(300)
  const [selectedRoom, setSelectedRoom] = useState(null)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    const params = checkIn && checkOut ? { checkIn, checkOut } : {}
    api.get('/rooms', { params }).then(({ data }) => {
      if (active) {
        setRooms(data)
        setMaxPrice(Math.ceil(Math.max(0, ...data.map((room) => Number(room.pricePerNight))) / 25) * 25)
      }
    }).catch((requestError) => {
      if (active) setError(requestError.response?.data?.error || 'Rooms could not be loaded.')
    }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [checkIn, checkOut])

  const highestPrice = Math.max(300, ...rooms.map((room) => Number(room.pricePerNight ?? room.price)))
  const filteredRooms = useMemo(() => rooms.filter((room) => {
    const available = room.isAvailableForDates ?? !room.isBooked
    const bathroomMatch = bathroom === 'all' || (bathroom === 'private' ? room.hasEnsuiteBathroom : !room.hasEnsuiteBathroom)
    const familyMatch = family === 'all' || (family === 'family' ? room.type === 'FAMILY' : room.type !== 'FAMILY')
    const availabilityMatch = availability === 'all' || (availability === 'available' ? available : !available)
    const price = Number(room.pricePerNight ?? room.price)
    const priceMatch = price >= minPrice && price <= maxPrice
    return bathroomMatch && familyMatch && availabilityMatch && priceMatch
  }), [rooms, bathroom, family, availability, minPrice, maxPrice])

  function startBooking(room) {
    if (!isLoggedIn) {
      navigate('/signin', { state: { from: { pathname: '/rooms' } } })
      return
    }
    setSelectedRoom(room)
  }

  function bookingComplete(booking) {
    setSelectedRoom(null)
    setNotice(`Room ${booking.room.roomNumber} is reserved. Find your booking in My account.`)
    setAvailability('available')
    setCheckIn('')
    setCheckOut('')
  }

  return <div className="page-enter">
    <section className="bg-mist/70"><div className="mx-auto max-w-[1440px] px-5 pb-10 pt-12 md:px-10 md:pb-12 md:pt-16"><p className="eyebrow text-[10px] text-citrus">A good night's rest</p><div className="mt-3 flex flex-col justify-between gap-6 sm:flex-row sm:items-end"><div><h1 className="font-display text-5xl md:text-7xl">Rooms to settle into.</h1><p className="mt-4 max-w-xl text-sm leading-6 text-ink/60 md:text-base">Find a room for your dates, then make yourself at home.</p></div><span className="inline-flex items-center gap-2 text-sm text-ink/55"><BedDouble size={17} /> {rooms.length} rooms in the house</span></div>
      <div className="mt-7 grid gap-3 rounded-[5px] border border-ink/10 bg-white p-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end md:max-w-2xl"><label className="field-label">Check-in<input className="field-input" type="date" min={TODAY} value={checkIn} onChange={(event) => { setLoading(true); setCheckIn(event.target.value) }} /></label><label className="field-label">Check-out<input className="field-input" type="date" min={checkIn || TODAY} value={checkOut} onChange={(event) => { setLoading(true); setCheckOut(event.target.value) }} /></label><CalendarDays size={20} className="mb-3 hidden text-forest sm:block" /></div>
    </div></section>
    <section className="mx-auto max-w-[1440px] px-5 py-9 md:px-10 md:py-12">
      {notice && <p role="status" className="mb-5 rounded-[4px] bg-mist px-4 py-3 text-sm text-forest">{notice}</p>}{error && <p role="alert" className="mb-5 rounded-[4px] bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      <div className="mb-8 grid gap-5 rounded-[5px] border border-ink/10 bg-white p-4 md:grid-cols-2 xl:grid-cols-4 md:p-5">
        <label className="field-label"><span className="mb-1 inline-flex items-center gap-2"><Bath size={14} /> Bathroom</span><select className="field-input" value={bathroom} onChange={(event) => setBathroom(event.target.value)}><option value="all">Private or shared</option><option value="private">Private ensuite</option><option value="shared">Shared outside</option></select></label>
        <label className="field-label"><span className="mb-1 inline-flex items-center gap-2"><BedDouble size={14} /> Room size</span><select className="field-input" value={family} onChange={(event) => setFamily(event.target.value)}><option value="all">All room types</option><option value="family">Family rooms</option><option value="nonfamily">Single / non-family</option></select></label>
        <label className="field-label">Availability<select className="field-input" value={availability} onChange={(event) => setAvailability(event.target.value)}><option value="all">All rooms</option><option value="available">Available for dates</option><option value="booked">Occupied / already booked</option></select></label>
        <div className="field-label"><span className="flex items-center justify-between"><span className="inline-flex items-center gap-2"><SlidersHorizontal size={14} /> Nightly price</span><span className="font-semibold text-ink">${minPrice}–${maxPrice}</span></span><label className="mt-3 block text-[10px] font-normal text-ink/50">Minimum<input className="mt-1 w-full accent-forest" type="range" min="0" max={highestPrice} step="5" value={Math.min(minPrice, highestPrice)} onChange={(event) => setMinPrice(Math.min(Number(event.target.value), maxPrice))} aria-label="Minimum nightly price" /></label><label className="mt-2 block text-[10px] font-normal text-ink/50">Maximum<input className="mt-1 w-full accent-forest" type="range" min="0" max={highestPrice} step="5" value={Math.min(maxPrice, highestPrice)} onChange={(event) => setMaxPrice(Math.max(Number(event.target.value), minPrice))} aria-label="Maximum nightly price" /></label></div>
      </div>
      <p className="mb-5 text-xs text-ink/45">{filteredRooms.length} {filteredRooms.length === 1 ? 'room' : 'rooms'} match your selection</p>
      {loading ? <div className="grid min-h-48 place-items-center text-forest"><span className="animate-pulse text-sm">Finding your room...</span></div> : <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{filteredRooms.map((room) => <RoomCard key={room.id} room={room} availability={room.isAvailableForDates ?? !room.isBooked} onBook={startBooking} />)}</div>}
      {!loading && filteredRooms.length === 0 && <div className="py-16 text-center text-sm text-ink/55">No rooms match those dates and filters.</div>}
    </section>
    {selectedRoom && <RoomBookingModal room={selectedRoom} initialCheckIn={checkIn} initialCheckOut={checkOut} onClose={() => setSelectedRoom(null)} onBooked={bookingComplete} />}
  </div>
}