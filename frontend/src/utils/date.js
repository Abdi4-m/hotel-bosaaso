import { useEffect, useState } from 'react'

export function getTodayDate() {
  return new Date().toISOString().slice(0, 10)
}

export function useTodayDate() {
  const [today, setToday] = useState(getTodayDate)

  useEffect(() => {
    let timer
    const updateToday = () => {
      setToday(getTodayDate())
      const now = new Date()
      const nextMidnight = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1)
      timer = window.setTimeout(updateToday, nextMidnight - now.getTime() + 1)
    }

    updateToday()
    return () => window.clearTimeout(timer)
  }, [])

  return today
}
