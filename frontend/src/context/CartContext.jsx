import { useEffect, useState } from 'react'
import CartContext from './cartStore'
import { useAuth } from './useAuth'

const GUEST_CART_KEY = 'cart_guest'

function cartStorageKey(userId) {
  return userId ? `cart_${userId}` : GUEST_CART_KEY
}

function readCart(storageKey) {
  try {
    const stored = JSON.parse(localStorage.getItem(storageKey) || '[]')
    return Array.isArray(stored) ? stored.filter((item) => item?.id && Number.isInteger(item.quantity) && item.quantity > 0) : []
  } catch {
    return []
  }
}

export function CartProvider({ children }) {
  const { user } = useAuth()
  const storageKey = cartStorageKey(user?.id)
  return <UserCartProvider key={storageKey} storageKey={storageKey}>{children}</UserCartProvider>
}

function UserCartProvider({ children, storageKey }) {
  const [items, setItems] = useState(() => readCart(storageKey))
  useEffect(() => {
    function clearCartOnLogout() {
      setItems([])
    }

    window.addEventListener('hotel:clear-cart', clearCartOnLogout)
    return () => window.removeEventListener('hotel:clear-cart', clearCartOnLogout)
  }, [])

  function saveItems(nextItems) {
    setItems(nextItems)
    localStorage.setItem(storageKey, JSON.stringify(nextItems))
  }

  function addItem(food) {
    const existing = items.find((item) => item.id === food.id)
    const nextItems = existing
      ? items.map((item) => item.id === food.id ? { ...item, quantity: Math.min(99, item.quantity + 1) } : item)
      : [...items, { id: food.id, title: food.title, image: food.image, price: Number(food.price), quantity: 1 }]
    saveItems(nextItems)
  }

  function setQuantity(foodId, quantity) {
    if (!Number.isInteger(quantity) || quantity < 1) return
    saveItems(items.map((item) => item.id === foodId ? { ...item, quantity: Math.min(quantity, 99) } : item))
  }

  function removeItem(foodId) {
    saveItems(items.filter((item) => item.id !== foodId))
  }

  function clearCart() {
    saveItems([])
  }

  const value = {
    items,
    cartCount: items.reduce((count, item) => count + item.quantity, 0),
    subtotal: items.reduce((total, item) => total + item.price * item.quantity, 0),
    addItem,
    setQuantity,
    removeItem,
    clearCart,
  }

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}