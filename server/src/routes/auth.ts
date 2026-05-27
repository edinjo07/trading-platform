import { Router, Request, Response } from 'express'
import { config } from '../config'
import { authenticate, AuthRequest } from '../middleware/auth'
import { AccountMode, Currency } from '../types'

const router = Router()

const VALID_CURRENCIES: Currency[] = ['USD', 'EUR', 'GBP']
const VALID_ACCOUNT_TYPES = ['raw_spread', 'ctrader', 'standard']

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body
    if (typeof email !== 'string' || typeof password !== 'string' || !email || !password) {
      return res.status(400).json({ error: 'Email and password required' })
    }

    const sbRes = await fetch(`${config.supabaseUrl}/auth/v1/token?grant_type=password`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', apikey: config.supabaseAnonKey },
      body:    JSON.stringify({ email: email.toLowerCase().trim(), password }),
    })
    if (!sbRes.ok) return res.status(401).json({ error: 'Invalid credentials' })

    const sbData = await sbRes.json() as {
      access_token: string
      user: { id: string; email: string; user_metadata?: Record<string, string> }
    }
    const meta = sbData.user.user_metadata ?? {}

    return res.json({
      token: sbData.access_token,
      user: {
        id:          sbData.user.id,
        email:       sbData.user.email,
        username:    meta.username ?? sbData.user.email.split('@')[0],
        accountMode: (meta.account_mode === 'real' ? 'real' : 'demo') as AccountMode,
        currency:    (VALID_CURRENCIES.includes(meta.currency as Currency) ? meta.currency : 'USD') as Currency,
      },
    })
  } catch (err) {
    console.error('[auth/login]', err)
    return res.status(500).json({ error: 'Server error' })
  }
})

// POST /api/auth/register
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { email, username, password, currency } = req.body
    if (
      typeof email    !== 'string' || !email    ||
      typeof username !== 'string' || !username ||
      typeof password !== 'string' || !password
    ) {
      return res.status(400).json({ error: 'email, username, and password are required' })
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' })
    }

    const acctCurrency: Currency = VALID_CURRENCIES.includes(currency) ? currency : 'USD'

    const sbRes = await fetch(`${config.supabaseUrl}/auth/v1/signup`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', apikey: config.supabaseAnonKey },
      body:    JSON.stringify({
        email:    email.toLowerCase().trim(),
        password,
        data: { username: username.trim(), account_mode: 'demo', currency: acctCurrency },
      }),
    })

    const sbData = await sbRes.json() as {
      access_token?: string
      user?: { id: string; email: string }
      error_description?: string
      msg?: string
    }

    if (!sbRes.ok) {
      return res.status(400).json({ error: sbData.error_description ?? sbData.msg ?? 'Registration failed' })
    }
    if (!sbData.access_token || !sbData.user) {
      return res.status(400).json({ error: 'Check your email to confirm your account.' })
    }

    // Account row is created lazily on first portfolio/order request — no DB call needed here.

    return res.status(201).json({
      token: sbData.access_token,
      user: {
        id:          sbData.user.id,
        email:       sbData.user.email,
        username:    username.trim(),
        accountMode: 'demo' as AccountMode,
        currency:    acctCurrency,
      },
    })
  } catch (err) {
    console.error('[auth/register]', err)
    return res.status(500).json({ error: 'Server error' })
  }
})

// GET /api/auth/me
router.get('/me', authenticate, (req: AuthRequest, res: Response) => {
  const u    = req.user!
  const meta = ((u as unknown) as { user_metadata?: Record<string, string> }).user_metadata ?? {}
  return res.json({
    id:          u.userId,
    email:       u.email,
    username:    meta.username ?? u.email?.split('@')[0] ?? 'Trader',
    accountMode: (meta.account_mode === 'real' ? 'real' : 'demo') as AccountMode,
    currency:    (VALID_CURRENCIES.includes(meta.currency as Currency) ? meta.currency : 'USD') as Currency,
  })
})

export default router
