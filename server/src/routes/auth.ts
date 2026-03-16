import { Router, Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { v4 as uuidv4 } from 'uuid'
import { config } from '../config'
import { createUser, getUserByEmail, getUserById } from '../services/tradingEngine'
import { authenticate, AuthRequest } from '../middleware/auth'
import { dbSaveUser, dbGetUserById, dbGetUserByEmail } from '../services/dbSync'

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
