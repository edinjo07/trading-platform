import { Response, NextFunction } from 'express'
import { AuthRequest } from './auth'
import { config } from '../config'

/** Gate a route to superadmins only. Must run AFTER `authenticate`.
 *  A user is admin iff their verified email is on the ADMIN_EMAILS allowlist. */
export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction): void {
  const email = (req.user?.email || '').toLowerCase()
  if (email && config.adminEmails.includes(email)) { next(); return }
  res.status(403).json({ error: 'Admin access required' })
}
