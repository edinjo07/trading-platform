import { Router, Response } from 'express'
import { authenticate, AuthRequest } from '../middleware/auth'
import { placeMarketOrder } from '../services/orderEngine'
import { supabase } from '../db'
import { AccountMode } from '../types'

const router = Router()

function getMode(req: AuthRequest): AccountMode {
  return req.headers['x-account-mode'] === 'real' ? 'real' : 'demo'
}

// POST /api/orders — place a market order
router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  const userId = req.user!.userId
  const mode   = getMode(req)

  const { symbol, side, quantity, leverage, takeProfit, stopLoss } = req.body

  if (!symbol || !side || quantity === undefined) {
    return res.status(400).json({ error: 'symbol, side, and quantity are required' })
  }

  const qty = parseFloat(String(quantity))
  const lev = leverage !== undefined ? parseInt(String(leverage), 10) : 1

  if (isNaN(qty) || qty <= 0) {
    return res.status(400).json({ error: 'quantity must be a positive number' })
  }

  try {
    const order = await placeMarketOrder(userId, mode, {
      symbol:     String(symbol).toUpperCase().trim(),
      side,
      quantity:   qty,
      leverage:   isNaN(lev) ? 1 : lev,
      takeProfit: takeProfit != null ? parseFloat(String(takeProfit)) : undefined,
      stopLoss:   stopLoss   != null ? parseFloat(String(stopLoss))   : undefined,
    })
    return res.status(201).json(order)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Order failed'
    const is4xx =
      msg.includes('Insufficient') ||
      msg.includes('Unknown symbol') ||
      msg.includes('must be') ||
      msg.includes('Side must')
    return res.status(is4xx ? 400 : 500).json({ error: msg })
  }
})

// GET /api/orders — paginated order log
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  const userId = req.user!.userId
  const mode   = getMode(req)
  const limit  = Math.min(parseInt(String(req.query.limit ?? '50'), 10), 200)

  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('user_id', userId)
    .eq('mode', mode)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) return res.status(500).json({ error: error.message })
  return res.json(data ?? [])
})

export default router
