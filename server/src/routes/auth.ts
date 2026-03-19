import { Router, Request, Response } from 'express'
import { config } from '../config'
import { authenticate, AuthRequest } from '../middleware/auth'

const router = Router()

// POST /api/auth/login — delegates to Supabase Auth, returns Supabase JWT
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
    const sbData = await sbRes.json() as { access_token: string; user: { id: string; email: string; user_metadata?: { username?: string; account_type?: string } } }
    return res.json({ token: sbData.access_token, user: { id: sbData.user.id, email: sbData.user.email, username: sbData.user.user_metadata?.username ?? sbData.user.email.split('@')[0], balance: 100_000, accountType: sbData.user.user_metadata?.account_type ?? 'raw_spread' } })
  } catch (err) {
    console.error('[auth/login]', err)
    return res.status(500).json({ error: 'Server error' })
  }
})

// POST /api/auth/register — creates account in Supabase Auth
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { email, username, password, accountType } = req.body
    if (typeof email !== 'string' || typeof username !== 'string' || typeof password !== 'string' || !email || !username || !password) return res.status(400).json({ error: 'All fields are required' })
    if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' })
    const validAcctTypes = ['raw_spread', 'ctrader', 'standard']
    const acctType = validAcctTypes.includes(accountType) ? accountType : 'raw_spread'
    const sbRes = await fetch(`${config.supabaseUrl}/auth/v1/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: config.supabaseAnonKey },
      body: JSON.stringify({ email: email.toLowerCase().trim(), password, data: { username: username.trim(), balance: 100_000, account_type: acctType } }),
    })
    const sbData = await sbRes.json() as { access_token?: string; user?: { id: string; email: string; user_metadata?: { username?: string; account_type?: string } }; error_description?: string; msg?: string }
    if (!sbRes.ok) return res.status(400).json({ error: sbData.error_description ?? sbData.msg ?? 'Registration failed' })
    if (!sbData.access_token || !sbData.user) return res.status(400).json({ error: 'Check your email to confirm your account.' })
    return res.status(201).json({ token: sbData.access_token, user: { id: sbData.user.id, email: sbData.user.email, username: sbData.user.user_metadata?.username ?? username.trim(), balance: 100_000, accountType: acctType } })
  } catch (err) {
    console.error('[auth/register]', err)
    return res.status(500).json({ error: 'Server error' })
  }
})

// GET /api/auth/me
router.get('/me', authenticate, (req: AuthRequest, res: Response) => {
  const u = req.user!
  return res.json({ id: u.userId, email: u.email, username: (u as any).username ?? u.email?.split('@')[0] ?? 'Trader', balance: 100_000, accountType: (u as any).account_type ?? 'raw_spread' })
})

export default router
