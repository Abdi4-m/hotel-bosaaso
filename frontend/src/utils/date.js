import { useEffect, useState } from 'react'

export function getTodayDate() {
  return new Date().toISOString().slice(0, 10)
}

export function getMaxCheckOutDate(checkIn) {
  const [year, month, day] = checkIn.split('-').map(Number)
  const targetMonth = year * 12 + month - 1 + 6
  const targetYear = Math.floor(targetMonth / 12)
  const targetMonthIndex = targetMonth % 12
  const lastDay = new Date(Date.UTC(targetYear, targetMonthIndex + 1, 0)).getUTCDate()
  const padded = (value) => String(value).padStart(2, '0')

  return `${targetYear}-${padded(targetMonthIndex + 1)}-${padded(Math.min(day, lastDay))}`
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
