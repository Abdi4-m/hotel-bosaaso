import { useEffect, useState } from 'react'
import { ArrowLeft, House, LoaderCircle, MapPin, PackageCheck } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/useAuth'
import { useCart } from '../context/useCart'
import useToast from '../context/useToast'
import ReceiptModal from '../components/ReceiptModal'
import api from '../services/api'

const formatPrice = (price) => `$${Number(price).toFixed(2)}`

export default function Checkout() {
  const { user } = useAuth()
  const { items, subtotal, clearCart } = useCart()
  const [form, setForm] = useState({ deliveryType: 'HOME_DELIVERY', customerName: user?.name || '', phone: '', city: '', neighborhood: '', address: '', roomNumber: '', notes: '' })
  const [taxRate, setTaxRate] = useState(null)
  const [rooms, setRooms] = useState([])
  const [roomsLoading, setRoomsLoading] = useState(true)
  const [roomsError, setRoomsError] = useState('')
  const [order, setOrder] = useState(null)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const toast = useToast()
  const roundedSubtotal = Number(subtotal.toFixed(2))
  const taxAmount = taxRate === null ? null : Number((roundedSubtotal * taxRate).toFixed(2))
  const totalAmount = taxAmount === null ? null : Number((roundedSubtotal + taxAmount).toFixed(2))

  useEffect(() => {
    let active = true
    api.get('/rooms').then(({ data }) => {
      if (!Array.isArray(data)) throw new Error('Room numbers could not be loaded. Please refresh the page.')
      if (active) setRooms(data)
    }).catch((requestError) => {
      if (active) setRoomsError(requestError.response?.data?.error || requestError.message || 'Room numbers could not be loaded. Please refresh the page.')
    }).finally(() => {
      if (active) setRoomsLoading(false)
    })
    return () => { active = false }
  }, [])

  useEffect(() => {
    let active = true
    api.get('/config').then(({ data }) => {
      if (typeof data?.orderTaxRate !== 'number' || !Number.isFinite(data.orderTaxRate) || data.orderTaxRate < 0 || data.orderTaxRate > 1) {
        throw new Error('Order pricing configuration is invalid.')
      }
      if (active) setTaxRate(data.orderTaxRate)
    }).catch((requestError) => {
      if (active) setError(requestError.response?.data?.error || requestError.message || 'Order pricing could not be loaded. Please refresh the page.')
    })
    return () => { active = false }
  }, [])

  async function placeOrder(event) {
    event.preventDefault()
    if (!items.length) return
    if (totalAmount === null) {
      setError('Order pricing could not be loaded. Please refresh the page.')
      return
    }
    const requiredFields = form.deliveryType === 'HOME_DELIVERY'
      ? ['customerName', 'phone', 'city', 'neighborhood', 'address']
      : ['customerName', 'phone', 'roomNumber']
    if (requiredFields.some((field) => typeof form[field] !== 'string' || !form[field].trim())) {
      setError('Complete all required checkout details before placing your order.')
      return
    }
    if (form.deliveryType === 'ROOM_DELIVERY') {
      if (roomsLoading) {
        setError('Room numbers are still loading. Please try again.')
        return
      }
      if (roomsError) {
        setError(roomsError)
        return
      }
      if (!rooms.length) {
        setError('No rooms are currently available for delivery.')
        return
      }
      if (!rooms.some((room) => room.roomNumber === form.roomNumber)) {
        setError('Select a valid room number from the list.')
        return
      }
    }
    setSubmitting(true)
    setError('')
    try {
      const { data } = await api.post('/orders', {
        items: items.map((item) => ({ foodId: item.id, quantity: item.quantity })),
        ...form,
      })
      setOrder(data)
      clearCart()
      toast.success('Order placed successfully.')
    } catch (requestError) {
      const message = requestError.response?.data?.error || 'Your order could not be placed. Please try again.'
      setError(message)
      toast.error(message)
    } finally {
      setSubmitting(false)
    }
  }

  if (order) return <div className="page-enter mx-auto grid min-h-[65vh] max-w-3xl place-items-center px-5 py-16 text-center"><div><span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-mist text-forest"><PackageCheck size={24} /></span><p className="eyebrow mt-6 text-[10px] text-citrus">Order received</p><h1 className="font-display mt-2 text-4xl md:text-5xl">We'll get right on it.</h1><p className="mt-4 text-sm text-ink/60">Order #{String(order.id).slice(-8).toUpperCase()} · {formatPrice(order.totalAmount)}</p><p className="mt-2 text-xs text-ink/45">Your receipt is ready to view or print.</p><ReceiptModal order={order} onClose={() => setOrder(null)} /><Link to="/account" className="mt-5 inline-flex rounded-full border border-ink/15 px-5 py-3 text-sm font-semibold hover:border-forest">View order history</Link></div></div>

  return <div className="page-enter min-h-[65vh] bg-paper"><section className="bg-mist/70"><div className="mx-auto max-w-[1100px] px-5 pb-10 pt-12 md:px-10 md:pb-12 md:pt-16"><Link to="/cart" className="inline-flex items-center gap-2 text-xs font-semibold text-ink/55 hover:text-forest"><ArrowLeft size={14} /> Back to your bag</Link><p className="eyebrow mt-6 text-[10px] text-citrus">Just a few details</p><h1 className="font-display mt-2 text-5xl md:text-6xl">Checkout</h1></div></section>
    <section className="mx-auto grid max-w-[1100px] gap-10 px-5 py-10 md:grid-cols-[1.15fr_.85fr] md:px-10 md:py-14">
      {items.length ? <>
        <form onSubmit={placeOrder} className="space-y-6">{error && <p role="alert" className="rounded-[4px] bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
          <fieldset className="rounded-[5px] border border-ink/10 bg-white p-5 md:p-6"><legend className="px-1 font-display text-2xl">Where should we bring it?</legend><div className="grid grid-cols-2 gap-2"><button type="button" onClick={() => setForm({ ...form, deliveryType: 'HOME_DELIVERY' })} aria-pressed={form.deliveryType === 'HOME_DELIVERY'} className={`flex min-h-12 items-center justify-center gap-2 rounded-[4px] border px-3 text-sm font-semibold ${form.deliveryType === 'HOME_DELIVERY' ? 'border-forest bg-mist text-forest' : 'border-ink/15 text-ink/60'}`}><MapPin size={16} /> Home delivery</button><button type="button" onClick={() => setForm({ ...form, deliveryType: 'ROOM_DELIVERY' })} aria-pressed={form.deliveryType === 'ROOM_DELIVERY'} className={`flex min-h-12 items-center justify-center gap-2 rounded-[4px] border px-3 text-sm font-semibold ${form.deliveryType === 'ROOM_DELIVERY' ? 'border-forest bg-mist text-forest' : 'border-ink/15 text-ink/60'}`}><House size={16} /> Room delivery</button></div>
            <div className="mt-5 grid gap-4 sm:grid-cols-2"><label className="field-label">Customer name<input className="field-input" autoComplete="name" maxLength={120} required value={form.customerName} onChange={(event) => setForm({ ...form, customerName: event.target.value })} /></label><label className="field-label">Phone number<input className="field-input" type="tel" autoComplete="tel" maxLength={40} required value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} /></label></div>
            {form.deliveryType === 'HOME_DELIVERY' ? <div className="mt-4 space-y-4"><div className="grid gap-4 sm:grid-cols-2"><label className="field-label">City<input className="field-input" autoComplete="address-level2" maxLength={120} required value={form.city} onChange={(event) => setForm({ ...form, city: event.target.value })} /></label><label className="field-label">Xaafadda / Village or Area<input className="field-input" maxLength={120} required value={form.neighborhood} onChange={(event) => setForm({ ...form, neighborhood: event.target.value })} /><span className="mt-1 block text-xs font-normal text-ink/50">The area within your city where you live.</span></label></div><label className="field-label">Address<input className="field-input" autoComplete="street-address" maxLength={250} required value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} /></label></div> : <label className="field-label mt-4 block">Room number<select className="field-input" required value={form.roomNumber} disabled={roomsLoading || Boolean(roomsError) || rooms.length === 0} onChange={(event) => setForm({ ...form, roomNumber: event.target.value })}><option value="">{roomsLoading ? 'Loading rooms...' : roomsError ? 'Room numbers unavailable' : rooms.length ? 'Select a room' : 'No rooms available'}</option>{rooms.map((room) => <option key={room.id} value={room.roomNumber}>{room.roomNumber}</option>)}</select>{roomsError && <span role="alert" className="mt-1 block text-xs font-normal text-red-700">{roomsError}</span>}{!roomsLoading && !roomsError && rooms.length === 0 && <span className="mt-1 block text-xs font-normal text-ink/50">No rooms are available for delivery.</span>}</label>}
          </fieldset>
          <label className="field-label">Notes for the kitchen <span className="font-normal text-ink/45">(optional)</span><textarea className="field-input min-h-24 resize-y" value={form.notes} maxLength={500} onChange={(event) => setForm({ ...form, notes: event.target.value })} placeholder="Allergies, timing, or anything else we should know" /></label>
          <button disabled={submitting || totalAmount === null} className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-forest px-5 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-ink disabled:opacity-60">{submitting ? <><LoaderCircle size={16} className="animate-spin" /> Placing order</> : totalAmount === null ? 'Loading order total' : <>Place order · {formatPrice(totalAmount)}</>}</button><p className="text-center text-xs text-ink/45">No payment is collected online. The house will confirm your order.</p></form>
        <aside className="h-fit rounded-[5px] bg-white p-5 md:p-6"><h2 className="font-display text-2xl">Your order</h2><div className="mt-5 divide-y divide-ink/10">{items.map((item) => <div key={item.id} className="flex justify-between gap-4 py-3 text-sm"><span className="text-ink/70">{item.quantity} × {item.title}</span><span className="shrink-0 font-semibold">{formatPrice(item.price * item.quantity)}</span></div>)}</div><div className="mt-2 space-y-2 border-t border-ink/10 pt-4 text-sm"><div className="flex justify-between"><span className="text-ink/60">Subtotal</span><span>{formatPrice(roundedSubtotal)}</span></div><div className="flex justify-between"><span className="text-ink/60">{taxRate === null ? 'Tax' : `Tax (${(taxRate * 100).toFixed(2)}%)`}</span><span>{taxAmount === null ? '—' : formatPrice(taxAmount)}</span></div><div className="flex justify-between border-t border-ink/10 pt-3 font-semibold"><span>Total</span><span>{totalAmount === null ? '—' : formatPrice(totalAmount)}</span></div></div></aside>
      </> : <div className="col-span-full py-16 text-center"><h2 className="font-display text-3xl">Nothing to check out yet.</h2><Link to="/menu" className="mt-5 inline-flex rounded-full bg-forest px-5 py-3 text-sm font-semibold text-white">Find something good</Link></div>}
    </section>
  </div>
}