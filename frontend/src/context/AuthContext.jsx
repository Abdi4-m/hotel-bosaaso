import { useEffect, useRef, useState } from 'react'
import AuthContext from './authStore'
import api from '../services/api'

function isValidUser(user) {
  return user &&
    typeof user.id === 'string' &&
    typeof user.name === 'string' &&
    typeof user.email === 'string' &&
    typeof user.role === 'string'
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('hotel_token'))
  const [user, setUser] = useState(null)
  const userIdRef = useRef(null)
  const [isAuthLoading, setIsAuthLoading] = useState(() => Boolean(localStorage.getItem('hotel_token')))

  function saveSession(session) {
    if (typeof session?.token !== 'string' || !session.token.trim() || !isValidUser(session.user)) {
      clearSession()
      throw new Error('The authentication response did not include a valid session')
    }
    localStorage.setItem('hotel_token', session.token)
    setToken(session.token)
    userIdRef.current = session.user.id
    setUser(session.user)
    setIsAuthLoading(false)
  }

  function clearSession() {
    if (userIdRef.current) localStorage.removeItem(`cart_${userIdRef.current}`)
    localStorage.removeItem('cart_guest')
    userIdRef.current = null
    setToken(null)
    setUser(null)
    setIsAuthLoading(false)
    localStorage.removeItem('hotel_token')
    localStorage.removeItem('hotel_user')
    window.dispatchEvent(new Event('hotel:clear-cart'))
  }

  useEffect(() => {
    localStorage.removeItem('hotel_user')
  }, [])

  useEffect(() => {
    let active = true
    if (!token) return () => { active = false }
    api.get('/auth/me')
      .then(({ data }) => {
        if (!isValidUser(data?.user)) {
          const error = new Error('The authentication response did not include a valid user')
          error.invalidSession = true
          throw error
        }
        if (active) {
          userIdRef.current = data.user.id
          setUser(data.user)
        }
      })
      .catch((error) => {
        if (!active) return
        if (error.invalidSession || [401, 403].includes(error.response?.status)) clearSession()
        else console.error('Unable to validate the saved authentication session', error)
      })
      .finally(() => {
        if (active) setIsAuthLoading(false)
      })

    return () => { active = false }
  }, [token])

  async function signIn(credentials) {
    const { data } = await api.post('/auth/login', credentials)
    saveSession(data)
    return data.user
  }

  async function signUp(details) {
    const { data } = await api.post('/auth/signup', details)
    saveSession(data)
    return data.user
  }

  async function signOut() {
    try { if (token) await api.post('/auth/logout') } finally { clearSession() }
  }

  useEffect(() => {
    window.addEventListener('hotel:unauthorized', clearSession)
    return () => window.removeEventListener('hotel:unauthorized', clearSession)
  }, [])

  const value = { token, user, isAdmin: user?.role === 'ADMIN', isLoggedIn: Boolean(token && user), isAuthLoading, signIn, signUp, signOut }
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
