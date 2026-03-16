import { Router, Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { v4 as uuidv4 } from 'uuid'
import { config } from '../config'
import { authenticate, AuthRequest } from '../middleware/auth'

const router = Router()

// ── Supabase REST helpers (fetch only, no SDK) ────────────────────────────────
const SB_URL = config.supabaseUrl
const SB_KEY = config.supabaseServiceRoleKey || config.supabaseAnonKey

interface DbUser {
  id: string
  email: string
  username: string
  password_hash: string
  balance: number
  created_at: string
}

async function sbGetUserByEmail(email: string): Promise<DbUser | null> {
  try {
    const res = await fetch(
      `${SB_URL}/rest/v1/users?email=eq.${encodeURIComponent(email)}&limit=1`,
      { headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, Accept: 'application/json' } }
    )
    if (!res.ok) return null
    const rows = await res.json() as DbUser[]
    return rows[0] ?? null
  } catch { return null }
}

async function sbSaveUser(user: { id: string; email: string; username: string; passwordHash: string; balance: number; createdAt: string }): Promise<void> {
  try {
    await fetch(`${SB_URL}/rest/v1/users`, {
      method: 'POST',
      headers: {
        apikey: SB_KEY,
        Authorization: `Bearer ${SB_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates',
      },
      body: JSON.stringify({
        id: user.id,
        email: user.email,
        username: user.username,
        password_hash: user.passwordHash,
        balance: user.balance,
        created_at: user.createdAt,
      }),
    })
  } catch (e) { console.error('[auth] sbSaveUser:', e) }
}

async function sbAuthSignIn(email: string, password: string): Promise<{ id: string; email: string; created_at: string; user_metadata?: { username?: string } } | null> {
  try {
    const res = await fetch(`${SB_URL}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: config.supabaseAnonKey },
      body: JSON.stringify({ email, password }),
    })
    if (!res.ok) return null
    const data = await res.json() as { user?: { id: string; email: string; created_at: string; user_metadata?: { username?: string } } }
    return data.user ?? null
  } catch { return null }
}

function makeToken(userId: string, email: string, username: string, balance: number): string {
  return jwt.sign({ userId, email, username, balance }, config.jwtSecret, { expiresIn: 60 * 60 * 24 * 7 })
}

// ── POST /api/auth/register ───────────────────────────────────────────────────
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { email, username, password } = req.body
    if (!email || !username || !password) {
      return res.status(400).json({ error: 'All fields are required' })
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' })
    }
    const existing = await sbGetUserByEmail(email.toLowerCase().trim())
    if (existing) {
      return res.status(409).json({ error: 'Email already registered' })
    }
    const passwordHash = await bcrypt.hash(password, 12)
    const newUser = {
      id: uuidv4(),
      email: email.toLowerCase().trim(),
      username: username.trim(),
      passwordHash,
      balance: 100_000,
      createdAt: new Date().toISOString(),
    }
    await sbSaveUser(newUser)
    const token = makeToken(newUser.id, newUser.email, newUser.username, newUser.balance)
    return res.status(201).json({
      token,
      user: { id: newUser.id, email: newUser.email, username: newUser.username, balance: newUser.balance },
    })
  } catch (err) {
    console.error('[auth/register]', err)
    return res.status(500).json({ error: 'Server error' })
  }
})

// ── POST /api/auth/login ──────────────────────────────────────────────────────
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' })
    }
    const normalEmail = email.toLowerCase().trim()

    // 1. Try custom users table (fast path)
    const dbUser = await sbGetUserByEmail(normalEmail)
    if (dbUser) {
      const valid = await bcrypt.compare(password, dbUser.password_hash)
      if (!valid) return res.status(401).json({ error: 'Invalid credentials' })
      const token = makeToken(dbUser.id, dbUser.email, dbUser.username, dbUser.balance)
      return res.json({
        token,
        user: { id: dbUser.id, email: dbUser.email, username: dbUser.username, balance: dbUser.balance },
      })
    }

    // 2. Fallback: Supabase Auth (accounts created before custom auth was introduced)
    const sbUser = await sbAuthSignIn(normalEmail, password)
    if (sbUser) {
      const passwordHash = await bcrypt.hash(password, 12)
      const migrated = {
        id: sbUser.id,
        email: (sbUser.email ?? normalEmail).toLowerCase(),
        username: sbUser.user_metadata?.username ?? normalEmail.split('@')[0],
        passwordHash,
        balance: 100_000,
        createdAt: sbUser.created_at ?? new Date().toISOString(),
      }
      sbSaveUser(migrated).catch(e => console.error('[auth] migrate:', e))
      const token = makeToken(migrated.id, migrated.email, migrated.username, migrated.balance)
      return res.json({
        token,
        user: { id: migrated.id, email: migrated.email, username: migrated.username, balance: migrated.balance },
      })
    }

    return res.status(401).json({ error: 'Invalid credentials' })
  } catch (err) {
    console.error('[auth/login]', err)
    return res.status(500).json({ error: 'Server error' })
  }
})

// ── GET /api/auth/me ──────────────────────────────────────────────────────────
// JWT payload already has userId/email/username/balance — no DB call needed
router.get('/me', authenticate, (req: AuthRequest, res: Response) => {
  const p = req.user as { userId: string; email: string; username?: string; balance?: number }
  return res.json({ id: p.userId, email: p.email, username: p.username ?? p.email?.split('@')[0] ?? 'Trader', balance: p.balance ?? 100_000 })
})

export default router


// Authenticate via Supabase Auth REST API — no SDK import needed
async function supabaseSignIn(email: string, password: string): Promise<{ id: string; email: string; username?: string; createdAt: string } | null> {
  try {
    const res = await fetch(
      `${config.supabaseUrl}/auth/v1/token?grant_type=password`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': config.supabaseAnonKey,
        },
        body: JSON.stringify({ email, password }),
      }
    )
    if (!res.ok) return null
    const data = await res.json() as { user?: { id: string; email: string; created_at: string; user_metadata?: { username?: string } } }
    if (!data.user) return null
    return {
      id: data.user.id,
      email: data.user.email,
      username: data.user.user_metadata?.username,
      createdAt: data.user.created_at,
    }
  } catch {
    return null
  }
}

const router = Router()

// POST /api/auth/register
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { email, username, password } = req.body
    if (!email || !username || !password) {
      return res.status(400).json({ error: 'All fields are required' })
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' })
    }
    if (getUserByEmail(email)) {
      return res.status(409).json({ error: 'Email already registered' })
    }

    const passwordHash = await bcrypt.hash(password, 12)
    const user = {
      id: uuidv4(),
      email: email.toLowerCase().trim(),
      username: username.trim(),
      passwordHash,
      createdAt: new Date().toISOString(),
      balance: 100_000, // Paper trading starting balance
    }
    createUser(user)
    dbSaveUser(user).catch(e => console.error('[DB] saveUser:', e))

    const token = jwt.sign(
      { userId: user.id, email: user.email, username: user.username },
      config.jwtSecret,
      { expiresIn: 60 * 60 * 24 * 7 } // 7 days
    )

    return res.status(201).json({
      token,
      user: { id: user.id, email: user.email, username: user.username, balance: user.balance },
    })
  } catch (err) {
    return res.status(500).json({ error: 'Server error' })
  }
})

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' })
    }

    let user = getUserByEmail(email.toLowerCase().trim())
    let skipPasswordCheck = false

    if (!user) {
      // Cold-start: in-memory map may be empty — try loading from custom DB table first
      const dbUser = await dbGetUserByEmail(email.toLowerCase().trim())
      if (dbUser) {
        createUser(dbUser) // re-hydrate memory
        user = dbUser
      }
    }

    if (!user) {
      // Last resort: account may only exist in Supabase Auth (registered before custom auth)
      const sbUser = await supabaseSignIn(email.toLowerCase().trim(), password)
      if (sbUser) {
        // Migrate into custom auth system so future logins are instant
        const passwordHash = await bcrypt.hash(password, 12)
        const migrated = {
          id: sbUser.id,
          email: sbUser.email.toLowerCase(),
          username: sbUser.username ?? email.split('@')[0],
          passwordHash,
          createdAt: sbUser.createdAt ?? new Date().toISOString(),
          balance: 100_000,
        }
        createUser(migrated)
        dbSaveUser(migrated).catch(e => console.error('[DB] migrate user:', e))
        user = migrated
        skipPasswordCheck = true
      }
    }

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    if (!skipPasswordCheck) {
      const valid = await bcrypt.compare(password, user.passwordHash)
      if (!valid) {
        return res.status(401).json({ error: 'Invalid credentials' })
      }
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email, username: user.username },
      config.jwtSecret,
      { expiresIn: 60 * 60 * 24 * 7 } // 7 days
    )

    return res.json({
      token,
      user: { id: user.id, email: user.email, username: user.username, balance: user.balance },
    })
  } catch {
    return res.status(500).json({ error: 'Server error' })
  }
})

// GET /api/auth/me
router.get('/me', authenticate, async (req: AuthRequest, res: Response) => {
  let user = getUserById(req.user!.userId)
  if (!user) {
    // Cold-start: in-memory map empty — fetch directly from DB
    user = await dbGetUserById(req.user!.userId) ?? undefined
    if (user) createUser(user) // re-hydrate memory for subsequent requests
  }
  if (!user) return res.status(404).json({ error: 'User not found' })
  return res.json({ id: user.id, email: user.email, username: user.username, balance: user.balance })
})

export default router
