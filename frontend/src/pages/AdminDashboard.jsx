import { useEffect, useState } from 'react'
import { ArrowDown, ArrowUpRight, CalendarDays, Inbox, LoaderCircle, Pencil, Plus, Printer, ReceiptText, Trash2, Utensils, UsersRound, X } from 'lucide-react'
import BookingReceiptModal from '../components/BookingReceiptModal'
import ReceiptModal from '../components/ReceiptModal'
import useToast from '../context/useToast'
import { useAuth } from '../context/useAuth'
import api from '../services/api'

const tabs = [{ id: 'foods', label: 'Food menu', icon: Utensils }, { id: 'rooms', label: 'Rooms', icon: Inbox }, { id: 'messages', label: 'Messages', icon: ArrowUpRight }, { id: 'users', label: 'Registered Users', icon: UsersRound }, { id: 'orders', label: 'Food Orders', icon: ReceiptText }, { id: 'bookings', label: 'Room bookings', icon: CalendarDays }]
const emptyFood = { title: '', description: '', price: '', image: '', isAvailable: true }
const emptyRoom = { roomNumber: '', name: '', type: 'STANDARD', hasEnsuiteBathroom: true, pricePerNight: '', isBooked: false, image: '', description: '' }
function formatDate(date) { return new Intl.DateTimeFormat('en', { dateStyle: 'medium' }).format(new Date(date)) }
function formatBookingDate(date) { return new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(date)) }
function fetchDashboardData() { return Promise.all([api.get('/foods'), api.get('/rooms'), api.get('/messages'), api.get('/users'), api.get('/orders'), api.get('/bookings'), api.get('/admin/stats')]) }

export default function AdminDashboard() {
  const { user: currentUser } = useAuth()
  const toast = useToast()
  const [activeTab, setActiveTab] = useState('foods')
  const [foods, setFoods] = useState([])
  const [rooms, setRooms] = useState([])
  const [messages, setMessages] = useState([])
  const [users, setUsers] = useState([])
  const [orders, setOrders] = useState([])
  const [bookings, setBookings] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [editor, setEditor] = useState(null)
  const [orderFilter, setOrderFilter] = useState('ALL')
  const [receiptOrder, setReceiptOrder] = useState(null)
  const [receiptBooking, setReceiptBooking] = useState(null)

  async function loadData() {
    setLoading(true); setError('')
    try {
      const [foodResponse, roomResponse, messageResponse, userResponse, orderResponse, bookingResponse, statsResponse] = await fetchDashboardData()
      setFoods(foodResponse.data); setRooms(roomResponse.data); setMessages(messageResponse.data); setUsers(userResponse.data); setOrders(orderResponse.data); setBookings(bookingResponse.data); setStats(statsResponse.data)
    } catch (requestError) { setError(requestError.response?.data?.error || 'Dashboard data could not be loaded.') }
    finally { setLoading(false) }
  }
  useEffect(() => {
    let active = true
    fetchDashboardData().then(([foodResponse, roomResponse, messageResponse, userResponse, orderResponse, bookingResponse, statsResponse]) => {
      if (!active) return
      setFoods(foodResponse.data)
      setRooms(roomResponse.data)
      setMessages(messageResponse.data)
      setUsers(userResponse.data)
      setOrders(orderResponse.data)
      setBookings(bookingResponse.data)
      setStats(statsResponse.data)
    }).catch((requestError) => {
      if (active) setError(requestError.response?.data?.error || 'Dashboard data could not be loaded.')
    }).finally(() => {
      if (active) setLoading(false)
    })
    return () => { active = false }
  }, [])
  useEffect(() => { if (!notice) return undefined; const timer = window.setTimeout(() => setNotice(''), 3200); return () => window.clearTimeout(timer) }, [notice])
  function startCreate(type) { setEditor({ type, record: null, form: type === 'food' ? { ...emptyFood } : { ...emptyRoom } }); setError('') }
  function startEdit(type, record) { setEditor({ type, record, form: { ...record, ...(type === 'food' ? { price: String(record.price) } : { pricePerNight: String(record.pricePerNight) }) } }); setError('') }
  function updateForm(event) { const { name, value, type, checked } = event.target; setEditor((current) => ({ ...current, form: { ...current.form, [name]: type === 'checkbox' ? checked : value } })) }

  async function saveRecord(event) {
    event.preventDefault(); setSaving(true); setError('')
    const collection = editor.type === 'food' ? 'foods' : 'rooms'
    try {
      if (editor.record) await api.put(`/${collection}/${editor.record.id}`, editor.form)
      else await api.post(`/${collection}`, editor.form)
      setEditor(null); setNotice(`${editor.type === 'food' ? 'Food item' : 'Room'} saved.`); await loadData()
    } catch (requestError) { setError(requestError.response?.data?.error || 'The record could not be saved.') }
    finally { setSaving(false) }
  }

  async function removeRecord(type, record) {
    const label = type === 'food' ? record.title : `room ${record.roomNumber}`
    if (!window.confirm(`Delete ${label}? This cannot be undone.`)) return
    const collection = type === 'food' ? 'foods' : 'rooms'
    try { await api.delete(`/${collection}/${record.id}`); setNotice(`${type === 'food' ? 'Food item' : 'Room'} deleted.`); await loadData() }
    catch (requestError) { setError(requestError.response?.data?.error || 'The record could not be deleted.') }
  }

  async function removeMessage(message) {
    if (!window.confirm(`Delete the message from ${message.senderName}? This cannot be undone.`)) return
    try { await api.delete(`/messages/${message.id}`); setMessages((current) => current.filter((item) => item.id !== message.id)); setNotice('Message deleted.') }
    catch (requestError) { setError(requestError.response?.data?.error || 'The message could not be deleted.') }
  }

  async function removeUser(user) {
    if (!window.confirm(`Delete ${user.name}? Their order and booking history will also be permanently deleted.`)) return
    try {
      await api.delete(`/users/${user.id}`)
      setNotice(`${user.name} deleted.`)
      toast.success('User deleted.')
      await loadData()
    } catch (requestError) {
      const message = requestError.response?.data?.error || 'The user could not be deleted.'
      setError(message)
      toast.error(message)
    }
  }

  async function updateOrderStatus(order, status) {
    try {
      const { data } = await api.patch(`/orders/${order.id}/status`, { status })
      setOrders((current) => current.map((item) => item.id === data.id ? data : item))
      setNotice(`Order #${order.id.slice(-8).toUpperCase()} updated.`)
      toast.success('Order status updated.')
    } catch (requestError) {
      const message = requestError.response?.data?.error || 'The order status could not be updated.'
      setError(message)
      toast.error(message)
    }
  }

  async function removeOrder(order) {
    if (!window.confirm('Are you sure you want to delete this order? This action will permanently remove the record.')) return
    try {
      await api.delete(`/orders/${order.id}`)
      setOrders((current) => current.filter((item) => item.id !== order.id))
      setNotice(`Order #${order.id.slice(-8).toUpperCase()} deleted.`)
      toast.success('Order deleted.')
    } catch (requestError) {
      const message = requestError.response?.data?.error || 'The order could not be deleted.'
      setError(message)
      toast.error(message)
    }
  }

  async function updateBookingStatus(booking, status) {
    try {
      const { data } = await api.patch(`/bookings/${booking.id}/status`, { status })
      setBookings((current) => current.map((item) => item.id === data.id ? data : item))
      setNotice(`Booking for room ${booking.room.roomNumber} updated.`)
      toast.success('Booking status updated.')
    } catch (requestError) {
      const message = requestError.response?.data?.error || 'The booking could not be updated.'
      setError(message)
      toast.error(message)
    }
  }

  async function toggleRoomAvailability(room) {
    const activeReservation = bookings.some((booking) => booking.roomId === room.id
      && ['CONFIRMED', 'CHECKED_IN'].includes(booking.status)
      && new Date(booking.checkIn) <= new Date()
      && new Date(booking.checkOut) > new Date())
    if (room.isBooked && activeReservation) {
      setError('Cancel the active reservation before marking this room available.')
      return
    }
    try {
      const { data } = await api.put(`/rooms/${room.id}`, { isBooked: !room.isBooked })
      setRooms((current) => current.map((item) => item.id === data.id ? { ...item, isBooked: data.isBooked } : item))
      setNotice(`Room ${room.roomNumber} marked ${data.isBooked ? 'unavailable' : 'available'}.`)
    } catch (requestError) { setError(requestError.response?.data?.error || 'Room availability could not be changed.') }
  }

  const activeCount = activeTab === 'foods' ? foods.length : activeTab === 'rooms' ? rooms.length : activeTab === 'messages' ? messages.length : activeTab === 'users' ? users.length : activeTab === 'orders' ? orders.length : bookings.length
  const visibleOrders = orders.filter((order) => orderFilter === 'ALL' || order.status === orderFilter)
  return <div className="min-h-[75vh] bg-paper">
    <div className="border-b border-ink/10 bg-mist/65"><div className="mx-auto max-w-[1440px] px-5 py-10 md:px-10 md:py-14"><p className="eyebrow text-[10px] text-citrus">The back office</p><div className="mt-2 flex flex-wrap items-end justify-between gap-5"><div><h1 className="font-display text-4xl md:text-5xl">Admin dashboard</h1><p className="mt-2 text-sm text-ink/55">Keep the good things in order.</p></div><button onClick={loadData} className="inline-flex items-center gap-2 rounded-full border border-ink/15 bg-white px-4 py-2.5 text-xs font-semibold hover:border-forest"><ArrowDown size={14} /> Refresh</button></div></div></div>
    <div className="mx-auto max-w-[1440px] px-5 py-8 md:px-10 md:py-12"><div className="mb-7 flex flex-wrap items-center justify-between gap-4"><div className="flex flex-wrap gap-1 rounded-full border border-ink/10 bg-white p-1">{tabs.map(({ id, label, icon: Icon }) => <button key={id} onClick={() => { setActiveTab(id); setError('') }} className={`inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-xs font-semibold transition-colors md:px-5 ${activeTab === id ? 'bg-forest text-white' : 'text-ink/60 hover:text-ink'}`}><Icon size={15} />{label}</button>)}</div><p className="text-xs text-ink/45">{activeCount} {activeTab === 'messages' ? 'messages' : activeTab === 'rooms' ? 'rooms' : activeTab === 'users' ? 'registered users' : activeTab === 'orders' ? 'orders' : activeTab === 'bookings' ? 'bookings' : 'menu items'}</p></div>
      {notice && <p role="status" className="mb-5 rounded-[4px] bg-mist px-4 py-3 text-sm text-forest">{notice}</p>}{error && <p role="alert" className="mb-5 rounded-[4px] bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      {!loading && stats && <div className="mb-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{[{ label: 'Registered users', value: stats.totalUsers.toLocaleString() }, { label: 'Food orders', value: stats.totalOrders.toLocaleString() }, { label: 'Room bookings', value: stats.totalBookings.toLocaleString() }, { label: 'Total revenue', value: `$${Number(stats.totalRevenue).toFixed(2)}` }].map((stat) => <article key={stat.label} className="rounded-[5px] border border-ink/10 bg-white p-5"><p className="eyebrow text-[10px] text-ink/45">{stat.label}</p><p className="font-display mt-2 text-3xl">{stat.value}</p></article>)}</div>}
      {loading ? <div className="grid min-h-64 place-items-center text-forest"><LoaderCircle className="animate-spin" /></div> : <>
        {['foods', 'rooms'].includes(activeTab) && <div className="mb-5 flex justify-end"><button onClick={() => startCreate(activeTab === 'foods' ? 'food' : 'room')} className="inline-flex items-center gap-2 rounded-full bg-forest px-5 py-3 text-xs font-semibold text-white hover:bg-ink"><Plus size={15} /> Add {activeTab === 'foods' ? 'food item' : 'room'}</button></div>}
        {activeTab === 'foods' && <div className="overflow-hidden rounded-[5px] border border-ink/10 bg-white"><div className="hidden grid-cols-[1.5fr_1.3fr_.5fr_.6fr_auto] gap-4 border-b border-ink/10 bg-paper px-5 py-3 text-[10px] font-semibold uppercase tracking-wider text-ink/45 md:grid"><span>Item</span><span>Description</span><span>Price</span><span>Availability</span><span /></div>{foods.map((food) => <div key={food.id} className="grid gap-3 border-b border-ink/10 p-4 last:border-0 md:grid-cols-[1.5fr_1.3fr_.5fr_.6fr_auto] md:items-center md:gap-4 md:px-5"><div className="flex items-center gap-3"><img src={food.image} alt="" className="h-12 w-14 rounded-[3px] object-cover" /><span className="font-semibold">{food.title}</span></div><p className="line-clamp-2 text-xs leading-5 text-ink/55">{food.description}</p><span className="text-sm font-semibold">${Number(food.price).toFixed(0)}</span><span className={`w-fit rounded-full px-2.5 py-1 text-[10px] font-semibold ${food.isAvailable ? 'bg-mist text-forest' : 'bg-red-50 text-red-700'}`}>{food.isAvailable ? 'Available' : 'Unavailable'}</span><ActionButtons onEdit={() => startEdit('food', food)} onDelete={() => removeRecord('food', food)} /></div>)}{!foods.length && <EmptyPanel label="No food items yet." />}</div>}
        {activeTab === 'rooms' && <div className="overflow-hidden rounded-[5px] border border-ink/10 bg-white"><div className="hidden grid-cols-[1fr_1.2fr_.6fr_.8fr_auto] gap-4 border-b border-ink/10 bg-paper px-5 py-3 text-[10px] font-semibold uppercase tracking-wider text-ink/45 md:grid"><span>Room</span><span>Type & bathroom</span><span>Nightly rate</span><span>Availability</span><span /></div>{rooms.map((room) => <div key={room.id} className="grid gap-3 border-b border-ink/10 p-4 last:border-0 md:grid-cols-[1fr_1.2fr_.6fr_.8fr_auto] md:items-center md:gap-4 md:px-5"><div className="flex items-center gap-3"><img src={room.image} alt="" className="h-12 w-14 rounded-[3px] object-cover" /><span className="font-semibold">{room.name || `Room ${room.roomNumber}`}</span></div><span className="text-xs text-ink/65">{room.type} · {room.hasEnsuiteBathroom ? 'Ensuite' : 'Shared'}</span><span className="text-sm font-semibold">${Number(room.pricePerNight).toFixed(0)}</span><span className={`w-fit rounded-full px-2.5 py-1 text-[10px] font-semibold ${room.isBooked ? 'bg-citrus/10 text-citrus' : 'bg-mist text-forest'}`}>{room.isBooked ? 'Booked' : 'Available'}</span><ActionButtons onEdit={() => startEdit('room', room)} onDelete={() => removeRecord('room', room)} /></div>)}{!rooms.length && <EmptyPanel label="No rooms yet." />}</div>}
        {activeTab === 'messages' && <div className="grid gap-4 md:grid-cols-2">{messages.map((message) => <article key={message.id} className="rounded-[5px] border border-ink/10 bg-white p-5 md:p-6"><div className="flex items-start justify-between gap-4"><div><p className="font-display text-2xl">{message.subject}</p><p className="mt-2 text-xs text-ink/55">{message.senderName} · <a href={`mailto:${message.email}`} className="text-forest hover:underline">{message.email}</a></p></div><button onClick={() => removeMessage(message)} className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-ink/45 transition-colors hover:bg-red-50 hover:text-red-700" aria-label={`Delete message from ${message.senderName}`}><Trash2 size={16} /></button></div><p className="mt-5 whitespace-pre-wrap text-sm leading-6 text-ink/75">{message.message}</p><p className="mt-5 text-[10px] uppercase tracking-wider text-ink/40">{formatDate(message.createdAt)}</p></article>)}{!messages.length && <EmptyPanel label="Your inbox is clear." />}</div>}
        {activeTab === 'users' && <div className="overflow-hidden rounded-[5px] border border-ink/10 bg-white"><div className="hidden grid-cols-[1fr_1.2fr_.65fr_.7fr_auto] gap-4 border-b border-ink/10 bg-paper px-5 py-3 text-[10px] font-semibold uppercase tracking-wider text-ink/45 md:grid"><span>Name</span><span>Email address</span><span>Role</span><span>Registered</span><span>Actions</span></div>{users.map((user) => <div key={user.id} className="grid gap-2 border-b border-ink/10 p-4 last:border-0 md:grid-cols-[1fr_1.2fr_.65fr_.7fr_auto] md:items-center md:gap-4 md:px-5"><span className="font-semibold">{user.name}</span><a href={`mailto:${user.email}`} className="text-sm text-forest hover:underline">{user.email}</a><span className={`w-fit rounded-full px-2.5 py-1 text-[10px] font-semibold ${user.role === 'ADMIN' ? 'bg-citrus/10 text-citrus' : 'bg-mist text-forest'}`}>{user.role}</span><span className="text-xs text-ink/55">{formatDate(user.createdAt)}</span><button type="button" disabled={user.id === currentUser?.id} onClick={() => removeUser(user)} className="inline-flex w-fit items-center gap-2 rounded-full border border-red-700/15 px-3 py-2 text-xs font-semibold text-red-700 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40" aria-label={`Delete ${user.name}`} title={user.id === currentUser?.id ? 'You cannot delete your own account' : undefined}><Trash2 size={14} /> Delete User</button></div>)}{!users.length && <EmptyPanel label="No registered users yet." />}</div>}
        {activeTab === 'orders' && <div>
          <div className="mb-5 flex flex-wrap gap-2">{['ALL', 'PENDING', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'].map((status) => <button key={status} onClick={() => setOrderFilter(status)} className={`rounded-full px-4 py-2 text-[10px] font-semibold uppercase tracking-wider ${orderFilter === status ? 'bg-forest text-white' : 'border border-ink/15 bg-white text-ink/60'}`}>{status.replaceAll('_', ' ')}</button>)}</div>
          <div className="grid gap-4 lg:grid-cols-2">{visibleOrders.map((order) => <article key={order.id} className="rounded-[5px] border border-ink/10 bg-white p-5 md:p-6">
            <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="eyebrow text-[10px] text-ink/45">Order #{order.id.slice(-8).toUpperCase()}</p><h2 className="font-display mt-2 text-2xl">{order.customerName || order.user.name}</h2><a href={`mailto:${order.user.email}`} className="mt-1 inline-block text-xs text-forest hover:underline">{order.user.email}</a><p className="mt-1 text-xs text-ink/55">{order.phone}</p></div>
              <div className="flex flex-wrap items-center gap-2"><button type="button" onClick={() => setReceiptOrder(order)} className="inline-flex items-center gap-2 rounded-full border border-ink/15 bg-white px-3 py-2 text-[10px] font-semibold hover:border-forest"><Printer size={14} /> Print Receipt</button><select aria-label="Update order status" value={order.status} onChange={(event) => updateOrderStatus(order, event.target.value)} className="rounded-full border border-ink/15 bg-paper px-3 py-2 text-[10px] font-semibold uppercase tracking-wider"><option value="PENDING">Pending</option><option value="OUT_FOR_DELIVERY">Out for delivery</option><option value="DELIVERED">Delivered</option><option value="CANCELLED">Cancelled</option></select>{order.status === 'PENDING' && <button type="button" onClick={() => removeOrder(order)} aria-label={`Delete order ${order.id.slice(-8).toUpperCase()}`} className="inline-flex items-center gap-2 rounded-full border border-red-700/15 px-3 py-2 text-[10px] font-semibold text-red-700 hover:bg-red-50"><Trash2 size={14} /> Delete</button>}</div>
            </div>
            <div className="mt-4 rounded-[4px] bg-paper p-3 text-xs leading-5"><p className="font-semibold">{order.deliveryType === 'ROOM_DELIVERY' ? `Room delivery · ${order.roomNumber}` : 'Home delivery'}</p>{order.deliveryType === 'HOME_DELIVERY' && <p>{[order.address, order.neighborhood, order.city].filter(Boolean).join(', ')}</p>}</div>
            <div className="mt-4 divide-y divide-ink/10 border-y border-ink/10">{order.items.map((item) => <div key={item.id} className="flex items-center gap-3 py-3"><img src={item.image} alt="" className="h-11 w-12 rounded-[3px] object-cover" /><span className="min-w-0 flex-1 text-sm">{item.quantity} × {item.title}</span><span className="shrink-0 text-sm font-semibold">${((item.priceAtPurchase ?? item.unitPrice) * item.quantity).toFixed(2)}</span></div>)}</div>
            {order.notes && <p className="mt-4 text-xs leading-5 text-ink/60"><span className="font-semibold text-ink/75">Kitchen note:</span> {order.notes}</p>}
            <div className="mt-4 flex items-center justify-between"><span className="text-[10px] uppercase tracking-wider text-ink/45">{new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(order.orderDate || order.createdAt))}</span><span className="font-semibold">Total ${Number(order.totalAmount ?? order.total).toFixed(2)}</span></div>
          </article>)}{!visibleOrders.length && <EmptyPanel label="No orders match this status." />}</div>
        </div>}
        {activeTab === 'bookings' && <div className="space-y-8"><section><div className="mb-4 flex items-end justify-between gap-4"><div><p className="eyebrow text-[10px] text-citrus">House inventory</p><h2 className="font-display mt-1 text-2xl">Room availability</h2></div><p className="text-xs text-ink/45">Block or reopen rooms</p></div><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{rooms.map((room) => { const activeReservation = bookings.some((booking) => booking.roomId === room.id && ['CONFIRMED', 'CHECKED_IN'].includes(booking.status) && new Date(booking.checkIn) <= new Date() && new Date(booking.checkOut) > new Date()); return <div key={room.id} className="flex items-center justify-between gap-3 rounded-[5px] border border-ink/10 bg-white p-4"><div><p className="text-sm font-semibold">Room {room.roomNumber}</p><p className="mt-1 text-[10px] text-ink/50">{room.name} · {activeReservation ? 'Current guest' : room.isBooked ? 'Blocked' : 'Available'}</p></div><button disabled={activeReservation} onClick={() => toggleRoomAvailability(room)} className={`rounded-full px-3 py-2 text-[10px] font-semibold ${activeReservation ? 'bg-ink/5 text-ink/35' : room.isBooked ? 'border border-ink/15 text-ink/65 hover:border-forest hover:text-forest' : 'bg-forest text-white hover:bg-ink'}`}>{activeReservation ? 'Occupied' : room.isBooked ? 'Mark available' : 'Mark booked'}</button></div> })}{!rooms.length && <EmptyPanel label="No rooms in the house." />}</div></section><section><div className="mb-4"><p className="eyebrow text-[10px] text-citrus">Guest reservations</p><h2 className="font-display mt-1 text-2xl">Rooms</h2></div><div className="grid gap-4 lg:grid-cols-2">{bookings.map((booking) => <article key={booking.id} className="rounded-[5px] border border-ink/10 bg-white p-5 md:p-6"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="eyebrow text-[10px] text-ink/45">Room {booking.room.roomNumber} · {booking.room.type}</p><h2 className="font-display mt-2 text-2xl">{booking.user.name}</h2><a href={`mailto:${booking.user.email}`} className="mt-1 inline-block text-xs text-forest hover:underline">{booking.user.email}</a></div><div className="flex flex-wrap items-center gap-2"><button type="button" onClick={() => setReceiptBooking(booking)} className="inline-flex items-center gap-2 rounded-full border border-ink/15 bg-white px-3 py-2 text-[10px] font-semibold hover:border-forest"><Printer size={14} /> Print Receipt</button><select aria-label="Update booking status" value={booking.status} onChange={(event) => updateBookingStatus(booking, event.target.value)} className="rounded-full border border-ink/15 bg-paper px-3 py-2 text-[10px] font-semibold uppercase tracking-wider"><option value="CONFIRMED">Confirmed</option><option value="CHECKED_IN">Checked in</option><option value="CANCELLED">Cancelled</option></select></div></div><p className="mt-4 text-sm text-ink/65">{formatBookingDate(booking.checkIn)} – {formatBookingDate(booking.checkOut)}</p><div className="mt-4 flex justify-between border-t border-ink/10 pt-4 text-sm"><span className="text-ink/55">{booking.paymentStatus}</span><span className="font-semibold">${Number(booking.totalPrice).toFixed(2)}</span></div></article>)}{!bookings.length && <EmptyPanel label="No room bookings yet." />}</div></section></div>}
      </>}</div>
    {receiptOrder && <ReceiptModal order={receiptOrder} onClose={() => setReceiptOrder(null)} />}
    {receiptBooking && <BookingReceiptModal booking={receiptBooking} onClose={() => setReceiptBooking(null)} />}
    {editor && <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/50 p-0 backdrop-blur-sm sm:items-center sm:p-5" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setEditor(null) }}><section role="dialog" aria-modal="true" aria-labelledby="editor-title" className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-t-[8px] bg-paper p-5 shadow-soft sm:rounded-[6px] sm:p-7"><div className="flex items-start justify-between"><div><p className="eyebrow text-[10px] text-citrus">{editor.record ? 'Edit details' : 'Add to the house'}</p><h2 id="editor-title" className="font-display mt-2 text-3xl">{editor.record ? 'Update' : 'New'} {editor.type === 'food' ? 'menu item' : 'room'}</h2></div><button onClick={() => setEditor(null)} className="grid h-9 w-9 place-items-center rounded-full border border-ink/15" aria-label="Close form"><X size={17} /></button></div>
      <form onSubmit={saveRecord} className="mt-7 space-y-4">{editor.type === 'food' ? <><label className="field-label">Title<input className="field-input" name="title" value={editor.form.title} onChange={updateForm} required /></label><label className="field-label">Description<textarea className="field-input min-h-24" name="description" value={editor.form.description} onChange={updateForm} required /></label><div className="grid gap-4 sm:grid-cols-2"><label className="field-label">Price<input className="field-input" name="price" type="number" min="0" step="0.01" value={editor.form.price} onChange={updateForm} required /></label><label className="field-label">Image URL<input className="field-input" name="image" type="url" value={editor.form.image} onChange={updateForm} required /></label></div><label className="flex items-center gap-3 text-sm"><input type="checkbox" name="isAvailable" checked={editor.form.isAvailable} onChange={updateForm} className="h-4 w-4 accent-forest" />Available to order</label></> : <><div className="grid gap-4 sm:grid-cols-2"><label className="field-label">Room number<input className="field-input" name="roomNumber" value={editor.form.roomNumber} onChange={updateForm} required /></label><label className="field-label">Room name<input className="field-input" name="name" value={editor.form.name} onChange={updateForm} required /></label></div><div className="grid gap-4 sm:grid-cols-2"><label className="field-label">Room type<select className="field-input" name="type" value={editor.form.type} onChange={updateForm}>{[['STANDARD', 'Standard'], ['DELUXE', 'Deluxe'], ['FAMILY', 'Family']].map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label className="field-label">Nightly rate<input className="field-input" name="pricePerNight" type="number" min="0" step="0.01" value={editor.form.pricePerNight} onChange={updateForm} required /></label></div><label className="field-label">Description<textarea className="field-input min-h-20" name="description" value={editor.form.description} onChange={updateForm} required /></label><label className="field-label">Image URL<input className="field-input" name="image" type="url" value={editor.form.image} onChange={updateForm} required /></label><label className="flex items-center gap-3 text-sm"><input type="checkbox" name="hasEnsuiteBathroom" checked={editor.form.hasEnsuiteBathroom} onChange={updateForm} className="h-4 w-4 accent-forest" />Private ensuite bathroom</label><label className="flex items-center gap-3 text-sm"><input type="checkbox" name="isBooked" checked={editor.form.isBooked} onChange={updateForm} className="h-4 w-4 accent-forest" />Mark room unavailable for all dates</label></>}
        <div className="flex justify-end gap-3 border-t border-ink/10 pt-5"><button type="button" onClick={() => setEditor(null)} className="rounded-full border border-ink/20 px-5 py-3 text-xs font-semibold">Cancel</button><button disabled={saving} className="inline-flex items-center gap-2 rounded-full bg-forest px-5 py-3 text-xs font-semibold text-white disabled:opacity-60">{saving ? <LoaderCircle size={14} className="animate-spin" /> : null}{saving ? 'Saving...' : 'Save changes'}</button></div>
      </form></section></div>}
  </div>
}

function ActionButtons({ onEdit, onDelete }) { return <div className="flex items-center gap-1"><button onClick={onEdit} className="grid h-9 w-9 place-items-center rounded-full text-ink/50 hover:bg-mist hover:text-forest" aria-label="Edit"><Pencil size={15} /></button><button onClick={onDelete} className="grid h-9 w-9 place-items-center rounded-full text-ink/50 hover:bg-red-50 hover:text-red-700" aria-label="Delete"><Trash2 size={15} /></button></div> }
function EmptyPanel({ label }) { return <div className="rounded-[5px] border border-dashed border-ink/15 bg-white px-6 py-16 text-center text-sm text-ink/50">{label}</div> }