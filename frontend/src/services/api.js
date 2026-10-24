import axios from 'axios'

const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || '/api'
const normalizedBaseUrl = configuredBaseUrl.replace(/\/+$/, '')
const apiBaseUrl = /\/api$/i.test(normalizedBaseUrl) ? normalizedBaseUrl : `${normalizedBaseUrl}/api`

const api = axios.create({ baseURL: apiBaseUrl })

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('hotel_token')
  const isPublicAuthRequest = /^\/auth\/(?:login|signin|signup)(?:[/?#]|$)/i.test(config.url || '')
  if (token && !isPublicAuthRequest) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use((response) => response, (error) => {
  const authorization = error.config?.headers?.Authorization
  if (
    [401, 403].includes(error.response?.status) &&
    typeof authorization === 'string' &&
    authorization === `Bearer ${localStorage.getItem('hotel_token')}`
  ) {
    window.dispatchEvent(new Event('hotel:unauthorized'))
  }
  return Promise.reject(error)
})

export default api