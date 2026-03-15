import { create } from 'zustand'
import { User } from '../types'
import { login, register, signOut } from '../api/auth'
import { supabase } from '../lib/supabase'

// Map a Supabase user object → our app User shape (no network call needed)
function mapSupabaseUser(sbUser: { id: string; email?: string; user_metadata?: Record<string, unknown> }): User {
  return {
    id: sbUser.id,
    email: sbUser.email ?? '',
    username: (sbUser.user_metadata?.username as string | undefined) ?? sbUser.email?.split('@')[0] ?? 'Trader',
    balance: (sbUser.user_metadata?.balance as number | undefined) ?? 100_000,
  }
}

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
  // Bootstrap: restore session from Supabase localStorage on page load (no network call)
  supabase.auth.getSession().then(({ data: { session } }) => {
    if (session?.user) {
      localStorage.setItem('token', session.access_token)
      set({ user: mapSupabaseUser(session.user), token: session.access_token })
    }
  })

  // Keep session in sync when Supabase refreshes the token automatically
  supabase.auth.onAuthStateChange((_event, session) => {
    if (session?.user) {
      localStorage.setItem('token', session.access_token)
      set({ user: mapSupabaseUser(session.user), token: session.access_token })
    } else if (_event === 'SIGNED_OUT') {
      localStorage.removeItem('token')
      set({ user: null, token: null })
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

    // loadUser: read session from local storage — never wipes auth on network errors
    loadUser: async () => {
      set({ loading: true })
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user) {
          localStorage.setItem('token', session.access_token)
          set({ user: mapSupabaseUser(session.user), token: session.access_token, loading: false })
        } else {
          // No active Supabase session — genuinely signed out
          localStorage.removeItem('token')
          set({ user: null, token: null, loading: false })
        }
      } catch {
        // Network/config error — do NOT wipe auth, just stop loading
        set({ loading: false })
      }
    },
  }
})
