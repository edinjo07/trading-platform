import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { config } from '../config'
import { JWTPayload } from '../types'

export interface AuthRequest extends Request {
  user?: JWTPayload
}

// In-process cache for Supabase token verifications to avoid hitting the API on every request
const sbCache = new Map<string, { payload: JWTPayload; exp: number }>()

async function verifySupabaseToken(token: string): Promise<JWTPayload | null> {
  const now = Date.now()
  const cached = sbCache.get(token)
  if (cached && cached.exp > now) return cached.payload

  try {
    const res = await fetch(`${config.supabaseUrl}/auth/v1/user`, {
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: config.supabaseAnonKey,
      },
    })
    if (!res.ok) return null
    const user = await res.json() as { id?: string; email?: string; user_metadata?: { username?: string } }
    if (!user?.id) return null
    const payload: JWTPayload = { userId: user.id, email: user.email ?? '' }
    // Cache for 4 minutes
    sbCache.set(token, { payload, exp: now + 4 * 60 * 1000 })
    return payload
  } catch {
    return null
  }
}

// Periodically prune expired cache entries
setInterval(() => {
  const now = Date.now()
  for (const [k, v] of sbCache) {
    if (v.exp <= now) sbCache.delete(k)
  }
}, 5 * 60 * 1000)

export async function authenticate(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'No token provided' })
    return
  }

  const token = authHeader.slice(7)

  // Fast path: verify as custom JWT (no network call)
  try {
    const decoded = jwt.verify(token, config.jwtSecret) as JWTPayload
    req.user = decoded
    next()
    return
  } catch {
    // Not a custom JWT — try Supabase
  }

  // Slow path: verify via Supabase Auth API (Supabase-issued tokens)
  const sbUser = await verifySupabaseToken(token)
  if (sbUser) {
    req.user = sbUser
    next()
    return
  }

  res.status(401).json({ error: 'Invalid or expired token' })
}

