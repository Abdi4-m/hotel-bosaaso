import { Printer, X } from 'lucide-react'

const formatPrice = (price) => `$${Number(price).toFixed(2)}`

function deliveryAddress(order) {
  if (order.deliveryType === 'ROOM_DELIVERY') return `Room ${order.roomNumber}`
  return [order.address, order.neighborhood, order.city].filter(Boolean).join(', ')
}

export default function ReceiptModal({ order, onClose }) {
  const reference = String(order.id).slice(-8).toUpperCase()
  const orderDate = order.orderDate || order.createdAt

  return <div className="receipt-backdrop fixed inset-0 z-50 flex items-end justify-center overflow-y-auto bg-ink/50 p-0 backdrop-blur-sm sm:items-center sm:p-5" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose?.() }}>
    <section className="receipt-dialog max-h-[94vh] w-full max-w-2xl overflow-y-auto rounded-t-[8px] bg-white p-5 shadow-soft sm:rounded-[6px] sm:p-8" role="dialog" aria-modal="true" aria-labelledby="receipt-title">
      <div className="receipt-actions mb-5 flex justify-end gap-2"><button type="button" onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-full bg-forest px-4 py-2.5 text-xs font-semibold text-white hover:bg-ink"><Printer size={15} /> dabac xogta</button>{onClose && <button type="button" onClick={onClose} aria-label="Close receipt" className="grid h-10 w-10 place-items-center rounded-full border border-ink/15"><X size={17} /></button>}</div>
      <div className="receipt-print-sheet border border-ink/10 p-5 sm:p-8">
        <header className="flex items-start justify-between gap-4 border-b-2 border-ink pb-5">
          <div><div className="flex items-center gap-2"><span className="grid h-9 w-9 place-items-center rounded-full bg-forest text-[11px] font-bold text-white">HB</span><h2 id="receipt-title" className="font-display text-2xl">Hotel Bosaso</h2></div><p className="mt-2 text-[10px] uppercase tracking-wider text-ink/50">Rooms and dining · Hudson Valley, NY</p></div>
          <div className="text-right"><p className="text-[10px] font-semibold uppercase tracking-wider text-ink/45">Receipt</p><p className="mt-1 font-mono text-sm font-semibold">#{reference}</p></div>
        </header>
        <div className="grid gap-5 border-b border-ink/15 py-5 text-xs sm:grid-cols-2"><div><p className="font-semibold uppercase tracking-wider text-ink/45">Customer</p><p className="mt-2 font-semibold">{order.customerName || order.user?.name}</p><p className="mt-1">{order.user?.email}</p><p className="mt-1">{order.phone}</p></div><div><p className="font-semibold uppercase tracking-wider text-ink/45">Delivery</p><p className="mt-2 font-semibold">{order.deliveryType === 'ROOM_DELIVERY' ? 'Room delivery' : 'Home delivery'}</p><p className="mt-1 leading-5">{deliveryAddress(order)}</p></div><div><p className="font-semibold uppercase tracking-wider text-ink/45">Placed</p><p className="mt-2">{new Intl.DateTimeFormat('en', { dateStyle: 'long', timeStyle: 'short' }).format(new Date(orderDate))}</p></div><div><p className="font-semibold uppercase tracking-wider text-ink/45">Status</p><p className="mt-2">{order.status}</p></div></div>
        <table className="w-full border-collapse text-left text-xs"><thead><tr className="border-b border-ink/15 text-[10px] uppercase tracking-wider text-ink/50"><th className="py-3 font-semibold">Item</th><th className="py-3 text-center font-semibold">Qty</th><th className="py-3 text-right font-semibold">Price</th><th className="py-3 text-right font-semibold">Total</th></tr></thead><tbody>{order.items.map((item) => { const price = item.priceAtPurchase ?? item.unitPrice; return <tr key={item.id} className="border-b border-ink/10"><td className="py-3 pr-3">{item.title}</td><td className="py-3 text-center">{item.quantity}</td><td className="py-3 text-right">{formatPrice(price)}</td><td className="py-3 text-right">{formatPrice(price * item.quantity)}</td></tr> })}</tbody></table>
        <div className="ml-auto mt-5 max-w-64 space-y-2 text-xs"><div className="flex justify-between"><span>Subtotal</span><span>{formatPrice(order.subtotal ?? order.totalAmount ?? order.total)}</span></div><div className="flex justify-between"><span>Tax</span><span>{formatPrice(order.taxAmount ?? 0)}</span></div><div className="flex justify-between border-t border-ink pt-3 text-sm font-bold"><span>Grand total</span><span>{formatPrice(order.totalAmount ?? order.total)}</span></div></div>
        {order.notes && <p className="mt-6 border-t border-ink/15 pt-4 text-xs"><span className="font-semibold">Notes:</span> {order.notes}</p>}
        <footer className="mt-8 border-t border-ink/15 pt-4 text-center text-[10px] leading-5 text-ink/50">Thank you for choosing Hotel Bosaso.<br />This receipt confirms your order. Payment is collected on delivery.</footer>
      </div>
    </section>
  </div>
}