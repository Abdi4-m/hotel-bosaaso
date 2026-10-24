import { Printer, X } from 'lucide-react'

const formatPrice = (price) => `$${Number(price).toFixed(2)}`
const formatDate = (date) => new Intl.DateTimeFormat('en', { dateStyle: 'long', timeZone: 'UTC' }).format(new Date(date))

export default function BookingReceiptModal({ booking, onClose }) {
  const reference = booking.id.slice(-8).toUpperCase()
  const nights = Math.max(0, Math.round((new Date(booking.checkOut) - new Date(booking.checkIn)) / 86400000))
  const guests = booking.guests || 1
  const nightlyRate = Number(booking.room.pricePerNight ?? booking.totalPrice / Math.max(nights, 1))

  return <div className="receipt-backdrop fixed inset-0 z-50 flex items-end justify-center overflow-y-auto bg-ink/50 p-0 backdrop-blur-sm sm:items-center sm:p-5" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose?.() }}>
    <section className="receipt-dialog max-h-[94vh] w-full max-w-2xl overflow-y-auto rounded-t-[8px] bg-white p-5 shadow-soft sm:rounded-[6px] sm:p-8" role="dialog" aria-modal="true" aria-labelledby="booking-receipt-title">
      <div className="receipt-actions mb-5 flex justify-end gap-2"><button type="button" onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-full bg-forest px-4 py-2.5 text-xs font-semibold text-white hover:bg-ink"><Printer size={15} /> Print / save receipt</button><button type="button" onClick={onClose} aria-label="Close receipt" className="grid h-10 w-10 place-items-center rounded-full border border-ink/15"><X size={17} /></button></div>
      <div className="receipt-print-sheet border border-ink/10 p-5 sm:p-8">
        <header className="flex items-start justify-between gap-4 border-b-2 border-ink pb-5">
          <div><div className="flex items-center gap-2"><span className="grid h-9 w-9 place-items-center rounded-full bg-forest text-[11px] font-bold text-white">HB</span><h2 id="booking-receipt-title" className="font-display text-2xl">Hotel Bosaso</h2></div><p className="mt-2 text-[10px] uppercase tracking-wider text-ink/50">Rooms and dining · Hudson Valley, NY</p></div>
          <div className="text-right"><p className="text-[10px] font-semibold uppercase tracking-wider text-ink/45">Booking receipt</p><p className="mt-1 font-mono text-sm font-semibold">#{reference}</p></div>
        </header>
        <div className="grid gap-5 border-b border-ink/15 py-5 text-xs sm:grid-cols-2">
          <div><p className="font-semibold uppercase tracking-wider text-ink/45">Guest</p><p className="mt-2 font-semibold">{booking.user?.name || 'Guest'}</p><p className="mt-1">{booking.user?.email}</p></div>
          <div><p className="font-semibold uppercase tracking-wider text-ink/45">Room</p><p className="mt-2 font-semibold">Room {booking.room.roomNumber} · {booking.room.name}</p><p className="mt-1">{booking.room.type.replaceAll('_', ' ')}</p></div>
          <div><p className="font-semibold uppercase tracking-wider text-ink/45">Guests</p><p className="mt-2">{guests} {guests === 1 ? 'guest' : 'guests'}</p></div>
          <div><p className="font-semibold uppercase tracking-wider text-ink/45">Check-in</p><p className="mt-2">{formatDate(booking.checkIn)}</p></div>
          <div><p className="font-semibold uppercase tracking-wider text-ink/45">Check-out</p><p className="mt-2">{formatDate(booking.checkOut)}</p></div>
        </div>
        <div className="ml-auto mt-5 max-w-64 space-y-3 text-xs">
          <div className="flex justify-between"><span>Length of stay</span><span>{nights} {nights === 1 ? 'night' : 'nights'}</span></div>
          <div className="flex justify-between"><span>Room rate · {nights} {nights === 1 ? 'night' : 'nights'}</span><span>{formatPrice(nightlyRate)} × {nights}</span></div>
          <div className="flex justify-between"><span>Payment status</span><span>{booking.paymentStatus.replaceAll('_', ' ')}</span></div>
          <div className="flex justify-between"><span>Booking status</span><span>{booking.status.replaceAll('_', ' ')}</span></div>
          <div className="flex justify-between border-t border-ink pt-3 text-sm font-bold"><span>Total</span><span>{formatPrice(booking.totalPrice)}</span></div>
        </div>
        <footer className="mt-8 border-t border-ink/15 pt-4 text-center text-[10px] leading-5 text-ink/50">Thank you for choosing Hotel Bosaso.<br />This receipt confirms your room booking.</footer>
      </div>
    </section>
  </div>
}
