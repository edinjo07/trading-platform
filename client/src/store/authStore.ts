import { create } from 'zustand'
import { User } from '../types'
import { login, register, fetchMe, signOut } from '../api/auth'
import { supabase } from '../lib/supabase'

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
  // Bootstrap from existing Supabase session on page load
  supabase.auth.getSession().then(({ data: { session } }) => {
    if (session) {
      fetchMe()
        .then(user => set({ user, token: session.access_token }))
        .catch(() => {})
    }
  })

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

    loadUser: async () => {
      set({ loading: true })
      try {
        const user = await fetchMe()
        const { data: { session } } = await supabase.auth.getSession()
        set({ user, token: session?.access_token ?? null, loading: false })
      } catch {
        localStorage.removeItem('token')
        set({ user: null, token: null, loading: false })
      }
    },
  }
})
