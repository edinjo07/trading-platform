import { supabase } from '../lib/supabase'
import { User, AccountType, AccountMode, Currency } from '../types'

export interface AuthResponse {
  token: string
  user: User
}

function mapUser(sbUser: { id: string; email?: string; user_metadata?: Record<string, unknown> }): User {
  return {
    id: sbUser.id,
    email: sbUser.email ?? '',
    username: (sbUser.user_metadata?.username as string | undefined) ?? sbUser.email?.split('@')[0] ?? 'Trader',
    balance: (sbUser.user_metadata?.balance as number | undefined) ?? 100_000,
    accountType: (sbUser.user_metadata?.account_type as AccountType | undefined) ?? 'raw_spread',
    accountMode: (sbUser.user_metadata?.account_mode as AccountMode | undefined) ?? 'demo',
    currency: (sbUser.user_metadata?.currency as Currency | undefined) ?? 'USD',
  }
}

export async function login(email: string, password: string): Promise<AuthResponse> {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error || !data.session) throw new Error(error?.message ?? 'Login failed')
  return { token: data.session.access_token, user: mapUser(data.user) }
}

export async function register(email: string, username: string, password: string, accountType: AccountType = 'raw_spread', currency: Currency = 'USD'): Promise<AuthResponse> {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { username, balance: 100_000, account_type: accountType, account_mode: 'demo', currency } },
  })

  if (error) {
    if (error.status === 429 || error.message?.toLowerCase().includes('rate limit')) {
      throw new Error('Too many sign-up attempts. Please wait a few minutes and try again.')
    }
    throw new Error(error.message ?? 'Registration failed')
  }

  if (!data.user) throw new Error('Registration failed')

  if (!data.session) {
    throw new Error('Check your email to confirm your account before logging in.')
  }

  return { token: data.session.access_token, user: mapUser(data.user) }
}

export async function fetchMe(): Promise<User> {
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) throw new Error('Not authenticated')
  return mapUser(user)
}

export async function signOut(): Promise<void> {
  await supabase.auth.signOut()
}

