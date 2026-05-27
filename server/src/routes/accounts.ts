import { Router, Response } from 'express'
import { authenticate, AuthRequest } from '../middleware/auth'
import { supabase } from '../db'

const router = Router()

// GET /api/accounts — list accounts that exist for this user
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  const userId = req.user!.userId

  const { data, error } = await supabase
    .from('accounts')
    .select('mode, currency, cash_balance')
    .eq('user_id', userId)
    .order('mode')
    .order('currency')

  if (error) return res.status(500).json({ error: error.message })
  return res.json(data ?? [])
})

export default router
