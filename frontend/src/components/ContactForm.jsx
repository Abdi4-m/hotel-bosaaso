import { useState } from 'react'
import { ArrowUpRight, Check, LoaderCircle } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import api from '../services/api'

export default function ContactForm() {
  const [searchParams] = useSearchParams()
  const requestedItem = searchParams.get('item')
  const [form, setForm] = useState({ senderName: '', email: '', subject: searchParams.get('subject') || '', message: requestedItem ? `Hello, I would like to know more about ${requestedItem}.` : '' })
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState('')
  function update(event) { setForm({ ...form, [event.target.name]: event.target.value }) }

  async function submit(event) {
    event.preventDefault(); setStatus('sending'); setError('')
    try { await api.post('/messages', form); setStatus('sent'); setForm({ senderName: '', email: '', subject: '', message: '' }) }
    catch (requestError) { setError(requestError.response?.data?.error || 'Your message could not be sent. Please try again.'); setStatus('idle') }
  }

  if (status === 'sent') return <div className="rounded-[5px] bg-mist p-8 md:p-10"><span className="grid h-11 w-11 place-items-center rounded-full bg-forest text-white"><Check size={20} /></span><h2 className="font-display mt-6 text-3xl">A note well received.</h2><p className="mt-2 text-sm text-ink/60">Our team will be in touch soon.</p><button onClick={() => setStatus('idle')} className="mt-6 border-b border-forest/40 pb-1 text-sm font-semibold text-forest">Send another message</button></div>

  return <form onSubmit={submit} className="space-y-5">
    {error && <p role="alert" className="rounded-[4px] bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
    <div className="grid gap-5 sm:grid-cols-2"><label className="field-label">Your name<input className="field-input" name="senderName" value={form.senderName} onChange={update} autoComplete="name" required /></label><label className="field-label">Email address<input className="field-input" name="email" type="email" value={form.email} onChange={update} autoComplete="email" required /></label></div>
    <label className="field-label">Subject<input className="field-input" name="subject" value={form.subject} onChange={update} required /></label>
    <label className="field-label">Your message<textarea className="field-input min-h-36 resize-y" name="message" value={form.message} onChange={update} required /></label>
    <button disabled={status === 'sending'} className="inline-flex items-center gap-3 rounded-full bg-forest px-6 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-ink disabled:opacity-60">{status === 'sending' ? <><LoaderCircle size={16} className="animate-spin" /> Sending</> : <>Send your note <ArrowUpRight size={16} /></>}</button>
  </form>
}