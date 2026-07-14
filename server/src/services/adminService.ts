/** Superadmin data layer — everything runs with the Supabase service role
 *  (bypasses RLS) so an admin can see and act across every user. */
import { supabase } from '../db'
import { config } from '../config'

export interface AuthUser {
  id: string
  email: string
  username: string
  created_at: string
  last_sign_in_at: string | null
}

/** List all Supabase Auth users via the admin API (service role). */
export async function listAuthUsers(): Promise<AuthUser[]> {
  const out: AuthUser[] = []
  for (let page = 1; page <= 20; page++) {
    const res = await fetch(`${config.supabaseUrl}/auth/v1/admin/users?page=${page}&per_page=200`, {
      headers: { apikey: config.supabaseServiceRoleKey, Authorization: `Bearer ${config.supabaseServiceRoleKey}` },
    })
    if (!res.ok) break
    const body = await res.json() as { users?: Array<Record<string, any>> }
    const users = body.users ?? []
    for (const u of users) {
      out.push({
        id: u.id,
        email: u.email ?? '',
        username: u.user_metadata?.username ?? u.email?.split('@')[0] ?? 'Trader',
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at ?? null,
      })
    }
    if (users.length < 200) break
  }
  return out
}

/** Platform-wide overview stats. */
export async function getOverview() {
  const users = await listAuthUsers()
  const now = Date.now()
  const newUsers7d = users.filter(u => now - new Date(u.created_at).getTime() < 7 * 864e5).length

  const [{ data: accounts }, { data: positions }, { count: tradeCount }] = await Promise.all([
    supabase.from('accounts').select('mode, cash_balance'),
    supabase.from('positions').select('margin'),
    supabase.from('trades').select('id', { count: 'exact', head: true }),
  ])

  const realBalance = (accounts ?? []).filter(a => a.mode === 'real').reduce((s, a) => s + Number(a.cash_balance || 0), 0)
  const demoBalance = (accounts ?? []).filter(a => a.mode === 'demo').reduce((s, a) => s + Number(a.cash_balance || 0), 0)
  const exposure    = (positions ?? []).reduce((s, p) => s + Number(p.margin || 0), 0)

  // KYC + transactions may not exist yet (migrations) — stay graceful.
  let kycPending = 0, kycVerified = 0, pendingWithdrawals = 0, pendingWithdrawAmount = 0
  try {
    const { data: kyc } = await supabase.from('kyc_submissions').select('status')
    kycPending  = (kyc ?? []).filter(k => k.status === 'pending').length
    kycVerified = (kyc ?? []).filter(k => k.status === 'verified').length
  } catch { /* table missing */ }
  try {
    const { data: tx } = await supabase.from('transactions').select('type, amount, status').eq('status', 'pending').eq('type', 'withdrawal')
    pendingWithdrawals = (tx ?? []).length
    pendingWithdrawAmount = (tx ?? []).reduce((s, t) => s + Number(t.amount || 0), 0)
  } catch { /* table missing */ }

  return {
    users: users.length,
    newUsers7d,
    realBalance,
    demoBalance,
    openPositions: (positions ?? []).length,
    exposure,
    trades: tradeCount ?? 0,
    kycPending,
    kycVerified,
    pendingWithdrawals,
    pendingWithdrawAmount,
  }
}

/** Users list joined with their account balances. */
export async function getUsersWithAccounts() {
  const users = await listAuthUsers()
  const { data: accounts } = await supabase.from('accounts').select('user_id, mode, cash_balance')
  const byUser = new Map<string, { real: number | null; demo: number | null }>()
  for (const a of accounts ?? []) {
    const e = byUser.get(a.user_id) ?? { real: null, demo: null }
    if (a.mode === 'real') e.real = Number(a.cash_balance)
    else e.demo = Number(a.cash_balance)
    byUser.set(a.user_id, e)
  }
  return users.map(u => ({ ...u, ...(byUser.get(u.id) ?? { real: null, demo: null }) }))
}
