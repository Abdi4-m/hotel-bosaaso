import { useMemo, useState } from 'react'
import { CalendarDays, LoaderCircle, X } from 'lucide-react'
import useToast from '../context/useToast'
import api from '../services/api'

const TODAY = new Date().toISOString().slice(0, 10)

export default function RoomBookingModal({ room, initialCheckIn, initialCheckOut, onClose, onBooked }) {
  const [checkIn, setCheckIn] = useState(initialCheckIn || TODAY)
  const [checkOut, setCheckOut] = useState(initialCheckOut || '')
  const [guests, setGuests] = useState(1)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const toast = useToast()
  const nights = useMemo(() => {
    if (!checkIn || !checkOut) return 0
    return Math.max(0, Math.round((new Date(`${checkOut}T00:00:00Z`) - new Date(`${checkIn}T00:00:00Z`)) / 86400000))
  }, [checkIn, checkOut])
  const total = Number((Number(room.pricePerNight ?? room.price) * nights).toFixed(2))

  async function submit(event) {
    event.preventDefault()
    if (checkIn < TODAY || !checkOut || checkOut <= checkIn || !Number.isSafeInteger(guests) || guests < 1 || guests > 99) {
      setError('Choose valid dates and a guest count between 1 and 99.')
      return
    }
    setSubmitting(true)
    setError('')
    try {
      const { data } = await api.post('/bookings', { roomId: room.id, checkIn, checkOut, guests })
      toast.success('Booking created successfully.')
      onBooked(data)
    } catch (requestError) {
      const message = requestError.response?.data?.error || 'This room could not be booked for those dates.'
      setError(message)
      toast.error(message)
    } finally {
      setSubmitting(false)
    }
  }

  return <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/50 p-0 backdrop-blur-sm sm:items-center sm:p-5" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
    <section role="dialog" aria-modal="true" aria-labelledby="booking-title" className="w-full max-w-lg rounded-t-[8px] bg-paper p-5 shadow-soft sm:rounded-[6px] sm:p-7">
      <div className="flex items-start justify-between"><div><p className="eyebrow text-[10px] text-citrus">Your stay</p><h2 id="booking-title" className="font-display mt-2 text-3xl">{room.name}</h2><p className="mt-1 text-sm text-ink/55">Room {room.roomNumber} · ${Number(room.pricePerNight ?? room.price).toFixed(2)} / night</p></div><button onClick={onClose} aria-label="Close booking form" className="grid h-9 w-9 place-items-center rounded-full border border-ink/15"><X size={17} /></button></div>
      <form onSubmit={submit} className="mt-7 space-y-5">{error && <p role="alert" className="rounded-[4px] bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}<div className="grid gap-4 sm:grid-cols-2"><label className="field-label">Check-in<input className="field-input" type="date" min={TODAY} value={checkIn} onChange={(event) => setCheckIn(event.target.value)} required /></label><label className="field-label">Check-out<input className="field-input" type="date" min={checkIn || TODAY} value={checkOut} onChange={(event) => setCheckOut(event.target.value)} required /></label><label className="field-label sm:col-span-2">Guests<input className="field-input" type="number" min="1" max="99" step="1" value={Number.isNaN(guests) ? '' : guests} onChange={(event) => setGuests(event.target.valueAsNumber)} required /></label></div>
        <div className="flex items-center justify-between rounded-[4px] bg-mist px-4 py-3 text-sm"><span className="inline-flex items-center gap-2 text-ink/65"><CalendarDays size={16} />{nights} {nights === 1 ? 'night' : 'nights'}</span><span className="font-semibold">${total.toFixed(2)} total</span></div>
        <p className="text-xs leading-5 text-ink/50">Your reservation is confirmed immediately. Payment is settled at the house.</p><button disabled={submitting || nights < 1} className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-forest px-5 py-3.5 text-sm font-semibold text-white hover:bg-ink disabled:cursor-not-allowed disabled:opacity-50">{submitting ? <><LoaderCircle size={16} className="animate-spin" /> Booking</> : 'Confirm room booking'}</button>
      </form>
    </section>
  </div>
}