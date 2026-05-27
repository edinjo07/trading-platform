import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: { 'Content-Type': 'application/json' },
})

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Attach account mode + currency headers so the server partitions by account
api.interceptors.request.use((config) => {
  const mode     = localStorage.getItem('account_mode')     ?? 'demo'
  const currency = localStorage.getItem('account_currency') ?? 'USD'
  config.headers['X-Account-Mode']     = mode
  config.headers['X-Account-Currency'] = currency
  return config
})

// Auto-logout on 401
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export default api
