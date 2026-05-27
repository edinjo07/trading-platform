import { Router, Response } from 'express'
import { authenticate, AuthRequest } from '../middleware/auth'
import { placeMarketOrder } from '../services/orderEngine'
import { addLimitOrder, cancelLimitOrder, getPendingLimitOrders } from '../services/limitOrderMonitor'
import { getPrice } from '../services/priceService'
import { supabase } from '../db'
import { AccountMode, OrderSide } from '../types'

const router = Router()

function getMode(req: AuthRequest): AccountMode {
  return req.headers['x-account-mode'] === 'real' ? 'real' : 'demo'
}

// POST /api/orders — place market or limit order
router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  const userId = req.user!.userId
  const mode   = getMode(req)

  const { symbol, side, quantity, leverage, takeProfit, stopLoss, type, limitPrice } = req.body

  if (!symbol || !side || quantity === undefined) {
    return res.status(400).json({ error: 'symbol, side, and quantity are required' })
  }

  const qty = parseFloat(String(quantity))
  const lev = leverage !== undefined ? parseInt(String(leverage), 10) : 1
  if (isNaN(qty) || qty <= 0) {
    return res.status(400).json({ error: 'quantity must be a positive number' })
  }

  const sym = String(symbol).toUpperCase().trim()

  // ── Limit order ────────────────────────────────────────────────────────────
  if (type === 'limit') {
    const lp = parseFloat(String(limitPrice))
    if (!limitPrice || isNaN(lp) || lp <= 0) {
      return res.status(400).json({ error: 'limitPrice is required and must be positive' })
    }
    const currentPrice = getPrice(sym)
    if (!currentPrice) {
      return res.status(400).json({ error: `No price available for ${sym}` })
    }

    // Determine trigger direction at the moment the order is placed
    const condition: 'lte' | 'gte' = lp < currentPrice ? 'lte' : 'gte'

    const id = addLimitOrder({
      userId,
      mode,
      symbol:     sym,
      side:       side as OrderSide,
      quantity:   qty,
      limitPrice: lp,
      condition,
      leverage:   isNaN(lev) ? 1 : lev,
      takeProfit: takeProfit != null ? parseFloat(String(takeProfit)) : undefined,
      stopLoss:   stopLoss   != null ? parseFloat(String(stopLoss))   : undefined,
    })

    return res.status(201).json({
      id, type: 'limit', status: 'pending',
      symbol: sym, side, quantity: qty, limitPrice: lp, condition,
    })
  }

  // ── Market order ───────────────────────────────────────────────────────────
  try {
    const order = await placeMarketOrder(userId, mode, {
      symbol:     sym,
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

// GET /api/orders/pending — list in-memory pending limit orders for this user
router.get('/pending', authenticate, async (req: AuthRequest, res: Response) => {
  const userId = req.user!.userId
  const mode   = getMode(req)
  return res.json(getPendingLimitOrders(userId, mode))
})

// DELETE /api/orders/:id — cancel a pending limit order
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  const userId = req.user!.userId
  const { id } = req.params
  const cancelled = cancelLimitOrder(id, userId)
  if (!cancelled) return res.status(404).json({ error: 'Limit order not found or does not belong to you' })
  return res.json({ cancelled: true })
})

// GET /api/orders — paginated order history
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
