import { Router, Response } from 'express'
import { authenticate, AuthRequest } from '../middleware/auth'
import { closePosition, updatePositionSLTP } from '../services/orderEngine'
import { getPrice } from '../services/priceService'
import { supabase } from '../db'
import { AccountMode, PositionRow, PositionLive } from '../types'

const router = Router()

function getMode(req: AuthRequest): AccountMode {
  return req.headers['x-account-mode'] === 'real' ? 'real' : 'demo'
}

function getCurrency(req: AuthRequest): string {
  const c = req.headers['x-account-currency']
  return typeof c === 'string' && ['USD', 'EUR', 'GBP'].includes(c) ? c : 'USD'
}

function enrichPosition(pos: PositionRow): PositionLive {
  const currentPrice = getPrice(pos.symbol) ?? pos.avg_price
  const rawPnl = pos.side === 'long'
    ? (currentPrice - pos.avg_price) * pos.quantity
    : (pos.avg_price - currentPrice) * pos.quantity

  const unrealizedPnl    = parseFloat(rawPnl.toFixed(2))
  const unrealizedPnlPct = pos.margin > 0
    ? parseFloat(((unrealizedPnl / pos.margin) * 100).toFixed(2))
    : 0
  const notionalValue    = parseFloat((pos.quantity * currentPrice).toFixed(2))
  const liquidationPrice = pos.side === 'long'
    ? parseFloat((pos.avg_price * (1 - 0.9 / pos.leverage)).toFixed(8))
    : parseFloat((pos.avg_price * (1 + 0.9 / pos.leverage)).toFixed(8))

  return { ...pos, currentPrice, unrealizedPnl, unrealizedPnlPct, notionalValue, liquidationPrice }
}

// GET /api/positions — all open positions with live prices
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  const userId = req.user!.userId
  const mode   = getMode(req)

  const { data, error } = await supabase
    .from('positions')
    .select('*')
    .eq('user_id', userId)
    .eq('mode', mode)
    .order('opened_at', { ascending: false })

  if (error) return res.status(500).json({ error: error.message })
  return res.json((data ?? []).map(p => enrichPosition(p as PositionRow)))
})

// DELETE /api/positions/:id — close a position at market price
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  const userId   = req.user!.userId
  const mode     = getMode(req)
  const currency = getCurrency(req)
  const { id }   = req.params

  try {
    const result = await closePosition(id, userId, mode, currency)
    return res.json(result)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Close failed'
    return res.status(msg.includes('not found') ? 404 : 500).json({ error: msg })
  }
})

// PATCH /api/positions/:id — update stop-loss / take-profit
router.patch('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  const userId = req.user!.userId
  const mode   = getMode(req)
  const { id } = req.params

  const tp = req.body.takeProfit !== undefined
    ? (req.body.takeProfit === null ? null : parseFloat(String(req.body.takeProfit)))
    : undefined
  const sl = req.body.stopLoss !== undefined
    ? (req.body.stopLoss === null ? null : parseFloat(String(req.body.stopLoss)))
    : undefined

  if (tp === undefined && sl === undefined) {
    return res.status(400).json({ error: 'Provide takeProfit and/or stopLoss' })
  }

  try {
    const updated = await updatePositionSLTP(id, userId, mode, tp ?? null, sl ?? null)
    return res.json(enrichPosition(updated))
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Update failed'
    return res.status(msg.includes('not found') ? 404 : 500).json({ error: msg })
  }
})

export default router
