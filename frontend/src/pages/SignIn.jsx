import { useState } from 'react'
import { ArrowLeft, ArrowRight, KeyRound } from 'lucide-react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/useAuth'

export default function SignIn() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  async function submit(event) {
    event.preventDefault(); setBusy(true); setError('')
    try {
      const user = await signIn(form)
      const requestedPath = location.state?.from?.pathname
      navigate(user.role === 'ADMIN' ? '/admin' : requestedPath === '/admin' ? '/' : requestedPath || '/', { replace: true })
    }
    catch (requestError) { setError(requestError.response?.data?.error || 'We could not sign you in. Please try again.') }
    finally { setBusy(false) }
  }

  return <div className="grid min-h-[650px] bg-paper md:grid-cols-2"><div className="relative hidden overflow-hidden bg-forest md:block"><img src="https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&w=1400&q=85" alt="A calm guest room at Hotel Bosaso" className="absolute inset-0 h-full w-full object-cover opacity-75" /><div className="absolute inset-0 bg-forest/35" /><div className="absolute bottom-12 left-10 right-10 text-white"><p className="eyebrow text-[10px] text-white/70">Settle in</p><p className="font-display mt-3 max-w-md text-4xl leading-tight">Your place at the table is waiting.</p></div></div><div className="flex items-center justify-center px-5 py-14 md:px-12"><div className="w-full max-w-md"><Link to="/" className="inline-flex items-center gap-2 text-xs font-semibold text-ink/50 hover:text-forest"><ArrowLeft size={14} /> Back to the house</Link><span className="mt-10 grid h-12 w-12 place-items-center rounded-full bg-mist text-forest"><KeyRound size={20} /></span><p className="eyebrow mt-7 text-[10px] text-citrus">Welcome back</p><h1 className="font-display mt-2 text-4xl">Come on in.</h1><p className="mt-3 text-sm text-ink/55">Sign in to your Hotel Bosaso account.</p>
    <form onSubmit={submit} className="mt-8 space-y-5">{error && <p role="alert" className="rounded-[4px] bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}<label className="field-label">Email address<input className="field-input" type="email" autoComplete="email" required value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></label><label className="field-label">Password<input className="field-input" type="password" autoComplete="current-password" required value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} /></label><button disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-full bg-forest px-5 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-ink disabled:opacity-60">{busy ? 'Signing in...' : <>Sign in <ArrowRight size={15} /></>}</button></form><p className="mt-7 text-center text-sm text-ink/55">New around here? <Link to="/signup" className="font-semibold text-forest hover:text-citrus">Create an account</Link></p></div></div></div>
}