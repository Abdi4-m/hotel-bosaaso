import { useCallback, useMemo, useState } from 'react'
import { CircleAlert, Check, X } from 'lucide-react'
import ToastContext from './toastStore'

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const dismiss = useCallback((id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id))
  }, [])

  const notify = useCallback((message, type = 'success') => {
    const id = `${Date.now()}-${Math.random()}`
    setToasts((current) => [...current, { id, message, type }])
    window.setTimeout(() => dismiss(id), 4000)
  }, [dismiss])

  const value = useMemo(() => ({
    success: (message) => notify(message, 'success'),
    error: (message) => notify(message, 'error'),
  }), [notify])

  return <ToastContext.Provider value={value}>
    {children}
    <div className="fixed right-4 top-20 z-[70] flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-2" aria-live="polite" aria-atomic="false">
      {toasts.map((toast) => <div key={toast.id} role={toast.type === 'error' ? 'alert' : 'status'} className={`flex items-start gap-3 rounded-[5px] px-4 py-3 text-sm shadow-soft ${toast.type === 'error' ? 'bg-red-50 text-red-800' : 'bg-forest text-white'}`}>
        {toast.type === 'error' ? <CircleAlert size={17} className="mt-0.5 shrink-0" /> : <Check size={17} className="mt-0.5 shrink-0" />}
        <span className="flex-1">{toast.message}</span>
        <button type="button" onClick={() => dismiss(toast.id)} aria-label="Dismiss notification" className="shrink-0 opacity-75 hover:opacity-100"><X size={16} /></button>
      </div>)}
    </div>
  </ToastContext.Provider>
}
