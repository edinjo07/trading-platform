import { create } from 'zustand'
import { User } from '../types'
import { login, register, fetchMe } from '../api/auth'

interface AuthState {
  user: User | null
  token: string | null
  loading: boolean
  error: string | null
  login: (email: string, password: string) => Promise<void>
  register: (email: string, username: string, password: string) => Promise<void>
  logout: () => void
  loadUser: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: localStorage.getItem('token'),
  loading: false,
  error: null,

  login: async (email, password) => {
    set({ loading: true, error: null })
    try {
      const { token, user } = await login(email, password)
      localStorage.setItem('token', token)
      set({ token, user, loading: false })
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Login failed'
      set({ error: msg, loading: false })
      throw new Error(msg)
    }
  },

  register: async (email, username, password) => {
    set({ loading: true, error: null })
    try {
      const { token, user } = await register(email, username, password)
      localStorage.setItem('token', token)
      set({ token, user, loading: false })
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Registration failed'
      set({ error: msg, loading: false })
      throw new Error(msg)
    }
  },

  logout: () => {
    localStorage.removeItem('token')
    set({ user: null, token: null })
  },

  loadUser: async () => {
    const token = localStorage.getItem('token')
    if (!token) return
    set({ loading: true })
    try {
      const user = await fetchMe()
      set({ user, token, loading: false })
    } catch {
      localStorage.removeItem('token')
      set({ user: null, token: null, loading: false })
    }
  },
}))
