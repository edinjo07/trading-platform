import { Router, Response } from 'express'
import { authenticate, AuthRequest } from '../middleware/auth'
import { supabase } from '../db'
import { AccountMode, TradeRow } from '../types'

const router = Router()

function getMode(req: AuthRequest): AccountMode {
  return req.headers['x-account-mode'] === 'real' ? 'real' : 'demo'
}

// GET /api/analytics/trades — closed trade history
router.get('/trades', authenticate, async (req: AuthRequest, res: Response) => {
  const userId = req.user!.userId
  const mode   = getMode(req)
  const limit  = Math.min(parseInt(String(req.query.limit ?? '50'), 10), 500)

  const { data, error } = await supabase
    .from('trades')
    .select('*')
    .eq('user_id', userId)
    .eq('mode', mode)
    .order('closed_at', { ascending: false })
    .limit(limit)

  if (error) return res.status(500).json({ error: error.message })
  return res.json(data ?? [])
})

// GET /api/analytics/stats — aggregated performance stats
router.get('/stats', authenticate, async (req: AuthRequest, res: Response) => {
  const userId = req.user!.userId
  const mode   = getMode(req)

  const { data, error } = await supabase
    .from('trades')
    .select('net_pnl, pnl, commission, symbol, opened_at, closed_at')
    .eq('user_id', userId)
    .eq('mode', mode)
    .order('closed_at', { ascending: true })

  if (error) return res.status(500).json({ error: error.message })

  const trades = (data ?? []) as Pick<TradeRow, 'net_pnl' | 'pnl' | 'commission' | 'symbol' | 'opened_at' | 'closed_at'>[]

  if (trades.length === 0) {
    return res.json({
      totalTrades: 0, winningTrades: 0, losingTrades: 0, winRate: 0,
      totalNetPnl: 0, totalCommission: 0,
      grossProfit: 0, grossLoss: 0,
      avgWin: 0, avgLoss: 0,
      bestTrade: 0, worstTrade: 0,
    })
  }

  const winners = trades.filter(t => t.net_pnl > 0)
  const losers  = trades.filter(t => t.net_pnl <= 0)

  const totalNetPnl     = trades.reduce((s, t) => s + t.net_pnl, 0)
  const totalCommission = trades.reduce((s, t) => s + t.commission, 0)
  const grossProfit     = winners.reduce((s, t) => s + t.net_pnl, 0)
  const grossLoss       = losers.reduce( (s, t) => s + t.net_pnl, 0)

  return res.json({
    totalTrades:     trades.length,
    winningTrades:   winners.length,
    losingTrades:    losers.length,
    winRate:         parseFloat((winners.length / trades.length).toFixed(4)),
    totalNetPnl:     parseFloat(totalNetPnl.toFixed(2)),
    totalCommission: parseFloat(totalCommission.toFixed(2)),
    grossProfit:     parseFloat(grossProfit.toFixed(2)),
    grossLoss:       parseFloat(grossLoss.toFixed(2)),
    avgWin:          winners.length ? parseFloat((grossProfit / winners.length).toFixed(2)) : 0,
    avgLoss:         losers.length  ? parseFloat((grossLoss  / losers.length).toFixed(2))  : 0,
    bestTrade:       parseFloat(Math.max(...trades.map(t => t.net_pnl)).toFixed(2)),
    worstTrade:      parseFloat(Math.min(...trades.map(t => t.net_pnl)).toFixed(2)),
  })
})

export default router
