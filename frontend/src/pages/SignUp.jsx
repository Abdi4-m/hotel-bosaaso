import { useState } from 'react'
import { ArrowLeft, ArrowRight, Sparkles } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/useAuth'

export default function SignUp() {
  const { signUp } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  async function submit(event) {
    event.preventDefault(); setBusy(true); setError('')
    try { await signUp(form); navigate('/', { replace: true }) }
    catch (requestError) { setError(requestError.response?.data?.error || 'We could not create your account. Please try again.') }
    finally { setBusy(false) }
  }

  return <div className="grid min-h-[650px] bg-paper md:grid-cols-2"><div className="relative hidden overflow-hidden bg-citrus md:block"><img src="https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=1400&q=85" alt="Dinner ready in the Hotel Bosaso dining room" className="absolute inset-0 h-full w-full object-cover opacity-75" /><div className="absolute inset-0 bg-ink/35" /><div className="absolute bottom-12 left-10 right-10 text-white"><p className="eyebrow text-[10px] text-white/70">A seat with your name on it</p><p className="font-display mt-3 max-w-md text-4xl leading-tight">Good food. Soft sheets. No rush.</p></div></div><div className="flex items-center justify-center px-5 py-14 md:px-12"><div className="w-full max-w-md"><Link to="/" className="inline-flex items-center gap-2 text-xs font-semibold text-ink/50 hover:text-forest"><ArrowLeft size={14} /> Back to the house</Link><span className="mt-10 grid h-12 w-12 place-items-center rounded-full bg-mist text-forest"><Sparkles size={20} /></span><p className="eyebrow mt-7 text-[10px] text-citrus">Join the house</p><h1 className="font-display mt-2 text-4xl">Make yourself at home.</h1><p className="mt-3 text-sm text-ink/55">A little closer to your next good room.</p>
    <form onSubmit={submit} className="mt-8 space-y-5">{error && <p role="alert" className="rounded-[4px] bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}<label className="field-label">Your name<input className="field-input" autoComplete="name" required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label><label className="field-label">Email address<input className="field-input" type="email" autoComplete="email" required value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></label><label className="field-label">Password<input className="field-input" type="password" autoComplete="new-password" minLength={8} required value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} /><span className="mt-1 block text-[11px] font-normal text-ink/45">At least 8 characters</span></label><button disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-full bg-forest px-5 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-ink disabled:opacity-60">{busy ? 'Creating account...' : <>Create account <ArrowRight size={15} /></>}</button></form><p className="mt-7 text-center text-sm text-ink/55">Already a guest? <Link to="/signin" className="font-semibold text-forest hover:text-citrus">Sign in</Link></p></div></div></div>
}