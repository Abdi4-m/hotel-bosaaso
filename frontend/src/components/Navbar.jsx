import { useState } from 'react'
import { ArrowUpRight, Menu as MenuIcon, ShoppingBag, X } from 'lucide-react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/useAuth'
import { useCart } from '../context/useCart'

const links = [{ to: '/', label: 'Home' }, { to: '/menu', label: 'Restaurant' }, { to: '/rooms', label: 'Rooms' }, { to: '/contact', label: 'Contact' }]

export default function Navbar() {
  const [open, setOpen] = useState(false)
  const { isLoggedIn, isAdmin, isAuthLoading, user, signOut } = useAuth()
  const { cartCount } = useCart()
  const navigate = useNavigate()
  async function handleSignOut() { await signOut(); setOpen(false); navigate('/') }
  const linkClass = ({ isActive }) => `nav-link ${isActive ? 'nav-link-active' : ''}`

  return (
    <header className="sticky top-0 z-40 border-b border-ink/10 bg-paper/95 backdrop-blur-md">
      <div className="mx-auto flex h-[76px] max-w-[1440px] items-center justify-between px-5 md:px-10">
        <Link to="/" onClick={() => setOpen(false)} className="group flex items-center gap-3" aria-label="Hotel Bosaso home"><span className="grid h-10 w-10 place-items-center rounded-full bg-forest text-sm font-semibold tracking-tight text-white transition-transform group-hover:rotate-6">HB</span><span className="leading-tight"><span className="block font-display text-[19px] font-semibold">Hotel Bosaso</span><span className="eyebrow block text-[9px] text-ink/55">Rooms and staying house bosaso</span></span></Link>
        <nav className="hidden items-center gap-8 lg:flex" aria-label="Main navigation">{links.map((link) => <NavLink key={link.to} to={link.to} end={link.to === '/'} className={linkClass}>{link.label}</NavLink>)}</nav>
        <div className="hidden items-center gap-3 lg:flex"><CartLink count={cartCount} />{isAuthLoading ? null : isLoggedIn ? <><Link className="nav-link" to="/account">My account</Link><span className="hidden text-xs text-ink/60 xl:block"> {user?.name?.split(' ')[0]}</span>{isAdmin && <Link className="nav-link" to="/admin">Admin Dashboard</Link>}<button onClick={handleSignOut} className="rounded-full border border-ink/20 px-4 py-2 text-sm font-semibold transition-colors hover:border-ink hover:bg-white">Log out</button></> : <><Link to="/signin" className="px-2 py-2 text-sm font-semibold transition-colors hover:text-citrus">Sign in</Link><Link to="/signup" className="inline-flex items-center gap-2 rounded-full bg-forest px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-ink">Join now<ArrowUpRight size={15} /></Link></>}</div>
        <div className="flex items-center gap-2 lg:hidden"><CartLink count={cartCount} compact /><button onClick={() => setOpen(!open)} className="grid h-11 w-11 place-items-center rounded-full border border-ink/15" aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open}>{open ? <X size={20} /> : <MenuIcon size={20} />}</button></div>
      </div>
      {open && <div className="absolute inset-x-0 top-full border-b border-ink/10 bg-paper px-5 pb-6 pt-3 shadow-soft lg:hidden"><nav className="flex flex-col" aria-label="Mobile navigation">{links.map((link) => <NavLink key={link.to} to={link.to} end={link.to === '/'} onClick={() => setOpen(false)} className={({ isActive }) => `border-b border-ink/10 py-4 font-display text-2xl ${isActive ? 'text-forest' : ''}`}>{link.label}</NavLink>)}{!isAuthLoading && <div className="flex flex-wrap gap-3 pt-5">{isLoggedIn ? <><Link onClick={() => setOpen(false)} to="/account" className="rounded-full border border-ink/20 px-5 py-3 text-sm font-semibold">My account</Link>{isAdmin && <Link onClick={() => setOpen(false)} to="/admin" className="rounded-full border border-ink/20 px-5 py-3 text-sm font-semibold">Admin Dashboard</Link>}<button onClick={handleSignOut} className="rounded-full border border-ink/20 px-5 py-3 text-sm font-semibold">Log out</button></> : <><Link onClick={() => setOpen(false)} to="/signin" className="rounded-full border border-ink/20 px-5 py-3 text-sm font-semibold">Sign in</Link><Link onClick={() => setOpen(false)} to="/signup" className="rounded-full bg-forest px-5 py-3 text-sm font-semibold text-white">Join now</Link></>}</div>}</nav></div>}
    </header>
  )
}

function CartLink({ count, compact = false }) {
  return <Link to="/cart" aria-label={`Cart, ${count} items`} className={`relative inline-flex h-11 items-center justify-center gap-2 rounded-full border border-ink/15 text-sm font-semibold transition-colors hover:border-forest hover:text-forest ${compact ? 'w-11' : 'px-4'}`}><ShoppingBag size={17} />{!compact && <span>Cart</span>}{count > 0 && <span className="grid min-h-5 min-w-5 place-items-center rounded-full bg-citrus px-1 text-[10px] text-white">{count}</span>}</Link>
}