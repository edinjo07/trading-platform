import { create } from 'zustand'
import { User } from '../types'
import { login, register, signOut, fetchMe } from '../api/auth'

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

export const useAuthStore = create<AuthState>((set) => {
  return {
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
        const msg = err instanceof Error ? err.message : 'Login failed'
        set({ error: msg, loading: false })
        throw new Error(msg)
      }
    },

    register: async (email, username, password) => {
      set({ loading: true, error: null })
      try {
        const { token, user } = await register(email, username, password)
        if (token) localStorage.setItem('token', token)
        set({ token: token || null, user, loading: false })
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Registration failed'
        set({ error: msg, loading: false })
        throw new Error(msg)
      }
    },

    logout: () => {
      signOut().catch(() => {})
      localStorage.removeItem('token')
      set({ user: null, token: null })
    },

    // loadUser: validate stored token against the server — never wipes auth on network errors
    loadUser: async () => {
      const storedToken = localStorage.getItem('token')
      if (!storedToken) {
        set({ loading: false })
        return
      }
      set({ loading: true })
      try {
        const user = await fetchMe()
        set({ user, loading: false })
      } catch (err: unknown) {
        const status = (err as { response?: { status?: number } })?.response?.status
        if (status === 401) {
          // Token is expired / invalid — clear it
          localStorage.removeItem('token')
          set({ user: null, token: null, loading: false })
        } else {
          // Network/server error — do NOT wipe auth, just stop loading
          set({ loading: false })
        }
      }
    },
  }
})
