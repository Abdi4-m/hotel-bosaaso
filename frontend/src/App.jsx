import { useEffect } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import Footer from './components/Footer'
import LoginRequiredRoute from './components/LoginRequiredRoute'
import Navbar from './components/Navbar'
import ProtectedRoute from './components/ProtectedRoute'
import { AuthProvider } from './context/AuthContext'
import { CartProvider } from './context/CartContext'
import { ToastProvider } from './context/ToastContext'
import { useAuth } from './context/useAuth'
import api from './services/api'
import AdminDashboard from './pages/AdminDashboard'
import Account from './pages/Account'
import Contact from './pages/Contact'
import Cart from './pages/Cart'
import Checkout from './pages/Checkout'
import Home from './pages/Home'
import Menu from './pages/Menu'
import Rooms from './pages/Rooms'
import SignIn from './pages/SignIn'
import SignUp from './pages/SignUp'

const trackedPagePaths = new Set(['/', '/menu', '/rooms', '/cart', '/checkout', '/account', '/contact'])

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <CartProvider>
            <PageViewTracker />
            <div className="flex min-h-screen flex-col">
              <Navbar />
              <main className="flex-1">
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/menu" element={<Menu />} />
                  <Route path="/rooms" element={<Rooms />} />
                  <Route path="/cart" element={<Cart />} />
                  <Route path="/checkout" element={<LoginRequiredRoute><Checkout /></LoginRequiredRoute>} />
                  <Route path="/account" element={<LoginRequiredRoute><Account /></LoginRequiredRoute>} />
                  <Route path="/contact" element={<Contact />} />
                  <Route path="/signup" element={<SignUp />} />
                  <Route path="/signin" element={<SignIn />} />
                  <Route path="/admin" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </main>
              <Footer />
            </div>
          </CartProvider>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}

function PageViewTracker() {
  const { pathname } = useLocation()
  const { isAuthLoading, user } = useAuth()

  useEffect(() => {
    if (isAuthLoading || user?.role?.toUpperCase() === 'ADMIN' || !trackedPagePaths.has(pathname)) return
    api.post('/analytics/page-views', { pagePath: pathname }).catch((error) => {
      console.error('Page view could not be recorded', error)
    })
  }, [pathname, isAuthLoading, user])

  return null
}

export default App
