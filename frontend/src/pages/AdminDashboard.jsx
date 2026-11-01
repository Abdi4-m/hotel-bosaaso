import { useEffect, useRef, useState } from 'react'
import { ArrowDown, ArrowUpRight, Bell, CalendarDays, Eye, Inbox, LoaderCircle, Pencil, Plus, Printer, ReceiptText, Trash2, Utensils, UsersRound, X } from 'lucide-react'
import BookingReceiptModal from '../components/BookingReceiptModal'
import ReceiptModal from '../components/ReceiptModal'
import useToast from '../context/useToast'
import { useAuth } from '../context/useAuth'
import api from '../services/api'

const tabs = [{ id: 'foods', label: 'Food menu', icon: Utensils }, { id: 'rooms', label: 'Rooms', icon: Inbox }, { id: 'messages', label: 'Messages', icon: ArrowUpRight }, { id: 'users', label: 'Registered Users', icon: UsersRound }, { id: 'orders', label: 'Food Orders', icon: ReceiptText }, { id: 'bookings', label: 'Room bookings', icon: CalendarDays }]
const emptyFood = { title: '', description: '', price: '', image: '', category: '', isAvailable: true }
const emptyRoom = { roomNumber: '', name: '', type: 'STANDARD', hasEnsuiteBathroom: true, pricePerNight: '', isBooked: false, image: '', description: '' }
function formatDate(date) { return new Intl.DateTimeFormat('en', { dateStyle: 'medium' }).format(new Date(date)) }
function formatBookingDate(date) { return new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(date)) }
function utcDateInput(date = new Date()) { return date.toISOString().slice(0, 10) }
function fetchDashboardData() { return Promise.all([api.get('/foods'), api.get('/rooms'), api.get('/messages'), api.get('/users'), api.get('/orders'), api.get('/bookings'), api.get('/admin/stats'), api.get('/admin/activity')]) }

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
  const [activities, setActivities] = useState([])
  const [unseenActivityCount, setUnseenActivityCount] = useState(0)
  const [activityOpen, setActivityOpen] = useState(false)
  const [pageViews, setPageViews] = useState(null)
  const [pageViewsOpen, setPageViewsOpen] = useState(false)
  const [pageViewsOffset, setPageViewsOffset] = useState(0)
  const [analyticsOpen, setAnalyticsOpen] = useState(false)
  const [analyticsRange, setAnalyticsRange] = useState('month')
  const [analyticsDate, setAnalyticsDate] = useState(() => utcDateInput())
  const [analytics, setAnalytics] = useState(null)
  const [analyticsLoading, setAnalyticsLoading] = useState(false)
  const [analyticsError, setAnalyticsError] = useState('')
  const latestActivityId = useRef(0)
  const activityReady = useRef(false)
  const refreshRef = useRef(null)

  async function loadData(showLoading = true) {
    if (showLoading) setLoading(true)
    setError('')
    try {
      const [foodResponse, roomResponse, messageResponse, userResponse, orderResponse, bookingResponse, statsResponse, activityResponse] = await fetchDashboardData()
      setFoods(foodResponse.data); setRooms(roomResponse.data); setMessages(messageResponse.data); setUsers(userResponse.data); setOrders(orderResponse.data); setBookings(bookingResponse.data); setStats(statsResponse.data)
      setActivities(activityResponse.data.activities)
      latestActivityId.current = Math.max(latestActivityId.current, ...activityResponse.data.activities.map((item) => item.id), 0)
      activityReady.current = true
    } catch (requestError) { setError(requestError.response?.data?.error || 'Dashboard data could not be loaded.') }
    finally { if (showLoading) setLoading(false) }
  }
  useEffect(() => {
    let active = true
    fetchDashboardData().then(([foodResponse, roomResponse, messageResponse, userResponse, orderResponse, bookingResponse, statsResponse, activityResponse]) => {
      if (!active) return
      setFoods(foodResponse.data)
      setRooms(roomResponse.data)
      setMessages(messageResponse.data)
      setUsers(userResponse.data)
      setOrders(orderResponse.data)
      setBookings(bookingResponse.data)
      setStats(statsResponse.data)
      setActivities(activityResponse.data.activities)
      latestActivityId.current = Math.max(...activityResponse.data.activities.map((item) => item.id), 0)
      activityReady.current = true
    }).catch((requestError) => {
      if (active) setError(requestError.response?.data?.error || 'Dashboard data could not be loaded.')
    }).finally(() => {
      if (active) setLoading(false)
    })
    return () => { active = false }
  }, [])
  useEffect(() => {
    refreshRef.current = () => loadData(false)
  })
  useEffect(() => {
    const timer = window.setInterval(async () => {
      if (!activityReady.current) return
      try {
        const { data } = await api.get('/admin/activity', { params: { after: latestActivityId.current } })
        if (!data.activities.length) return
        latestActivityId.current = Math.max(...data.activities.map((item) => item.id), latestActivityId.current)
        setActivities((current) => [...current, ...data.activities].slice(-50))
        setUnseenActivityCount((count) => count + data.activities.length)
        setNotice(`${data.activities.length} new website ${data.activities.length === 1 ? 'activity' : 'activities'}.`)
        toast.success(`${data.activities.length} new website ${data.activities.length === 1 ? 'activity' : 'activities'}.`)
        await refreshRef.current?.()
      } catch (requestError) {
        setError(requestError.response?.data?.error || 'New website activity could not be loaded.')
      }
    }, 5000)
    return () => window.clearInterval(timer)
  }, [toast])
  useEffect(() => {
    const timer = window.setInterval(async () => {
      try {
        const { data } = await api.get('/admin/stats')
        setStats(data)
      } catch (requestError) {
        setError(requestError.response?.data?.error || 'Dashboard statistics could not be refreshed.')
      }
    }, 15000)
    return () => window.clearInterval(timer)
  }, [])
  useEffect(() => {
    if (!analyticsOpen) return undefined
    let active = true
    api.get('/admin/analytics', { params: { range: analyticsRange, date: analyticsDate } }).then(({ data }) => {
      if (active) setAnalytics(data)
    }).catch((requestError) => {
      if (active) setAnalyticsError(requestError.response?.data?.error || 'Analytics could not be loaded.')
    }).finally(() => {
      if (active) setAnalyticsLoading(false)
    })
    return () => { active = false }
  }, [analyticsOpen, analyticsRange, analyticsDate])
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
      setNotice(`Order #${String(order.id).slice(-8).toUpperCase()} updated.`)
      toast.success('Order status updated.')
    } catch (requestError) {
      const message = requestError.response?.data?.error || 'The order status could not be updated.'
      setError(message)
      toast.error(message)
    }
  }

  async function removeOrder(order) {
    if (!window.confirm(`Permanently delete order #${String(order.id).slice(-8).toUpperCase()}? This cannot be undone.`)) return
    try {
      await api.delete(`/admin/orders/${order.id}`)
      setOrders((current) => current.filter((item) => item.id !== order.id))
      setNotice(`Order #${String(order.id).slice(-8).toUpperCase()} deleted.`)
      toast.success('Order deleted.')
    } catch (requestError) {
      const message = requestError.response?.data?.error || 'The order could not be deleted.'
      setError(message)
      toast.error(message)
    }
  }

  async function removeBooking(booking) {
    if (!window.confirm(`Permanently delete the booking for room ${booking.room.roomNumber}? This cannot be undone.`)) return
    try {
      await api.delete(`/admin/bookings/${booking.id}`)
      setBookings((current) => current.filter((item) => item.id !== booking.id))
      setNotice(`Booking for room ${booking.room.roomNumber} deleted.`)
      toast.success('Booking deleted.')
    } catch (requestError) {
      const message = requestError.response?.data?.error || 'The booking could not be deleted.'
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

  async function openPageViews(offset = 0) {
    setPageViewsOpen(true)
    setPageViewsOffset(offset)
    setPageViews(null)
    try {
      const { data } = await api.get('/admin/page-views', { params: { offset } })
      setPageViews(data)
    } catch (requestError) {
      const message = requestError.response?.data?.error || 'Page views could not be loaded.'
      setError(message)
      toast.error(message)
    }
  }

  function shiftAnalyticsDate(direction) {
    const [year, month, day] = analyticsDate.split('-').map(Number)
    const date = new Date(Date.UTC(year, month - 1, day))
    if (analyticsRange === 'day') date.setUTCDate(date.getUTCDate() + direction)
    else if (analyticsRange === 'week') date.setUTCDate(date.getUTCDate() + direction * 7)
    else {
      date.setUTCDate(1)
      if (analyticsRange === 'month') date.setUTCMonth(date.getUTCMonth() + direction)
      else date.setUTCFullYear(date.getUTCFullYear() + direction)
      date.setUTCDate(Math.min(day, new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate()))
    }
    changeAnalyticsDate(date.toISOString().slice(0, 10))
  }

  function changeAnalyticsRange(range) {
    setAnalytics(null)
    setAnalyticsLoading(true)
    setAnalyticsError('')
    setAnalyticsRange(range)
  }

  function changeAnalyticsDate(date) {
    setAnalytics(null)
    setAnalyticsLoading(true)
    setAnalyticsError('')
    setAnalyticsDate(date || utcDateInput())
  }

  function toggleAnalytics() {
    const nextOpen = !analyticsOpen
    setAnalyticsOpen(nextOpen)
    if (nextOpen) {
      setAnalyticsLoading(true)
      setAnalyticsError('')
    }
  }

  const activeCount = activeTab === 'foods' ? foods.length : activeTab === 'rooms' ? rooms.length : activeTab === 'messages' ? messages.length : activeTab === 'users' ? users.length : activeTab === 'orders' ? orders.length : bookings.length
  const visibleOrders = orders.filter((order) => orderFilter === 'ALL' || order.status === orderFilter)
  return <div className="min-h-[75vh] bg-paper">
    <div className="border-b border-ink/10 bg-mist/65"><div className="mx-auto max-w-[1440px] px-5 py-10 md:px-10 md:py-14"><p className="eyebrow text-[10px] text-citrus">The back office</p><div className="mt-2 flex flex-wrap items-end justify-between gap-5"><div><h1 className="font-display text-4xl md:text-5xl">Admin dashboard</h1><p className="mt-2 text-sm text-ink/55">Keep the good things in order.</p></div><div className="flex flex-wrap gap-2"><button type="button" onClick={() => { setActivityOpen((value) => !value); setUnseenActivityCount(0) }} className="relative inline-flex items-center gap-2 rounded-full border border-ink/15 bg-white px-4 py-2.5 text-xs font-semibold hover:border-forest"><Bell size={14} /> Activity{unseenActivityCount > 0 && <span className="grid min-h-5 min-w-5 place-items-center rounded-full bg-citrus px-1 text-[10px] text-white">{unseenActivityCount}</span>}</button><button type="button" onClick={openPageViews} className="inline-flex items-center gap-2 rounded-full border border-ink/15 bg-white px-4 py-2.5 text-xs font-semibold hover:border-forest"><Eye size={14} /> Page Views {stats?.totalPageViews?.toLocaleString() ?? '—'}</button><button onClick={loadData} className="inline-flex items-center gap-2 rounded-full border border-ink/15 bg-white px-4 py-2.5 text-xs font-semibold hover:border-forest"><ArrowDown size={14} /> Refresh</button></div></div>{activityOpen && <div className="mt-5 max-h-72 overflow-y-auto rounded-[5px] border border-ink/10 bg-white p-4">{activities.length ? activities.slice().reverse().slice(0, 10).map((activity) => <div key={activity.id} className="border-b border-ink/10 py-2 last:border-0"><p className="text-xs font-semibold">{activity.actor}</p><p className="mt-1 text-xs text-ink/65">{activity.action}</p><p className="mt-1 text-[10px] text-ink/40">{formatDate(activity.createdAt)}</p></div>) : <p className="text-xs text-ink/50">No website activity recorded yet.</p>}</div>}</div></div>
    <div className="mx-auto max-w-[1440px] px-5 py-8 md:px-10 md:py-12"><div className="mb-7 flex flex-wrap items-center justify-between gap-4"><div className="flex flex-wrap gap-1 rounded-full border border-ink/10 bg-white p-1">{tabs.map(({ id, label, icon: Icon }) => <button key={id} onClick={() => { setActiveTab(id); setError('') }} className={`inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-xs font-semibold transition-colors md:px-5 ${activeTab === id ? 'bg-forest text-white' : 'text-ink/60 hover:text-ink'}`}><Icon size={15} />{label}</button>)}</div><p className="text-xs text-ink/45">{activeCount} {activeTab === 'messages' ? 'messages' : activeTab === 'rooms' ? 'rooms' : activeTab === 'users' ? 'registered users' : activeTab === 'orders' ? 'orders' : activeTab === 'bookings' ? 'bookings' : 'menu items'}</p></div>
      {notice && <p role="status" className="mb-5 rounded-[4px] bg-mist px-4 py-3 text-sm text-forest">{notice}</p>}{error && <p role="alert" className="mb-5 rounded-[4px] bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      <div className="mb-4 flex justify-end"><button type="button" onClick={toggleAnalytics} aria-expanded={analyticsOpen} aria-controls="admin-sales-reports" className="inline-flex items-center gap-2 rounded-full border border-ink/15 bg-white px-4 py-2.5 text-xs font-semibold hover:border-forest"><ReceiptText size={14} />{analyticsOpen ? 'Hide sales reports' : 'Sales & visitor reports'}</button></div>
      <div id="admin-sales-reports" hidden={!analyticsOpen}>
        <AnalyticsPanel
          report={analytics}
          range={analyticsRange}
          date={analyticsDate}
          loading={analyticsLoading}
          error={analyticsError}
          onRangeChange={changeAnalyticsRange}
          onDateChange={changeAnalyticsDate}
          onShiftDate={shiftAnalyticsDate}
        />
      </div>
      {!loading && stats && <div className="mb-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{[{ label: 'Registered users', value: stats.totalUsers.toLocaleString() }, { label: 'Food orders', value: stats.totalOrders.toLocaleString() }, { label: 'Room bookings', value: stats.totalBookings.toLocaleString() }, { label: 'Total revenue', value: `$${Number(stats.totalRevenue).toFixed(2)}` }].map((stat) => <article key={stat.label} className="rounded-[5px] border border-ink/10 bg-white p-5"><p className="eyebrow text-[10px] text-ink/45">{stat.label}</p><p className="font-display mt-2 text-3xl">{stat.value}</p></article>)}</div>}
      {loading ? <div className="grid min-h-64 place-items-center text-forest"><LoaderCircle className="animate-spin" /></div> : <>
        {['foods', 'rooms'].includes(activeTab) && <div className="mb-5 flex justify-end"><button onClick={() => startCreate(activeTab === 'foods' ? 'food' : 'room')} className="inline-flex items-center gap-2 rounded-full bg-forest px-5 py-3 text-xs font-semibold text-white hover:bg-ink"><Plus size={15} /> Add {activeTab === 'foods' ? 'food item' : 'room'}</button></div>}
        {activeTab === 'foods' && <div className="overflow-hidden rounded-[5px] border border-ink/10 bg-white"><div className="hidden grid-cols-[1.5fr_1.3fr_.5fr_.6fr_auto] gap-4 border-b border-ink/10 bg-paper px-5 py-3 text-[10px] font-semibold uppercase tracking-wider text-ink/45 md:grid"><span>Item</span><span>Description</span><span>Price</span><span>Availability</span><span /></div>{foods.map((food) => <div key={food.id} className="grid gap-3 border-b border-ink/10 p-4 last:border-0 md:grid-cols-[1.5fr_1.3fr_.5fr_.6fr_auto] md:items-center md:gap-4 md:px-5"><div className="flex items-center gap-3"><img src={food.image} alt="" className="h-12 w-14 rounded-[3px] object-cover" /><span className="font-semibold">{food.title}<span className="ml-2 text-[10px] text-ink/45">{food.category || 'Uncategorized'}</span></span></div><p className="line-clamp-2 text-xs leading-5 text-ink/55">{food.description}</p><span className="text-sm font-semibold">${Number(food.price).toFixed(0)}</span><span className={`w-fit rounded-full px-2.5 py-1 text-[10px] font-semibold ${food.isAvailable ? 'bg-mist text-forest' : 'bg-red-50 text-red-700'}`}>{food.isAvailable ? 'Available' : 'Unavailable'}</span><ActionButtons onEdit={() => startEdit('food', food)} onDelete={() => removeRecord('food', food)} /></div>)}{!foods.length && <EmptyPanel label="No food items yet." />}</div>}
        {activeTab === 'rooms' && <div className="overflow-hidden rounded-[5px] border border-ink/10 bg-white"><div className="hidden grid-cols-[1fr_1.2fr_.6fr_.8fr_auto] gap-4 border-b border-ink/10 bg-paper px-5 py-3 text-[10px] font-semibold uppercase tracking-wider text-ink/45 md:grid"><span>Room</span><span>Type & bathroom</span><span>Nightly rate</span><span>Availability</span><span /></div>{rooms.map((room) => <div key={room.id} className="grid gap-3 border-b border-ink/10 p-4 last:border-0 md:grid-cols-[1fr_1.2fr_.6fr_.8fr_auto] md:items-center md:gap-4 md:px-5"><div className="flex items-center gap-3"><img src={room.image} alt="" className="h-12 w-14 rounded-[3px] object-cover" /><span className="font-semibold">{room.name || `Room ${room.roomNumber}`}</span></div><span className="text-xs text-ink/65">{room.type} · {room.hasEnsuiteBathroom ? 'Ensuite' : 'Shared'}</span><span className="text-sm font-semibold">${Number(room.pricePerNight).toFixed(0)}</span><span className={`w-fit rounded-full px-2.5 py-1 text-[10px] font-semibold ${room.isBooked ? 'bg-citrus/10 text-citrus' : 'bg-mist text-forest'}`}>{room.isBooked ? 'Booked' : 'Available'}</span><ActionButtons onEdit={() => startEdit('room', room)} onDelete={() => removeRecord('room', room)} /></div>)}{!rooms.length && <EmptyPanel label="No rooms yet." />}</div>}
        {activeTab === 'messages' && <div className="grid gap-4 md:grid-cols-2">{messages.map((message) => <article key={message.id} className="rounded-[5px] border border-ink/10 bg-white p-5 md:p-6"><div className="flex items-start justify-between gap-4"><div><p className="font-display text-2xl">{message.subject}</p><p className="mt-2 text-xs text-ink/55">{message.senderName} · <a href={`mailto:${message.email}`} className="text-forest hover:underline">{message.email}</a></p></div><button onClick={() => removeMessage(message)} className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-ink/45 transition-colors hover:bg-red-50 hover:text-red-700" aria-label={`Delete message from ${message.senderName}`}><Trash2 size={16} /></button></div><p className="mt-5 whitespace-pre-wrap text-sm leading-6 text-ink/75">{message.message}</p><p className="mt-5 text-[10px] uppercase tracking-wider text-ink/40">{formatDate(message.createdAt)}</p></article>)}{!messages.length && <EmptyPanel label="Your inbox is clear." />}</div>}
        {activeTab === 'users' && <div className="overflow-hidden rounded-[5px] border border-ink/10 bg-white"><div className="hidden grid-cols-[1fr_1.2fr_.65fr_.7fr_auto] gap-4 border-b border-ink/10 bg-paper px-5 py-3 text-[10px] font-semibold uppercase tracking-wider text-ink/45 md:grid"><span>Name</span><span>Email address</span><span>Role</span><span>Registered</span><span>Actions</span></div>{users.map((user) => <div key={user.id} className="grid gap-2 border-b border-ink/10 p-4 last:border-0 md:grid-cols-[1fr_1.2fr_.65fr_.7fr_auto] md:items-center md:gap-4 md:px-5"><span className="font-semibold">{user.name}</span><a href={`mailto:${user.email}`} className="text-sm text-forest hover:underline">{user.email}</a><span className={`w-fit rounded-full px-2.5 py-1 text-[10px] font-semibold ${user.role === 'ADMIN' ? 'bg-citrus/10 text-citrus' : 'bg-mist text-forest'}`}>{user.role}</span><span className="text-xs text-ink/55">{formatDate(user.createdAt)}</span><button type="button" disabled={user.id === currentUser?.id} onClick={() => removeUser(user)} className="inline-flex w-fit items-center gap-2 rounded-full border border-red-700/15 px-3 py-2 text-xs font-semibold text-red-700 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40" aria-label={`Delete ${user.name}`} title={user.id === currentUser?.id ? 'You cannot delete your own account' : undefined}><Trash2 size={14} /> Delete User</button></div>)}{!users.length && <EmptyPanel label="No registered users yet." />}</div>}
        {activeTab === 'orders' && <div>
          <div className="mb-5 flex flex-wrap gap-2">{['ALL', 'PENDING', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'].map((status) => <button key={status} onClick={() => setOrderFilter(status)} className={`rounded-full px-4 py-2 text-[10px] font-semibold uppercase tracking-wider ${orderFilter === status ? 'bg-forest text-white' : 'border border-ink/15 bg-white text-ink/60'}`}>{status.replaceAll('_', ' ')}</button>)}</div>
          <div className="grid gap-4 lg:grid-cols-2">{visibleOrders.map((order) => <article key={order.id} className="rounded-[5px] border border-ink/10 bg-white p-5 md:p-6">
            <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="eyebrow text-[10px] text-ink/45">Order #{String(order.id).slice(-8).toUpperCase()}</p><h2 className="font-display mt-2 text-2xl">{order.customerName || order.user.name}</h2><a href={`mailto:${order.user.email}`} className="mt-1 inline-block text-xs text-forest hover:underline">{order.user.email}</a><p className="mt-1 text-xs text-ink/55">{order.phone}</p></div>
             <div className="flex flex-wrap items-center gap-2"><button type="button" onClick={() => setReceiptOrder(order)} className="inline-flex items-center gap-2 rounded-full border border-ink/15 bg-white px-3 py-2 text-[10px] font-semibold hover:border-forest"><Printer size={14} /> Print Receipt</button><select aria-label="Update order status" value={order.status} onChange={(event) => updateOrderStatus(order, event.target.value)} className="rounded-full border border-ink/15 bg-paper px-3 py-2 text-[10px] font-semibold uppercase tracking-wider"><option value="PENDING">Pending</option><option value="OUT_FOR_DELIVERY">Out for delivery</option><option value="DELIVERED">Delivered</option><option value="CANCELLED">Cancelled</option></select><button type="button" onClick={() => removeOrder(order)} aria-label={`Delete order ${String(order.id).slice(-8).toUpperCase()}`} className="admin-delete-button print:hidden inline-flex items-center gap-2 rounded-full border border-red-700/15 px-3 py-2 text-[10px] font-semibold text-red-700 hover:bg-red-50"><Trash2 size={14} /> Delete</button></div>
            </div>
            <p className="mt-3 text-xs text-ink/55">Customer delivery confirmation: <span className="font-semibold">{order.deliveryConfirmation === 'RECEIVED' ? 'I got it' : order.deliveryConfirmation === 'NOT_RECEIVED' ? 'No get' : 'Not confirmed'}</span></p>
            <div className="mt-4 rounded-[4px] bg-paper p-3 text-xs leading-5"><p className="font-semibold">{order.deliveryType === 'ROOM_DELIVERY' ? `Room delivery · ${order.roomNumber}` : 'Home delivery'}</p>{order.deliveryType === 'HOME_DELIVERY' && <p>{[order.address, order.neighborhood, order.city].filter(Boolean).join(', ')}</p>}</div>
            <div className="mt-4 divide-y divide-ink/10 border-y border-ink/10">{order.items.map((item) => <div key={item.id} className="flex items-center gap-3 py-3"><img src={item.image} alt="" className="h-11 w-12 rounded-[3px] object-cover" /><span className="min-w-0 flex-1 text-sm">{item.quantity} × {item.title}</span><span className="shrink-0 text-sm font-semibold">${((item.priceAtPurchase ?? item.unitPrice) * item.quantity).toFixed(2)}</span></div>)}</div>
            {order.notes && <p className="mt-4 text-xs leading-5 text-ink/60"><span className="font-semibold text-ink/75">Kitchen note:</span> {order.notes}</p>}
            <div className="mt-4 flex items-center justify-between"><span className="text-[10px] uppercase tracking-wider text-ink/45">{new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(order.orderDate || order.createdAt))}</span><span className="font-semibold">Total ${Number(order.totalAmount ?? order.total).toFixed(2)}</span></div>
          </article>)}{!visibleOrders.length && <EmptyPanel label="No orders match this status." />}</div>
        </div>}
        {activeTab === 'bookings' && <div className="space-y-8"><section><div className="mb-4 flex items-end justify-between gap-4"><div><p className="eyebrow text-[10px] text-citrus">House inventory</p><h2 className="font-display mt-1 text-2xl">Room availability</h2></div><p className="text-xs text-ink/45">Block or reopen rooms</p></div><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{rooms.map((room) => { const activeReservation = bookings.some((booking) => booking.roomId === room.id && ['CONFIRMED', 'CHECKED_IN'].includes(booking.status) && new Date(booking.checkIn) <= new Date() && new Date(booking.checkOut) > new Date()); return <div key={room.id} className="flex items-center justify-between gap-3 rounded-[5px] border border-ink/10 bg-white p-4"><div><p className="text-sm font-semibold">Room {room.roomNumber}</p><p className="mt-1 text-[10px] text-ink/50">{room.name} · {activeReservation ? 'Current guest' : room.isBooked ? 'Blocked' : 'Available'}</p></div><button disabled={activeReservation} onClick={() => toggleRoomAvailability(room)} className={`rounded-full px-3 py-2 text-[10px] font-semibold ${activeReservation ? 'bg-ink/5 text-ink/35' : room.isBooked ? 'border border-ink/15 text-ink/65 hover:border-forest hover:text-forest' : 'bg-forest text-white hover:bg-ink'}`}>{activeReservation ? 'Occupied' : room.isBooked ? 'Mark available' : 'Mark booked'}</button></div> })}{!rooms.length && <EmptyPanel label="No rooms in the house." />}</div></section><section><div className="mb-4"><p className="eyebrow text-[10px] text-citrus">Guest reservations</p><h2 className="font-display mt-1 text-2xl">Rooms</h2></div>        <div className="grid gap-4 lg:grid-cols-2">{bookings.map((booking) => <article key={booking.id} className="rounded-[5px] border border-ink/10 bg-white p-5 md:p-6"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="eyebrow text-[10px] text-ink/45">Room {booking.room.roomNumber} · {booking.room.type}</p><h2 className="font-display mt-2 text-2xl">{booking.user.name}</h2><a href={`mailto:${booking.user.email}`} className="mt-1 inline-block text-xs text-forest hover:underline">{booking.user.email}</a></div><div className="flex flex-wrap items-center gap-2"><button type="button" onClick={() => setReceiptBooking(booking)} className="inline-flex items-center gap-2 rounded-full border border-ink/15 bg-white px-3 py-2 text-[10px] font-semibold hover:border-forest"><Printer size={14} /> Print Receipt</button><select aria-label="Update booking status" value={booking.status} onChange={(event) => updateBookingStatus(booking, event.target.value)} className="rounded-full border border-ink/15 bg-paper px-3 py-2 text-[10px] font-semibold uppercase tracking-wider"><option value="CONFIRMED">Confirmed</option><option value="CHECKED_IN">Checked in</option><option value="CANCELLED">Cancelled</option></select><button type="button" onClick={() => removeBooking(booking)} aria-label={`Delete booking for room ${booking.room.roomNumber}`} className="admin-delete-button print:hidden inline-flex items-center gap-2 rounded-full border border-red-700/15 px-3 py-2 text-[10px] font-semibold text-red-700 hover:bg-red-50"><Trash2 size={14} /> Delete</button></div></div><p className="mt-4 text-sm text-ink/65">{formatBookingDate(booking.checkIn)} – {formatBookingDate(booking.checkOut)}</p><div className="mt-4 flex justify-between border-t border-ink/10 pt-4 text-sm"><span className="text-ink/55">{booking.paymentStatus} · Customer: {booking.deliveryConfirmation === 'RECEIVED' ? 'I got it' : booking.deliveryConfirmation === 'NOT_RECEIVED' ? 'No get' : 'Not confirmed'}</span><span className="font-semibold">${Number(booking.totalPrice).toFixed(2)}</span></div></article>)}{!bookings.length && <EmptyPanel label="No room bookings yet." />}</div></section></div>}
      </>}</div>
    {pageViewsOpen && <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/50 p-0 backdrop-blur-sm sm:items-center sm:p-5" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setPageViewsOpen(false) }}>
      <section role="dialog" aria-modal="true" aria-labelledby="page-views-title" className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-t-[8px] bg-paper p-5 shadow-soft sm:rounded-[6px] sm:p-7">
        <div className="flex items-start justify-between"><div><p className="eyebrow text-[10px] text-citrus">Visitor analytics</p><h2 id="page-views-title" className="font-display mt-2 text-3xl">Page Views · {pageViews?.total?.toLocaleString() ?? '...'}</h2></div><button onClick={() => setPageViewsOpen(false)} aria-label="Close page views" className="grid h-9 w-9 place-items-center rounded-full border border-ink/15"><X size={17} /></button></div>
        <div className="mt-5 divide-y divide-ink/10 rounded-[5px] border border-ink/10 bg-white">
          {pageViews?.pageViews.map((view) => <div key={view.id} className="grid gap-1 px-4 py-3 sm:grid-cols-[1fr_1.3fr_1fr_auto] sm:items-center"><span className="text-sm font-semibold">{view.visitorName}</span><span className="text-xs text-ink/55">{view.visitorEmail || 'Guest visitor'}</span><span className="text-xs text-forest">{view.pagePath}</span><span className="text-[10px] text-ink/45">{formatDate(view.createdAt)}</span></div>)}
          {pageViews && !pageViews.pageViews.length && <p className="px-4 py-10 text-center text-sm text-ink/50">No page views recorded yet.</p>}
        </div>
        {pageViews && <div className="mt-4 flex items-center justify-between gap-3 text-xs text-ink/55"><span>{pageViews.total ? `${pageViewsOffset + 1}–${Math.min(pageViewsOffset + pageViews.pageViews.length, pageViews.total)} of ${pageViews.total}` : '0 visitors'}</span><div className="flex gap-2"><button type="button" disabled={pageViewsOffset === 0} onClick={() => openPageViews(Math.max(0, pageViewsOffset - 100))} className="rounded-full border border-ink/15 px-3 py-2 disabled:opacity-40">Previous</button><button type="button" disabled={pageViewsOffset + pageViews.pageViews.length >= pageViews.total} onClick={() => openPageViews(pageViewsOffset + 100)} className="rounded-full border border-ink/15 px-3 py-2 disabled:opacity-40">Next</button></div></div>}
      </section>
    </div>}
    {receiptOrder && <ReceiptModal order={receiptOrder} onClose={() => setReceiptOrder(null)} />}
    {receiptBooking && <BookingReceiptModal booking={receiptBooking} onClose={() => setReceiptBooking(null)} />}
    {editor && <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/50 p-0 backdrop-blur-sm sm:items-center sm:p-5" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setEditor(null) }}><section role="dialog" aria-modal="true" aria-labelledby="editor-title" className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-t-[8px] bg-paper p-5 shadow-soft sm:rounded-[6px] sm:p-7"><div className="flex items-start justify-between"><div><p className="eyebrow text-[10px] text-citrus">{editor.record ? 'Edit details' : 'Add to the house'}</p><h2 id="editor-title" className="font-display mt-2 text-3xl">{editor.record ? 'Update' : 'New'} {editor.type === 'food' ? 'menu item' : 'room'}</h2></div><button onClick={() => setEditor(null)} className="grid h-9 w-9 place-items-center rounded-full border border-ink/15" aria-label="Close form"><X size={17} /></button></div>
      <form onSubmit={saveRecord} className="mt-7 space-y-4">{editor.type === 'food' ? <><label className="field-label">Title<input className="field-input" name="title" value={editor.form.title} onChange={updateForm} required /></label><label className="field-label">Description<textarea className="field-input min-h-24" name="description" value={editor.form.description} onChange={updateForm} required /></label><div className="grid gap-4 sm:grid-cols-2"><label className="field-label">Category<select className="field-input" name="category" value={editor.form.category || ''} onChange={updateForm}><option value="">Uncategorized</option><option value="BREAKFAST">Breakfast</option><option value="LUNCH">Lunch</option><option value="DINNER">Dinner</option></select></label><label className="field-label">Price<input className="field-input" name="price" type="number" min="0" step="0.01" value={editor.form.price} onChange={updateForm} required /></label></div><label className="field-label">Image URL<input className="field-input" name="image" type="url" value={editor.form.image} onChange={updateForm} required /></label><label className="flex items-center gap-3 text-sm"><input type="checkbox" name="isAvailable" checked={editor.form.isAvailable} onChange={updateForm} className="h-4 w-4 accent-forest" />Available to order</label></> : <><div className="grid gap-4 sm:grid-cols-2"><label className="field-label">Room number<input className="field-input" name="roomNumber" value={editor.form.roomNumber} onChange={updateForm} required /></label><label className="field-label">Room name<input className="field-input" name="name" value={editor.form.name} onChange={updateForm} required /></label></div><div className="grid gap-4 sm:grid-cols-2"><label className="field-label">Room type<select className="field-input" name="type" value={editor.form.type} onChange={updateForm}>{[['STANDARD', 'Standard'], ['DELUXE', 'Deluxe'], ['FAMILY', 'Family']].map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label className="field-label">Nightly rate<input className="field-input" name="pricePerNight" type="number" min="0" step="0.01" value={editor.form.pricePerNight} onChange={updateForm} required /></label></div><label className="field-label">Description<textarea className="field-input min-h-20" name="description" value={editor.form.description} onChange={updateForm} required /></label><label className="field-label">Image URL<input className="field-input" name="image" type="url" value={editor.form.image} onChange={updateForm} required /></label><label className="flex items-center gap-3 text-sm"><input type="checkbox" name="hasEnsuiteBathroom" checked={editor.form.hasEnsuiteBathroom} onChange={updateForm} className="h-4 w-4 accent-forest" />Private ensuite bathroom</label><label className="flex items-center gap-3 text-sm"><input type="checkbox" name="isBooked" checked={editor.form.isBooked} onChange={updateForm} className="h-4 w-4 accent-forest" />Mark room unavailable for all dates</label></>}
        <div className="flex justify-end gap-3 border-t border-ink/10 pt-5"><button type="button" onClick={() => setEditor(null)} className="rounded-full border border-ink/20 px-5 py-3 text-xs font-semibold">Cancel</button><button disabled={saving} className="inline-flex items-center gap-2 rounded-full bg-forest px-5 py-3 text-xs font-semibold text-white disabled:opacity-60">{saving ? <LoaderCircle size={14} className="animate-spin" /> : null}{saving ? 'Saving...' : 'Save changes'}</button></div>
      </form></section></div>}
  </div>
}

function ActionButtons({ onEdit, onDelete }) { return <div className="flex items-center gap-1"><button onClick={onEdit} className="grid h-9 w-9 place-items-center rounded-full text-ink/50 hover:bg-mist hover:text-forest" aria-label="Edit"><Pencil size={15} /></button><button onClick={onDelete} className="grid h-9 w-9 place-items-center rounded-full text-ink/50 hover:bg-red-50 hover:text-red-700" aria-label="Delete"><Trash2 size={15} /></button></div> }
function EmptyPanel({ label }) { return <div className="rounded-[5px] border border-dashed border-ink/15 bg-white px-6 py-16 text-center text-sm text-ink/50">{label}</div> }

function AnalyticsPanel({ report, range, date, loading, error, onRangeChange, onDateChange, onShiftDate }) {
  const rangeLabel = range[0].toUpperCase() + range.slice(1)
  const maxRevenue = Math.max(1, ...(report?.trend || []).map((bucket) => bucket.revenue))
  const maxViews = Math.max(1, ...(report?.trend || []).map((bucket) => bucket.pageViews))
  const revenuePoints = (report?.trend || []).map((bucket, index, buckets) => {
    const x = buckets.length < 2 ? 450 : 20 + (index / (buckets.length - 1)) * 860
    const y = 175 - (bucket.revenue / maxRevenue) * 150
    return `${x},${y}`
  }).join(' ')
  const viewPoints = (report?.trend || []).map((bucket, index, buckets) => {
    const x = buckets.length < 2 ? 450 : 20 + (index / (buckets.length - 1)) * 860
    const y = 175 - (bucket.pageViews / maxViews) * 150
    return `${x},${y}`
  }).join(' ')

  return <section aria-labelledby="analytics-heading" className="mb-7 rounded-[5px] border border-ink/10 bg-white p-4 md:p-6">
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div><p className="eyebrow text-[10px] text-citrus">Database reports</p><h2 id="analytics-heading" className="font-display mt-1 text-2xl">Sales & visitor analytics</h2><p className="mt-1 text-xs text-ink/50">{report ? `${formatAnalyticsDate(report.startDate)} – ${formatAnalyticsDate(new Date(new Date(report.endDate).getTime() - 1))}` : `Current ${rangeLabel.toLowerCase()} view`}</p></div>
      <div className="flex flex-wrap items-end gap-2">
        <button type="button" onClick={() => onShiftDate(-1)} aria-label={`Previous ${range}`} className="h-10 rounded-full border border-ink/15 px-3 text-sm hover:border-forest">←</button>
        <label className="field-label">Range<select className="field-input mt-1 min-w-28" value={range} onChange={(event) => onRangeChange(event.target.value)}><option value="day">Day</option><option value="week">Week</option><option value="month">Month</option><option value="year">Year</option></select></label>
        <label className="field-label">Date<input className="field-input mt-1" type="date" value={date} onChange={(event) => onDateChange(event.target.value)} /></label>
        <button type="button" onClick={() => onShiftDate(1)} aria-label={`Next ${range}`} className="h-10 rounded-full border border-ink/15 px-3 text-sm hover:border-forest">→</button>
      </div>
    </div>
    {error && <p role="alert" className="mt-4 rounded-[4px] bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
    {loading ? <div className="grid min-h-40 place-items-center text-sm text-ink/50">Loading report…</div> : report && <>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Revenue" value={`$${Number(report.summary.revenue).toFixed(2)}`} />
        <MetricCard label="Food orders" value={report.summary.foodOrders.toLocaleString()} />
        <MetricCard label="Room bookings" value={report.summary.roomBookings.toLocaleString()} />
        <MetricCard label="Page views" value={report.summary.pageViews.toLocaleString()} />
        <MetricCard label="Registered visitors" value={report.summary.registeredVisitors.toLocaleString()} />
        <MetricCard label="Guest page views" value={report.summary.guestPageViews.toLocaleString()} />
        <MetricCard label="Transactions" value={report.summary.transactionCount.toLocaleString()} detail="Food orders + room bookings" />
        <MetricCard label="Top-selling item" value={report.topSellingItem?.name || '—'} detail={report.topSellingItem ? `${report.topSellingItem.sales} ${report.topSellingItem.type === 'food' ? 'sold' : 'bookings'}` : 'No sales in range'} />
        <MetricCard label="Best-selling day" value={report.bestSellingDay ? formatAnalyticsDate(`${report.bestSellingDay.date}T00:00:00Z`) : '—'} detail={report.bestSellingDay ? `$${Number(report.bestSellingDay.revenue).toFixed(2)} revenue` : 'No sales in range'} />
      </div>
      <div className="mt-5 rounded-[5px] border border-ink/10 bg-paper/60 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3"><h3 className="font-display text-xl">{rangeLabel} revenue & page views</h3><div className="flex gap-4 text-[10px] text-ink/55"><span className="inline-flex items-center gap-2"><i className="h-2 w-2 rounded-full bg-forest" />Revenue</span><span className="inline-flex items-center gap-2"><i className="h-2 w-2 rounded-full bg-citrus" />Page views</span></div></div>
        <div className="mt-3 overflow-x-auto"><svg role="img" aria-label={`${rangeLabel} chart comparing revenue and page views`} viewBox="0 0 900 205" className="h-48 min-w-[560px] w-full">
          {[25, 75, 125, 175].map((y) => <line key={y} x1="20" x2="880" y1={y} y2={y} stroke="currentColor" className="text-ink/10" strokeDasharray="3 5" />)}
          {revenuePoints && <polyline points={revenuePoints} fill="none" stroke="#174c3c" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />}
          {viewPoints && <polyline points={viewPoints} fill="none" stroke="#d4a638" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />}
          {report.trend.map((bucket, index) => {
            const showLabel = report.trend.length <= 12 || index === 0 || index === report.trend.length - 1 || index % Math.ceil(report.trend.length / 6) === 0
            const x = report.trend.length < 2 ? 450 : 20 + (index / (report.trend.length - 1)) * 860
            return <g key={bucket.key}><title>{`${bucket.label}: $${bucket.revenue.toFixed(2)} revenue, ${bucket.pageViews} views`}</title><circle cx={x} cy={175 - (bucket.revenue / maxRevenue) * 150} r="3" fill="#174c3c" /><circle cx={x} cy={175 - (bucket.pageViews / maxViews) * 150} r="3" fill="#d4a638" />{showLabel && <text x={x} y="198" textAnchor="middle" fontSize="10" fill="#6b7280">{bucket.label}</text>}</g>
          })}
        </svg></div>
      </div>
      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <AnalyticsList title="Best-selling food" empty="No food sales in this period." items={report.bestSellingFoods.map((item) => ({ key: item.name, title: item.name, detail: `${item.quantity} sold · $${item.revenue.toFixed(2)}` }))} />
        <AnalyticsList title="Best-selling rooms" empty="No room bookings in this period." items={report.bestSellingRooms.map((item) => ({ key: item.id, title: `${item.name} · Room ${item.roomNumber}`, detail: `${item.bookings} bookings · $${item.revenue.toFixed(2)}` }))} />
        <AnalyticsList title="Visitor analytics" empty="No page views in this period." items={report.visitors.map((visitor) => ({ key: `${visitor.client ? 'user' : 'guest'}-${visitor.name}-${visitor.email || ''}`, title: visitor.name || 'No client', detail: `${visitor.client ? 'Registered client' : 'No client'} · ${visitor.views} page views${visitor.email ? ` · ${visitor.email}` : ''}` }))} />
        <AnalyticsList title="Most viewed pages" empty="No page views in this period." items={report.topPages.map((item) => ({ key: item.page, title: item.page, detail: `${item.pageViews} views` }))} />
      </div>
      <section className="mt-5 overflow-hidden rounded-[5px] border border-ink/10" aria-labelledby="transaction-report-heading">
        <div className="flex flex-wrap items-end justify-between gap-2 border-b border-ink/10 bg-paper/60 px-4 py-3">
          <div><h3 id="transaction-report-heading" className="font-display text-lg">Recent transactions</h3><p className="mt-1 text-[10px] text-ink/50">Latest {report.transactions.length} of {report.summary.transactionCount} in this period</p></div>
          <p className="text-xs font-semibold">Period revenue · ${Number(report.summary.revenue).toFixed(2)}</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-xs">
            <thead className="bg-white text-[9px] uppercase tracking-wider text-ink/45"><tr><th className="px-4 py-3 font-semibold">Date</th><th className="px-4 py-3 font-semibold">Customer</th><th className="px-4 py-3 font-semibold">Transaction</th><th className="px-4 py-3 font-semibold">Status</th><th className="px-4 py-3 text-right font-semibold">Amount</th></tr></thead>
            <tbody className="divide-y divide-ink/10">
              {report.transactions.map((transaction) => <tr key={transaction.id}>
                <td className="whitespace-nowrap px-4 py-3 text-ink/60">{new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(transaction.createdAt))}</td>
                <td className="px-4 py-3 font-medium">{transaction.customer}</td>
                <td className="max-w-[260px] px-4 py-3"><span className="font-medium">{transaction.type}</span><span className="mt-1 block truncate text-[10px] text-ink/50" title={transaction.description}>{transaction.description}</span></td>
                <td className="px-4 py-3"><span className="whitespace-nowrap">{transaction.status}</span><span className="mt-1 block text-[10px] text-ink/50">{transaction.paymentStatus}</span></td>
                <td className="whitespace-nowrap px-4 py-3 text-right font-semibold">${Number(transaction.amount).toFixed(2)}</td>
              </tr>)}
              {!report.transactions.length && <tr><td colSpan="5" className="px-4 py-8 text-center text-ink/50">No transactions in this period.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </>}
  </section>
}

function MetricCard({ label, value, detail }) {
  return <article className="min-w-0 rounded-[5px] border border-ink/10 bg-paper/60 p-4"><p className="eyebrow text-[9px] text-ink/45">{label}</p><p className="mt-2 truncate font-display text-xl" title={String(value)}>{value}</p>{detail && <p className="mt-1 truncate text-[10px] text-ink/50">{detail}</p>}</article>
}

function formatAnalyticsDate(date) {
  return new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(date))
}

function AnalyticsList({ title, empty, items }) {
  return <section className="rounded-[5px] border border-ink/10 p-4"><h3 className="font-display text-lg">{title}</h3>{items.length ? <ol className="mt-2 divide-y divide-ink/10">{items.map((item, index) => <li key={item.key} className="flex items-start gap-3 py-2"><span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-mist text-[10px] font-semibold text-forest">{index + 1}</span><div className="min-w-0"><p className="truncate text-sm font-semibold">{item.title}</p><p className="mt-0.5 text-[10px] text-ink/50">{item.detail}</p></div></li>)}</ol> : <p className="mt-3 text-xs text-ink/45">{empty}</p>}</section>
}