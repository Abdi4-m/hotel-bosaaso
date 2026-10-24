import { useEffect, useState } from 'react'
import { CalendarDays, LoaderCircle, ReceiptText, RotateCcw, Trash2 } from 'lucide-react'
import BookingReceiptModal from '../components/BookingReceiptModal'
import ReceiptModal from '../components/ReceiptModal'
import useToast from '../context/useToast'
import api from '../services/api'

const money = (value) => `$${Number(value).toFixed(2)}`
const dateTime = (value) => new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
const dateOnly = (value) => new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(value))

export default function Account() {
  const [orders, setOrders] = useState([])
  const [bookings, setBookings] = useState([])
  const [updatingBookings, setUpdatingBookings] = useState(() => new Set())
  const [activeTab, setActiveTab] = useState('orders')
  const [receipt, setReceipt] = useState(null)
  const [bookingReceipt, setBookingReceipt] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const toast = useToast()

  useEffect(() => {
    let active = true
    Promise.all([api.get('/orders/my'), api.get('/bookings/my-bookings')]).then(([orderResponse, bookingResponse]) => {
      if (!active) return
      setOrders(orderResponse.data)
      setBookings(bookingResponse.data)
    }).catch((requestError) => {
      if (active) setError(requestError.response?.data?.error || 'Your account history could not be loaded.')
    }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  async function toggleBookingStatus(booking) {
    if (updatingBookings.has(booking.id)) return
    const status = booking.status === 'CONFIRMED' ? 'CANCELLED' : 'CONFIRMED'
    if (status === 'CANCELLED' && !window.confirm(`Cancel your booking for ${booking.room.name}?`)) return

    setUpdatingBookings((current) => new Set(current).add(booking.id))
    setBookings((current) => current.map((item) => item.id === booking.id ? { ...item, status } : item))
    try {
      const { data } = await api.patch(`/bookings/${booking.id}/status`, { status })
      setBookings((current) => current.map((item) => item.id === data.id ? data : item))
      toast.success(status === 'CANCELLED' ? 'Booking cancelled.' : 'Booking confirmed.')
    } catch (requestError) {
      setBookings((current) => current.map((item) => item.id === booking.id ? { ...item, status: booking.status } : item))
      const message = requestError.response?.data?.error || 'The booking status could not be updated.'
      setError(message)
      toast.error(message)
    } finally {
      setUpdatingBookings((current) => {
        const next = new Set(current)
        next.delete(booking.id)
        return next
      })
    }
  }

  async function deleteOrder(order) {
    if (order.status !== 'PENDING') return
    if (!window.confirm('Are you sure you want to delete this order? This action will permanently remove the record.')) return
    try {
      await api.delete(`/orders/${order.id}`)
      setOrders((current) => current.filter((item) => item.id !== order.id))
      toast.success('Order deleted.')
    } catch (requestError) {
      const message = requestError.response?.data?.error || 'The order could not be deleted.'
      setError(message)
      toast.error(message)
    }
  }

  return <div className="page-enter min-h-[70vh] bg-paper">
    <section className="bg-mist/70"><div className="mx-auto max-w-[1200px] px-5 pb-10 pt-12 md:px-10 md:pb-12 md:pt-16"><p className="eyebrow text-[10px] text-citrus">Rooms and suppers</p><h1 className="font-display mt-2 text-5xl md:text-6xl">My account</h1></div></section>
    <section className="mx-auto max-w-[1200px] px-5 py-9 md:px-10 md:py-12">
      {error && <p role="alert" className="mb-5 rounded-[4px] bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      <div className="mb-7 flex gap-1 rounded-full border border-ink/10 bg-white p-1 sm:w-fit">
        <button onClick={() => setActiveTab('orders')} className={`rounded-full px-5 py-2.5 text-sm font-semibold ${activeTab === 'orders' ? 'bg-forest text-white' : 'text-ink/60'}`}>Food orders <span className="ml-1 opacity-70">{orders.length}</span></button>
        <button onClick={() => setActiveTab('bookings')} className={`rounded-full px-5 py-2.5 text-sm font-semibold ${activeTab === 'bookings' ? 'bg-forest text-white' : 'text-ink/60'}`}>My bookings <span className="ml-1 opacity-70">{bookings.length}</span></button>
      </div>
      {loading ? <div className="grid min-h-64 place-items-center text-forest"><LoaderCircle className="animate-spin" /></div> : activeTab === 'orders' ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {orders.map((order) => <article key={order.id} className="rounded-[5px] border border-ink/10 bg-white p-5 md:p-6">
            <div className="flex items-start justify-between gap-4"><div><p className="eyebrow text-[10px] text-ink/45">Order #{order.id.slice(-8).toUpperCase()}</p><p className="mt-2 text-xs text-ink/55">{dateTime(order.orderDate || order.createdAt)}</p></div><span className="rounded-full bg-mist px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-forest">{order.status.replaceAll('_', ' ')}</span></div>
            <div className="mt-4 divide-y divide-ink/10 border-y border-ink/10">{order.items.map((item) => <div key={item.id} className="flex justify-between gap-4 py-3 text-sm"><span className="text-ink/70">{item.quantity} × {item.title}</span><span className="font-semibold">{money((item.priceAtPurchase ?? item.unitPrice) * item.quantity)}</span></div>)}</div>
            <div className="mt-4 flex items-center justify-between"><span className="text-xs text-ink/55">{order.deliveryType === 'ROOM_DELIVERY' ? `Room ${order.roomNumber}` : order.address}</span><span className="font-semibold">{money(order.totalAmount ?? order.total)}</span></div>
            <div className="mt-5 flex flex-wrap items-center gap-5"><button onClick={() => setReceipt(order)} className="inline-flex items-center gap-2 border-b border-forest/30 pb-1 text-xs font-semibold text-forest hover:text-citrus"><ReceiptText size={15} /> View / print receipt</button>{order.status === 'PENDING' && <button type="button" onClick={() => deleteOrder(order)} className="inline-flex items-center gap-2 border-b border-red-700/20 pb-1 text-xs font-semibold text-red-700 hover:text-red-900"><Trash2 size={14} /> Delete order</button>}</div>
          </article>)}
          {!orders.length && <EmptyPanel message="Your food order history will appear here." />}
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {bookings.map((booking) => <article key={booking.id} className="rounded-[5px] border border-ink/10 bg-white p-5 md:p-6">
            <div className="flex items-start justify-between gap-4"><div><p className="eyebrow text-[10px] text-ink/45">Room {booking.room.roomNumber}</p><h2 className="font-display mt-2 text-2xl">{booking.room.name}</h2><p className="mt-1 text-xs text-ink/55">{booking.room.type.replaceAll('_', ' ')}</p></div><button type="button" aria-label={`Change booking status from ${booking.status.replaceAll('_', ' ')}`} disabled={updatingBookings.has(booking.id) || booking.status === 'CHECKED_IN'} onClick={() => toggleBookingStatus(booking)} className={`rounded-full px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider ${booking.status === 'CONFIRMED' ? 'bg-mist text-forest' : 'bg-ink/5 text-ink/50'}`}>{booking.status.replaceAll('_', ' ')}</button></div>
            <p className="mt-4 flex items-center gap-2 text-sm text-ink/70"><CalendarDays size={16} className="text-forest" />{dateOnly(booking.checkIn)} – {dateOnly(booking.checkOut)}</p>
            <div className="mt-4 flex justify-between border-t border-ink/10 pt-4 text-sm"><span className="text-ink/55">{booking.paymentStatus.replaceAll('_', ' ')}</span><span className="font-semibold">{money(booking.totalPrice)}</span></div>
            <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-3">
              <button onClick={() => setBookingReceipt(booking)} className="inline-flex items-center gap-2 border-b border-forest/30 pb-1 text-xs font-semibold text-forest hover:text-citrus"><ReceiptText size={15} /> View / print receipt</button>
              {booking.status === 'CONFIRMED' && <button type="button" disabled={updatingBookings.has(booking.id)} onClick={() => toggleBookingStatus(booking)} className="inline-flex items-center gap-2 text-xs font-semibold text-citrus hover:text-ink"><RotateCcw size={14} /> Cancel booking</button>}
            </div>
          </article>)}
          {!bookings.length && <EmptyPanel message="Your room booking history will appear here." />}
        </div>
      )}
    </section>
    {receipt && <ReceiptModal order={receipt} onClose={() => setReceipt(null)} />}
    {bookingReceipt && <BookingReceiptModal booking={bookingReceipt} onClose={() => setBookingReceipt(null)} />}
  </div>
}

function EmptyPanel({ message }) {
  return <div className="rounded-[5px] border border-dashed border-ink/15 bg-white px-6 py-16 text-center text-sm text-ink/50">{message}</div>
}
