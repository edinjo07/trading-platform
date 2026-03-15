import { Router, Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { v4 as uuidv4 } from 'uuid'
import { config } from '../config'
import { createUser, getUserByEmail, getUserById } from '../services/tradingEngine'
import { authenticate, AuthRequest } from '../middleware/auth'

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

    const user = getUserByEmail(email.toLowerCase().trim())
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    const valid = await bcrypt.compare(password, user.passwordHash)
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' })
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
router.get('/me', authenticate, (req: AuthRequest, res: Response) => {
  const user = getUserById(req.user!.userId)
  if (!user) return res.status(404).json({ error: 'User not found' })
  return res.json({ id: user.id, email: user.email, username: user.username, balance: user.balance })
})

export default router
