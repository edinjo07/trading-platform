import { Router, Request, Response } from 'express'
import { config } from '../config'
import { authenticate, AuthRequest } from '../middleware/auth'
import { dbEnsureUser } from '../services/dbSync'
import { AccountMode, Currency } from '../types'

const router = Router()

// POST /api/auth/login - delegates to Supabase Auth, returns Supabase JWT
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body
    if (typeof email !== 'string' || typeof password !== 'string' || !email || !password) {
      return res.status(400).json({ error: 'Email and password required' })
    }
    const sbRes = await fetch(`${config.supabaseUrl}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: config.supabaseAnonKey },
      body: JSON.stringify({ email: email.toLowerCase().trim(), password }),
    })
    if (!sbRes.ok) return res.status(401).json({ error: 'Invalid credentials' })
    const sbData = await sbRes.json() as { access_token: string; user: { id: string; email: string; user_metadata?: { username?: string; account_type?: string; account_mode?: string; currency?: string } } }
    const meta = sbData.user.user_metadata ?? {}
    return res.json({ token: sbData.access_token, user: { id: sbData.user.id, email: sbData.user.email, username: meta.username ?? sbData.user.email.split('@')[0], balance: 100_000, accountType: meta.account_type ?? 'raw_spread', accountMode: (meta.account_mode === 'real' ? 'real' : 'demo') as AccountMode, currency: (['USD', 'EUR', 'GBP'].includes(meta.currency ?? '') ? meta.currency : 'USD') as Currency } })
  } catch (err) {
    console.error('[auth/login]', err)
    return res.status(500).json({ error: 'Server error' })
  }
})

// POST /api/auth/register - creates account in Supabase Auth
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { email, username, password, accountType, currency } = req.body
    if (typeof email !== 'string' || typeof username !== 'string' || typeof password !== 'string' || !email || !username || !password) return res.status(400).json({ error: 'All fields are required' })
    if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' })
    const validAcctTypes = ['raw_spread', 'ctrader', 'standard']
    const acctType = validAcctTypes.includes(accountType) ? accountType : 'raw_spread'
    const validCurrencies: Currency[] = ['USD', 'EUR', 'GBP']
    const acctCurrency: Currency = validCurrencies.includes(currency) ? currency : 'USD'
    const sbRes = await fetch(`${config.supabaseUrl}/auth/v1/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: config.supabaseAnonKey },
      body: JSON.stringify({ email: email.toLowerCase().trim(), password, data: { username: username.trim(), balance: 100_000, account_type: acctType, account_mode: 'demo', currency: acctCurrency } }),
    })
    const sbData = await sbRes.json() as { access_token?: string; user?: { id: string; email: string; user_metadata?: { username?: string; account_type?: string; account_mode?: string; currency?: string } }; error_description?: string; msg?: string }
    if (!sbRes.ok) return res.status(400).json({ error: sbData.error_description ?? sbData.msg ?? 'Registration failed' })
    if (!sbData.access_token || !sbData.user) return res.status(400).json({ error: 'Check your email to confirm your account.' })
    // Ensure public.users row exists for FK constraints
    await dbEnsureUser(sbData.user.id, sbData.user.email ?? email.toLowerCase().trim(), username.trim(), 'demo', acctCurrency)
    return res.status(201).json({ token: sbData.access_token, user: { id: sbData.user.id, email: sbData.user.email, username: username.trim(), balance: 100_000, accountType: acctType, accountMode: 'demo', currency: acctCurrency } })
  } catch (err) {
    console.error('[auth/register]', err)
    return res.status(500).json({ error: 'Server error' })
  }
})

// GET /api/auth/me
router.get('/me', authenticate, (req: AuthRequest, res: Response) => {
  const u = req.user!
  const meta = (u as any).user_metadata ?? {}
  return res.json({
    id: u.userId,
    email: u.email,
    username: meta.username ?? u.email?.split('@')[0] ?? 'Trader',
    balance: 100_000,
    accountType: meta.account_type ?? 'raw_spread',
    accountMode: (meta.account_mode === 'real' ? 'real' : 'demo') as AccountMode,
    currency: (['USD', 'EUR', 'GBP'].includes(meta.currency) ? meta.currency : 'USD') as Currency,
  })
})

export default router
