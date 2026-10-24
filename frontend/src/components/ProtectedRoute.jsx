import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/useAuth'

export default function ProtectedRoute({ children }) {
  const { isLoggedIn, isAdmin, isAuthLoading } = useAuth()
  const location = useLocation()
  if (isAuthLoading) return null
  if (!isLoggedIn) return <Navigate to="/signin" replace state={{ from: location }} />
  if (!isAdmin) return <Navigate to="/" replace />
  return children
}